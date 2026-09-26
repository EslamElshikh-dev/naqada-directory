-- A reversible, audited editorial role. The owner remains the sole directory admin.
create table public.directory_member_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','suspended','removed')),
  suspended_until timestamptz,
  reason text check (reason is null or char_length(reason) <= 500),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (status <> 'suspended' or suspended_until > updated_at)
);
alter table public.directory_member_state enable row level security;
revoke all on public.directory_member_state from public, anon, authenticated;

create table public.directory_moderator_audit (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (char_length(action) between 3 and 90),
  target_kind text not null check (char_length(target_kind) between 3 and 40),
  target_id text not null check (char_length(target_id) between 1 and 180),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index directory_moderator_audit_actor_time_idx on public.directory_moderator_audit(actor_id, created_at desc);
alter table public.directory_moderator_audit enable row level security;
revoke all on public.directory_moderator_audit from public, anon, authenticated;

create table public.directory_curated_content (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('business','news','article')),
  slug text not null check (char_length(slug) between 3 and 170),
  origin text not null check (origin in ('static','original')),
  status text not null default 'draft' check (status in ('draft','published','hidden')),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(kind,slug)
);
create index directory_curated_content_kind_status_idx on public.directory_curated_content(kind,status,updated_at desc);
alter table public.directory_curated_content enable row level security;
revoke all on public.directory_curated_content from public, anon, authenticated;

create or replace function public.is_naqada_member_allowed(p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$
  select p_user_id is not null and not exists (
    select 1 from public.directory_member_state s
    where s.user_id = p_user_id
      and (s.status = 'removed' or (s.status = 'suspended' and s.suspended_until > now()))
  );
$$;
revoke all on function public.is_naqada_member_allowed(uuid) from public, anon;
grant execute on function public.is_naqada_member_allowed(uuid) to authenticated;

create or replace function public.is_directory_gold_moderator()
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null
    and public.is_naqada_member_allowed((select auth.uid()))
    and exists (
      select 1 from public.directory_member_roles r
      where r.user_id = (select auth.uid()) and r.role_code = 'gold_moderator'
        and r.frame_code = 'gold' and r.active
    );
$$;
revoke all on function public.is_directory_gold_moderator() from public, anon;
grant execute on function public.is_directory_gold_moderator() to authenticated;

create or replace function public.can_moderate_naqada()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.is_directory_admin() or public.is_directory_gold_moderator(); $$;
revoke all on function public.can_moderate_naqada() from public, anon;
grant execute on function public.can_moderate_naqada() to authenticated;

-- Owners may edit an awaiting submission, but never publish it themselves.
drop policy if exists "members edit their activities and editors moderate" on public.directory_owner_listings;
create policy "owners edit awaiting activity"
  on public.directory_owner_listings for update to authenticated
  using (owner_user_id = (select auth.uid()) and status = 'pending'
    and public.is_naqada_member_allowed((select auth.uid())))
  with check (owner_user_id = (select auth.uid()) and status = 'pending'
    and public.is_naqada_member_allowed((select auth.uid())));
drop policy if exists "members add activities for themselves" on public.directory_owner_listings;
create policy "allowed members add pending activities"
  on public.directory_owner_listings for insert to authenticated
  with check (owner_user_id = (select auth.uid()) and status = 'pending'
    and public.is_naqada_member_allowed((select auth.uid())));

-- The previous Storage policies accidentally resolved name against the listing's
-- business name instead of the outer object path. Match explicit path arguments.
create or replace function public.is_published_naqada_photo(p_path text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.directory_owner_listings l
    where l.id::text = split_part(p_path,'/',2) and l.status='published'
      and p_path = any(l.photo_paths));
$$;
revoke all on function public.is_published_naqada_photo(text) from public;
grant execute on function public.is_published_naqada_photo(text) to anon, authenticated;

create or replace function public.can_read_naqada_owner_photo(p_path text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.directory_owner_listings l
    where l.id::text = split_part(p_path,'/',2)
      and (l.owner_user_id = (select auth.uid()) or public.can_moderate_naqada())
  );
$$;
revoke all on function public.can_read_naqada_owner_photo(text) from public, anon;
grant execute on function public.can_read_naqada_owner_photo(text) to authenticated;

create or replace function public.can_upload_naqada_owner_photo(p_path text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null
    and split_part(p_path,'/',1) = (select auth.uid())::text
    and public.is_naqada_member_allowed((select auth.uid()))
    and exists(select 1 from public.directory_owner_listings l
      where l.id::text = split_part(p_path,'/',2)
        and l.owner_user_id = (select auth.uid()) and l.status = 'pending');
$$;
revoke all on function public.can_upload_naqada_owner_photo(text) from public, anon;
grant execute on function public.can_upload_naqada_owner_photo(text) to authenticated;

drop policy if exists "owners and editors read activity photos" on storage.objects;
create policy "owners and editors read activity photos" on storage.objects
  for select to authenticated
  using (bucket_id='directory-owner-photos' and public.can_read_naqada_owner_photo(name));
drop policy if exists "owners upload their activity photos" on storage.objects;
create policy "owners upload their activity photos" on storage.objects
  for insert to authenticated
  with check (bucket_id='directory-owner-photos' and public.can_upload_naqada_owner_photo(name));
drop policy if exists "owners delete their activity photos" on storage.objects;
create policy "owners delete their activity photos" on storage.objects
  for delete to authenticated
  using (bucket_id='directory-owner-photos' and public.can_upload_naqada_owner_photo(name));
drop policy if exists "published activity photos are readable" on storage.objects;
create policy "published activity photos are readable" on storage.objects
  for select to anon, authenticated
  using (bucket_id='directory-owner-photos' and public.is_published_naqada_photo(name));

drop policy if exists "members publish own site review" on public.site_reviews;
create policy "allowed members publish own site review" on public.site_reviews
  for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'published'
    and public.is_naqada_member_allowed((select auth.uid())));
drop policy if exists "members update own site review" on public.site_reviews;
create policy "allowed members update own site review" on public.site_reviews
  for update to authenticated
  using ((select auth.uid()) = user_id and status = 'published'
    and public.is_naqada_member_allowed((select auth.uid())))
  with check ((select auth.uid()) = user_id and status = 'published'
    and public.is_naqada_member_allowed((select auth.uid())));
drop policy if exists "members delete own site review" on public.site_reviews;
create policy "allowed members delete own site review" on public.site_reviews
  for delete to authenticated
  using ((select auth.uid()) = user_id and status = 'published'
    and public.is_naqada_member_allowed((select auth.uid())));
drop policy if exists "members update own profile" on public.member_profiles;
create policy "allowed members update own profile" on public.member_profiles
  for update to authenticated
  using ((select auth.uid()) = id and public.is_naqada_member_allowed((select auth.uid())))
  with check ((select auth.uid()) = id and public.is_naqada_member_allowed((select auth.uid())));

-- Only public fields of published records, plus markers for hidden static records.
create or replace function public.get_public_naqada_content(p_kind text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_kind not in ('business','news','article') then return '[]'::jsonb; end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'kind', kind, 'slug', slug, 'origin', origin, 'status', status,
      'payload', case when status = 'published' then payload else '{}'::jsonb end,
      'updatedAt', updated_at
    ) order by updated_at desc), '[]'::jsonb)
    from public.directory_curated_content
    where kind = p_kind and status in ('published','hidden')
  );
end;
$$;
revoke all on function public.get_public_naqada_content(text) from public;
grant execute on function public.get_public_naqada_content(text) to anon, authenticated;

create or replace function public.get_naqada_editor_content(p_kind text default null)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.can_moderate_naqada() then raise exception 'not authorized'; end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'kind', kind, 'slug', slug, 'origin', origin, 'status', status,
      'payload', payload, 'createdBy', created_by, 'updatedBy', updated_by,
      'updatedAt', updated_at
    ) order by updated_at desc), '[]'::jsonb)
    from (select * from public.directory_curated_content
      where p_kind is null or kind = p_kind order by updated_at desc limit 150) records
  );
end;
$$;
revoke all on function public.get_naqada_editor_content(text) from public, anon;
grant execute on function public.get_naqada_editor_content(text) to authenticated;

create or replace function public.save_naqada_editor_content(
  p_kind text, p_slug text, p_origin text, p_status text, p_payload jsonb
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if not public.can_moderate_naqada() then raise exception 'not authorized'; end if;
  if p_kind not in ('business','news','article') or p_origin not in ('static','original')
    or p_status not in ('draft','published','hidden')
    or char_length(p_slug) not between 3 and 170
    or p_slug ~ '[/#?[:space:]]'
    or jsonb_typeof(p_payload) is distinct from 'object'
    or octet_length(p_payload::text) > 16000 then
    raise exception 'invalid content';
  end if;
  if p_status = 'published' and (
      char_length(trim(coalesce(p_payload->>'title',''))) < 3
      or char_length(trim(coalesce(p_payload->>'summary',''))) < 15
      or (p_kind in ('news','article') and p_origin = 'original'
        and char_length(trim(coalesce(p_payload->>'body',''))) < 40)
    ) then raise exception 'incomplete content'; end if;
  insert into public.directory_curated_content(kind,slug,origin,status,payload,created_by,updated_by)
  values(p_kind,p_slug,p_origin,p_status,p_payload,(select auth.uid()),(select auth.uid()))
  on conflict(kind,slug) do update set
    status = excluded.status, payload = excluded.payload, updated_by = excluded.updated_by,
    updated_at = now()
  where directory_curated_content.origin = excluded.origin
  returning id into v_id;
  if v_id is null then raise exception 'content origin mismatch'; end if;
  insert into public.directory_moderator_audit(actor_id,action,target_kind,target_id,detail)
  values((select auth.uid()),'content_' || p_status,p_kind,p_slug,
    jsonb_build_object('origin',p_origin));
  return v_id;
end;
$$;
revoke all on function public.save_naqada_editor_content(text,text,text,text,jsonb) from public, anon;
grant execute on function public.save_naqada_editor_content(text,text,text,text,jsonb) to authenticated;

create or replace function public.moderate_naqada_member(
  p_user_id uuid, p_action text, p_until timestamptz default null, p_reason text default null
) returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := (select auth.uid());
begin
  if not public.can_moderate_naqada() then raise exception 'not authorized'; end if;
  if p_action not in ('suspend','remove','restore') or p_user_id is null
    or p_user_id = v_actor or not exists(select 1 from auth.users where id = p_user_id)
    or exists(select 1 from auth.users u join public.directory_admins a
      on a.email = lower(u.email) and a.active where u.id = p_user_id)
    or (not public.is_directory_admin() and exists(select 1 from public.directory_member_roles r
      where r.user_id = p_user_id and r.role_code = 'gold_moderator' and r.active))
    or char_length(coalesce(p_reason,'')) > 500 then raise exception 'invalid member action'; end if;
  if p_action = 'suspend' and (p_until is null or p_until <= now()
    or p_until > now() + interval '365 days') then raise exception 'invalid suspension end'; end if;
  insert into public.directory_member_state(user_id,status,suspended_until,reason,updated_by)
  values(p_user_id, case p_action when 'suspend' then 'suspended'
    when 'remove' then 'removed' else 'active' end,
    case when p_action = 'suspend' then p_until end, nullif(trim(p_reason),''), v_actor)
  on conflict(user_id) do update set
    status = excluded.status, suspended_until = excluded.suspended_until,
    reason = excluded.reason, updated_by = excluded.updated_by, updated_at = now();
  if p_action = 'remove' then
    update public.site_reviews set status = 'hidden' where user_id = p_user_id;
  end if;
  insert into public.directory_moderator_audit(actor_id,action,target_kind,target_id,detail)
  values(v_actor,'member_' || p_action,'member',p_user_id::text,
    jsonb_build_object('until',p_until,'reason',left(coalesce(p_reason,''),500)));
  return true;
end;
$$;
revoke all on function public.moderate_naqada_member(uuid,text,timestamptz,text) from public, anon;
grant execute on function public.moderate_naqada_member(uuid,text,timestamptz,text) to authenticated;

create or replace function public.moderate_naqada_submission(
  p_kind text, p_id uuid, p_status text, p_patch jsonb default '{}'::jsonb
) returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := (select auth.uid()); v_found uuid;
begin
  if not public.can_moderate_naqada() then raise exception 'not authorized'; end if;
  if p_kind not in ('business','contribution','review') or p_id is null
    or jsonb_typeof(p_patch) is distinct from 'object'
    or octet_length(p_patch::text) > 6000 then raise exception 'invalid submission'; end if;
  if p_kind = 'business' then
    if p_status not in ('pending','published','rejected') then raise exception 'invalid status'; end if;
    update public.directory_owner_listings set
      name = coalesce(nullif(trim(p_patch->>'name'),''), name),
      phone = coalesce(nullif(trim(p_patch->>'phone'),''), phone),
      hours = coalesce(nullif(trim(p_patch->>'hours'),''), hours),
      address = coalesce(nullif(trim(p_patch->>'address'),''), address),
      description = coalesce(nullif(trim(p_patch->>'description'),''), description),
      category = coalesce(nullif(trim(p_patch->>'category'),''), category),
      locality = coalesce(nullif(trim(p_patch->>'locality'),''), locality),
      status = p_status, reviewed_at = now(), updated_at = now()
    where id = p_id returning id into v_found;
  elsif p_kind = 'contribution' then
    if p_status not in ('reviewing','needs_info','approved','rejected') then raise exception 'invalid status'; end if;
    update public.directory_contributions set
      name = coalesce(nullif(trim(p_patch->>'name'),''), name),
      category = coalesce(nullif(trim(p_patch->>'category'),''), category),
      locality = coalesce(nullif(trim(p_patch->>'locality'),''), locality),
      details = coalesce(nullif(trim(p_patch->>'details'),''), details),
      status = p_status, review_notes = left(coalesce(p_patch->>'notes',''),2000),
      reviewer = left(coalesce((select full_name from public.member_profiles where id = v_actor),'مشرف الدليل'),160),
      reviewed_at = now(), updated_at = now()
    where id = p_id returning id into v_found;
  else
    if p_status not in ('published','hidden') then raise exception 'invalid status'; end if;
    update public.site_reviews set status = p_status, updated_at = now()
    where id = p_id returning id into v_found;
  end if;
  if v_found is null then raise exception 'submission not found'; end if;
  insert into public.directory_moderator_audit(actor_id,action,target_kind,target_id,detail)
  values(v_actor,'submission_' || p_status,p_kind,p_id::text,
    jsonb_build_object('edited',p_patch <> '{}'::jsonb));
  return true;
end;
$$;
revoke all on function public.moderate_naqada_submission(text,uuid,text,jsonb) from public, anon;
grant execute on function public.moderate_naqada_submission(text,uuid,text,jsonb) to authenticated;

create or replace function public.get_naqada_moderator_dashboard(p_search text default '')
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_actor uuid := (select auth.uid()); v_start timestamptz := now() - interval '30 days';
begin
  if not public.can_moderate_naqada() then raise exception 'not authorized'; end if;
  return jsonb_build_object(
    'generatedAt', now(),
    'metrics', jsonb_build_object(
      'visitors30d',(select count(distinct visitor_id) from public.analytics_pageviews where occurred_at >= v_start),
      'newVisitors30d',(select count(*) from public.analytics_visitors where first_seen_at >= v_start),
      'pageViews30d',(select count(*) from public.analytics_pageviews where occurred_at >= v_start),
      'visitorsToday',(select count(distinct visitor_id) from public.analytics_pageviews
        where occurred_at >= (date_trunc('day',now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo')),
      'members',(select count(*) from public.member_profiles),
      'pendingBusinesses',(select count(*) from public.directory_owner_listings where status = 'pending'),
      'pendingContributions',(select count(*) from public.directory_contributions where status in ('pending','reviewing','needs_info')),
      'publishedContent',(select count(*) from public.directory_curated_content where status = 'published'),
      'myActions30d',(select count(*) from public.directory_moderator_audit where actor_id = v_actor and created_at >= v_start)
    ),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('date', day_value,
      'visitors',(select count(distinct visitor_id) from public.analytics_pageviews
        where occurred_at >= (day_value::timestamp at time zone 'Africa/Cairo')
        and occurred_at < ((day_value + 1)::timestamp at time zone 'Africa/Cairo')),
      'views',(select count(*) from public.analytics_pageviews
        where occurred_at >= (day_value::timestamp at time zone 'Africa/Cairo')
        and occurred_at < ((day_value + 1)::timestamp at time zone 'Africa/Cairo'))
    ) order by day_value),'[]'::jsonb)
      from (select (now() at time zone 'Africa/Cairo')::date - (13 - n) as day_value
        from generate_series(0,13) as t(n)) days),
    'topPages',(select coalesce(jsonb_agg(jsonb_build_object('path',path,'views',views)
      order by views desc),'[]'::jsonb) from (select path,count(*) as views
        from public.analytics_pageviews where occurred_at >= v_start
        group by path order by views desc limit 7) ranked),
    'missedSearches',(select coalesce(jsonb_agg(jsonb_build_object('query',query_text,'count',hits)
      order by hits desc),'[]'::jsonb) from (select query_text,count(*) as hits
        from public.directory_events where created_at >= v_start
          and event_type = 'zero_results' and query_text is not null
        group by query_text order by hits desc limit 7) ranked),
    'businesses',(select coalesce(jsonb_agg(to_jsonb(b) order by b.created_at desc),'[]'::jsonb)
      from (select id, owner_user_id, name, phone, hours, address, description, category,
        locality, photo_paths, status, created_at, reviewed_at
        from public.directory_owner_listings order by created_at desc limit 40) b),
    'contributions',(select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc),'[]'::jsonb)
      from (select id, name, request_type, category, locality, details, status, created_at,
        review_notes from public.directory_contributions order by created_at desc limit 40) c),
    'reviews',(select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb)
      from (select id, author_name, rating, body, status, created_at
        from public.site_reviews order by created_at desc limit 25) r),
    'members',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',m.id,'email',m.email,'name',coalesce(p.full_name,split_part(m.email,'@',1)),
      'createdAt',m.created_at,'status',coalesce(s.status,'active'),
      'until',s.suspended_until,'role',r.role_label
    ) order by m.created_at desc),'[]'::jsonb)
      from (select * from auth.users
        where coalesce(p_search,'') = '' or email ilike '%' || left(p_search,80) || '%'
        order by created_at desc limit 50) m
      left join public.member_profiles p on p.id=m.id
      left join public.directory_member_state s on s.user_id=m.id
      left join public.directory_member_roles r on r.user_id=m.id and r.active),
    'activity',(select coalesce(jsonb_agg(jsonb_build_object(
      'action',a.action,'kind',a.target_kind,'target',a.target_id,'at',a.created_at,
      'actor',coalesce(p.full_name,split_part(u.email,'@',1))
    ) order by a.created_at desc),'[]'::jsonb)
      from (select * from public.directory_moderator_audit
        where actor_id=v_actor order by created_at desc limit 15) a
      left join auth.users u on u.id=a.actor_id
      left join public.member_profiles p on p.id=a.actor_id)
  );
end;
$$;
revoke all on function public.get_naqada_moderator_dashboard(text) from public, anon;
grant execute on function public.get_naqada_moderator_dashboard(text) to authenticated;

create or replace function public.get_naqada_moderator_owner_report()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_directory_admin() then raise exception 'not authorized'; end if;
  return jsonb_build_object(
    'moderator', (select jsonb_build_object('id',u.id,'name',p.full_name,
      'email',u.email,'active',r.active,'since',r.created_at,
      'status',coalesce(s.status,'active')) from public.directory_member_roles r
      join auth.users u on u.id=r.user_id
      left join public.member_profiles p on p.id=u.id
      left join public.directory_member_state s on s.user_id=u.id
      where r.role_code='gold_moderator' and r.active
      order by r.created_at desc limit 1),
    'actions30d',(select count(*) from public.directory_moderator_audit a
      join public.directory_member_roles r on r.user_id=a.actor_id
      where r.role_code='gold_moderator' and a.created_at >= now()-interval '30 days'),
    'actionsByType',(select coalesce(jsonb_agg(jsonb_build_object('action',action,'count',hits)
      order by hits desc),'[]'::jsonb) from (select action,count(*) as hits
        from public.directory_moderator_audit a
        join public.directory_member_roles r on r.user_id=a.actor_id
        where r.role_code='gold_moderator' and a.created_at >= now()-interval '30 days'
        group by action order by hits desc) x),
    'recent',(select coalesce(jsonb_agg(jsonb_build_object('action',a.action,
      'kind',a.target_kind,'target',a.target_id,'at',a.created_at,
      'actor',coalesce(p.full_name,u.email)) order by a.created_at desc),'[]'::jsonb)
      from (select a.* from public.directory_moderator_audit a
        join public.directory_member_roles r on r.user_id=a.actor_id
        where r.role_code='gold_moderator' order by a.created_at desc limit 15) a
      join auth.users u on u.id=a.actor_id
      left join public.member_profiles p on p.id=a.actor_id)
  );
end;
$$;
revoke all on function public.get_naqada_moderator_owner_report() from public, anon;
grant execute on function public.get_naqada_moderator_owner_report() to authenticated;
