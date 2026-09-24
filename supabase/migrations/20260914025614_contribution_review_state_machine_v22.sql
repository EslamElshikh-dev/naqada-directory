-- Contribution Review Operations V22 state-machine hardening.
-- The UI already limits actions; this migration enforces the same invariants
-- inside PostgreSQL so crafted admin requests cannot skip review states.

create or replace function public.review_naqada_contribution(
  p_id uuid,
  p_action text,
  p_notes text default null,
  p_message text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
  v_message text := nullif(trim(coalesce(p_message, '')), '');
  v_reviewer text := lower(coalesce((select auth.jwt()) ->> 'email', 'admin'));
  v_row public.directory_contributions%rowtype;
  v_current public.directory_contributions%rowtype;
begin
  if not public.is_directory_admin() then
    raise exception 'not authorized';
  end if;

  if p_action not in ('start_review','request_info','approve','reject','mark_published','reopen') then
    raise exception 'invalid review action';
  end if;

  if v_notes is not null and char_length(v_notes) > 2000 then
    raise exception 'review notes too long';
  end if;

  if v_message is not null and char_length(v_message) > 600 then
    raise exception 'review message too long';
  end if;

  select * into v_current
  from public.directory_contributions
  where id = p_id
  for update;

  if not found then
    raise exception 'contribution not found';
  end if;

  if p_action = 'start_review' and v_current.status <> 'pending' then
    raise exception 'invalid state transition';
  end if;

  if p_action in ('request_info','approve','reject')
     and v_current.status not in ('pending','reviewing','needs_info') then
    raise exception 'invalid state transition';
  end if;

  if p_action = 'mark_published' and v_current.status <> 'approved' then
    raise exception 'invalid state transition';
  end if;

  if p_action = 'reopen' and v_current.status not in ('rejected','published') then
    raise exception 'invalid state transition';
  end if;

  if p_action = 'request_info' and v_message is null then
    raise exception 'request-info message required';
  end if;

  if p_action = 'request_info'
     and v_current.submitted_by_user_id is null
     and v_current.contact is null then
    raise exception 'follow-up channel required';
  end if;

  if p_action = 'reject' and v_notes is null then
    raise exception 'rejection note required';
  end if;

  v_status := case p_action
    when 'start_review' then 'reviewing'
    when 'request_info' then 'needs_info'
    when 'approve' then 'approved'
    when 'reject' then 'rejected'
    when 'mark_published' then 'published'
    when 'reopen' then 'reviewing'
  end;

  update public.directory_contributions
  set
    status = v_status,
    review_notes = coalesce(v_notes, review_notes),
    review_message = case
      when p_action = 'request_info' then v_message
      when p_action in ('approve','reject','mark_published') then v_message
      else null
    end,
    reviewer = left(v_reviewer, 160),
    reviewed_at = now()
  where id = p_id
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'id', v_row.id,
    'status', v_row.status,
    'reviewedAt', v_row.reviewed_at,
    'reviewer', v_row.reviewer,
    'reviewMessage', v_row.review_message
  );
end;
$$;

revoke all on function public.review_naqada_contribution(uuid, text, text, text) from public, anon;
grant execute on function public.review_naqada_contribution(uuid, text, text, text) to authenticated;

notify pgrst, 'reload schema';
