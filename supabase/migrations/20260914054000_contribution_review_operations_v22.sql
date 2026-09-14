-- Contribution Review Operations V22
-- Adds an explicit needs-info state, a contributor-facing review message,
-- and admin-only RPCs for queue reads and moderation writes.

alter table public.directory_contributions
  add column if not exists review_message text
  check (review_message is null or char_length(review_message) <= 600);

alter table public.directory_contributions
  drop constraint if exists directory_contributions_status_check;

alter table public.directory_contributions
  add constraint directory_contributions_status_check
  check (status in ('pending','reviewing','needs_info','approved','rejected','published'));

create or replace function public.get_naqada_contribution_queue()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
begin
  if not public.is_directory_admin() then
    raise exception 'not authorized';
  end if;

  return jsonb_build_object(
    'generatedAt', v_now,
    'summary', jsonb_build_object(
      'pending', (select count(*) from public.directory_contributions where status = 'pending'),
      'reviewing', (select count(*) from public.directory_contributions where status = 'reviewing'),
      'needsInfo', (select count(*) from public.directory_contributions where status = 'needs_info'),
      'approved', (select count(*) from public.directory_contributions where status = 'approved'),
      'rejected', (select count(*) from public.directory_contributions where status = 'rejected'),
      'published', (select count(*) from public.directory_contributions where status = 'published'),
      'oldestOpenAt', (
        select min(created_at)
        from public.directory_contributions
        where status in ('pending','reviewing','needs_info')
      )
    ),
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', ranked.id,
        'createdAt', ranked.created_at,
        'updatedAt', ranked.updated_at,
        'requestType', ranked.request_type,
        'name', ranked.name,
        'category', ranked.category,
        'locality', ranked.locality,
        'listingSlug', ranked.listing_slug,
        'details', ranked.details,
        'sourceUrl', ranked.source_url,
        'contact', ranked.contact,
        'hasContact', ranked.contact is not null,
        'status', ranked.status,
        'reviewNotes', ranked.review_notes,
        'reviewMessage', ranked.review_message,
        'reviewer', ranked.reviewer,
        'reviewedAt', ranked.reviewed_at,
        'submittedVia', ranked.submitted_via,
        'submittedByUserId', ranked.submitted_by_user_id,
        'reviewPriority', ranked.review_priority,
        'ageDays', ranked.age_days
      ) order by ranked.is_open desc, ranked.review_priority desc, ranked.created_at asc), '[]'::jsonb)
      from (
        select
          contribution.*,
          (contribution.status in ('pending','reviewing','needs_info')) as is_open,
          (
            case
              when contribution.request_type = 'correction' and contribution.source_url is not null then 100
              when contribution.request_type = 'correction' then 90
              when contribution.request_type = 'missing' and contribution.source_url is not null then 80
              when contribution.request_type = 'missing' then 70
              when contribution.request_type = 'add' and contribution.source_url is not null then 60
              else 50
            end
            + least(20, floor(extract(epoch from (v_now - contribution.created_at)) / 86400)::int)
          ) as review_priority,
          greatest(0, floor(extract(epoch from (v_now - contribution.created_at)) / 86400)::int) as age_days
        from public.directory_contributions contribution
        where contribution.status in ('pending','reviewing','needs_info')
           or contribution.updated_at >= v_now - interval '30 days'
        order by is_open desc, review_priority desc, contribution.created_at asc
        limit 200
      ) ranked
    )
  );
end;
$$;

revoke all on function public.get_naqada_contribution_queue() from public, anon;
grant execute on function public.get_naqada_contribution_queue() to authenticated;

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

  if p_action = 'request_info' and v_message is null then
    raise exception 'request-info message required';
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
    review_notes = case when p_action = 'reopen' then coalesce(v_notes, review_notes) else v_notes end,
    review_message = case
      when p_action = 'request_info' then v_message
      when p_action in ('approve','reject','mark_published') then v_message
      else null
    end,
    reviewer = left(v_reviewer, 160),
    reviewed_at = now()
  where id = p_id
  returning * into v_row;

  if not found then
    raise exception 'contribution not found';
  end if;

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
