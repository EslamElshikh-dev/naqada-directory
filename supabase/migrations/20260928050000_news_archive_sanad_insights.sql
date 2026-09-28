-- Preserve news previews after a publisher removes an item from its RSS feed.
create table if not exists public.naqada_news_archive (
  id text primary key check (length(id) between 3 and 90),
  url text not null unique check (length(url) <= 2048),
  payload jsonb not null,
  published_at timestamptz not null,
  captured_at timestamptz not null default now()
);
create index if not exists naqada_news_archive_published_idx on public.naqada_news_archive (published_at desc, id);
alter table public.naqada_news_archive enable row level security;
create policy "Public news archive" on public.naqada_news_archive for select to anon, authenticated using (true);
revoke all on public.naqada_news_archive from public, anon, authenticated;
grant select on public.naqada_news_archive to anon, authenticated;
grant select, insert, update on public.naqada_news_archive to service_role;

create table if not exists public.naqada_news_refresh_lock (
  name text primary key,
  claimed_at timestamptz not null default now()
);
revoke all on public.naqada_news_refresh_lock from public, anon, authenticated;
grant select, insert, update, delete on public.naqada_news_refresh_lock to service_role;

create or replace function public.claim_naqada_news_refresh()
returns boolean language plpgsql security definer set search_path = '' as $$
declare claimed boolean;
begin
  insert into public.naqada_news_refresh_lock (name, claimed_at) values ('feed', now())
  on conflict (name) do update set claimed_at = excluded.claimed_at
  where public.naqada_news_refresh_lock.claimed_at < now() - interval '25 minutes'
  returning true into claimed;
  return coalesce(claimed, false);
end;
$$;
revoke all on function public.claim_naqada_news_refresh() from public, anon, authenticated;
grant execute on function public.claim_naqada_news_refresh() to service_role;

-- Questions are stored for 90 days, with contact details masked before insertion.
create table if not exists public.naqada_sanad_interactions (
  id bigint generated always as identity primary key,
  visitor_id uuid not null,
  question text not null check (length(question) between 1 and 600),
  answer text not null check (length(answer) between 1 and 1500),
  outcome text not null check (outcome in ('answer', 'no_result')),
  card_titles jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists naqada_sanad_recent_idx on public.naqada_sanad_interactions (created_at desc);
create index if not exists naqada_sanad_visitor_idx on public.naqada_sanad_interactions (visitor_id, created_at desc);
alter table public.naqada_sanad_interactions enable row level security;
create policy "Admins read Sanad interactions" on public.naqada_sanad_interactions for select to authenticated using ((select public.is_directory_admin()));
revoke all on public.naqada_sanad_interactions from public, anon, authenticated;
grant select on public.naqada_sanad_interactions to authenticated;

create or replace function public.record_naqada_sanad_interaction(
  p_visitor_id uuid, p_question text, p_answer text, p_outcome text, p_card_titles jsonb default '[]'::jsonb
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_question text; v_answer text;
begin
  if p_visitor_id is null or length(btrim(p_question)) not between 1 and 600
    or length(btrim(p_answer)) not between 1 and 1500
    or p_outcome not in ('answer','no_result')
    or jsonb_typeof(p_card_titles) is distinct from 'array'
    or jsonb_array_length(p_card_titles) > 5 then return false; end if;
  -- Ignore direct API spam that does not belong to an active site visitor.
  if not exists (select 1 from public.analytics_visitors v where v.visitor_id = p_visitor_id and v.last_seen_at > now() - interval '1 day') then return false; end if;
  if (select count(*) from public.naqada_sanad_interactions where visitor_id = p_visitor_id and created_at > now() - interval '1 minute') >= 12 then return false; end if;
  v_question := regexp_replace(p_question, '[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}', '[بريد محجوب]', 'gi');
  v_answer := regexp_replace(p_answer, '[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}', '[بريد محجوب]', 'gi');
  v_question := regexp_replace(v_question, '(\+?\d[\d\s().\-]{8,}\d)', '[رقم محجوب]', 'g');
  v_answer := regexp_replace(v_answer, '(\+?\d[\d\s().\-]{8,}\d)', '[رقم محجوب]', 'g');
  insert into public.naqada_sanad_interactions (visitor_id, question, answer, outcome, card_titles)
    values (p_visitor_id, v_question, v_answer, p_outcome, p_card_titles);
  return true;
end;
$$;
revoke all on function public.record_naqada_sanad_interaction(uuid,text,text,text,jsonb) from public;
grant execute on function public.record_naqada_sanad_interaction(uuid,text,text,text,jsonb) to anon, authenticated;

create or replace function public.get_naqada_member_accounts()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_directory_admin() then raise exception 'not authorized'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'id', u.id, 'email', u.email, 'name', coalesce(nullif(p.full_name, ''),u.raw_user_meta_data->>'full_name',split_part(u.email,'@',1)),
    'createdAt', u.created_at, 'lastSeenAt', (select max(a.occurred_at) from public.analytics_pageviews a where a.user_id = u.id),
    'avatarUrl', p.avatar_url
  ) order by u.created_at desc), '[]'::jsonb)
  from auth.users u left join public.member_profiles p on p.id = u.id);
end;
$$;
revoke all on function public.get_naqada_member_accounts() from public, anon;
grant execute on function public.get_naqada_member_accounts() to authenticated;

create or replace function public.get_naqada_sanad_insights()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_today timestamptz := (date_trunc('day', now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo');
begin
  if not public.is_directory_admin() then raise exception 'not authorized'; end if;
  return jsonb_build_object(
    'today', (select count(*) from public.naqada_sanad_interactions where created_at >= v_today),
    'yesterday', (select count(*) from public.naqada_sanad_interactions where created_at >= v_today - interval '1 day' and created_at < v_today),
    'questions30d', (select count(*) from public.naqada_sanad_interactions where created_at >= now() - interval '30 days'),
    'visitors30d', (select count(distinct visitor_id) from public.naqada_sanad_interactions where created_at >= now() - interval '30 days'),
    'answered30d', (select count(*) from public.naqada_sanad_interactions where created_at >= now() - interval '30 days' and outcome = 'answer'),
    'noResult30d', (select count(*) from public.naqada_sanad_interactions where created_at >= now() - interval '30 days' and outcome = 'no_result'),
    'recent', (select coalesce(jsonb_agg(jsonb_build_object('question',i.question,'answer',i.answer,'outcome',i.outcome,'cards',i.card_titles,'at',i.created_at) order by i.created_at desc),'[]'::jsonb)
      from (select question, answer, outcome, card_titles, created_at from public.naqada_sanad_interactions order by created_at desc limit 30) i),
    'frequent', (select coalesce(jsonb_agg(jsonb_build_object('question',s.question,'count',s.hits) order by s.hits desc),'[]'::jsonb)
      from (select question, count(*) hits from public.naqada_sanad_interactions where created_at >= now() - interval '30 days'
        group by question order by hits desc limit 8) s)
  );
end;
$$;
revoke all on function public.get_naqada_sanad_insights() from public, anon;
grant execute on function public.get_naqada_sanad_insights() to authenticated;

create extension if not exists pg_cron;
select cron.schedule('naqada-sanad-retention', '25 3 * * *',
  $$delete from public.naqada_sanad_interactions where created_at < now() - interval '90 days'$$);
