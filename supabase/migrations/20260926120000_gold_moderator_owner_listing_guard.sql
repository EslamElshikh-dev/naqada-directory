-- Let the gold moderator publish through the guarded RPC, while keeping
-- owner edits in the pending queue and preserving the owner's admin workflow.
drop policy if exists "owners edit awaiting activity" on public.directory_owner_listings;
create policy "owners submit activity edits for review"
  on public.directory_owner_listings for update to authenticated
  using (owner_user_id = (select auth.uid()) and status in ('pending','published')
    and public.is_naqada_member_allowed((select auth.uid())))
  with check (owner_user_id = (select auth.uid()) and status = 'pending'
    and public.is_naqada_member_allowed((select auth.uid())));

create policy "admins moderate owner activities"
  on public.directory_owner_listings for update to authenticated
  using (public.is_directory_admin()) with check (public.is_directory_admin());

create or replace function public.guard_directory_owner_listing()
returns trigger language plpgsql set search_path = ''
as $$
declare photo_path text;
begin
  if tg_op = 'UPDATE' then
    if old.owner_user_id is distinct from new.owner_user_id or old.id is distinct from new.id then
      raise exception 'activity owner cannot be changed';
    end if;
    new.created_at := old.created_at;
  else
    new.created_at := now();
  end if;
  new.updated_at := now();

  if not coalesce(public.can_moderate_naqada(), false) then
    new.status := 'pending';
    new.reviewed_at := null;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.reviewed_at := now();
  end if;

  foreach photo_path in array new.photo_paths loop
    if photo_path !~ ('^' || new.owner_user_id::text || '/' || new.id::text || '/[0-9a-f-]{36}[.](jpg|png|webp)$') then
      raise exception 'invalid activity photo path';
    end if;
  end loop;
  return new;
end;
$$;

create or replace function public.can_read_naqada_owner_photo(p_path text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.directory_owner_listings l
    where l.id::text = split_part(p_path,'/',2)
      and ((l.owner_user_id = (select auth.uid())
        and public.is_naqada_member_allowed((select auth.uid())))
        or public.can_moderate_naqada())
  );
$$;
