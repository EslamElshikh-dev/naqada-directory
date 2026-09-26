-- Use the account's photo only while its profile has no chosen avatar.
update public.member_profiles p set avatar_url = u.raw_user_meta_data->>'avatar_url'
from auth.users u where p.id=u.id and lower(u.email)='battarefaey2005@gmail.com'
  and p.avatar_url is null and (u.raw_user_meta_data->>'avatar_url') like 'https://lh3.googleusercontent.com/%';

create or replace function public.get_naqada_moderator_dashboard(p_search text default '')
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_actor uuid := (select auth.uid()); v_start timestamptz := now() - interval '30 days';
begin
  if not public.can_moderate_naqada() then raise exception 'not authorized'; end if;
  return jsonb_build_object(
    'generatedAt', now(),
    'viewer', (select jsonb_build_object('name',coalesce(p.full_name,u.raw_user_meta_data->>'full_name',split_part(u.email,'@',1)),
      'avatarUrl',coalesce(p.avatar_url,u.raw_user_meta_data->>'avatar_url',u.raw_user_meta_data->>'picture'))
      from auth.users u left join public.member_profiles p on p.id=u.id where u.id=v_actor),
    'metrics', jsonb_build_object(
      'visitors30d',(select count(*) from public.analytics_visitors where last_seen_at >= v_start),
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


create or replace function public.get_naqada_visitor_analytics()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_start_30 timestamptz := now() - interval '30 days';
  v_start_60 timestamptz := now() - interval '60 days';
begin
  if not public.is_directory_admin() then
    raise exception 'not authorized';
  end if;

  return jsonb_build_object(
    'generatedAt', v_now,
    'totals', jsonb_build_object(
      'lifetimeVisitors', (select count(*) from public.analytics_visitors),
      'visitorsToday', (select count(distinct visitor_id) from public.analytics_pageviews where occurred_at >= (date_trunc('day', v_now at time zone 'Africa/Cairo') at time zone 'Africa/Cairo')),
      'uniqueVisitors30d', (select count(*) from public.analytics_visitors where last_seen_at >= v_start_30),
      'newVisitors30d', (select count(*) from public.analytics_visitors where first_seen_at >= v_start_30),
      'returningVisitors30d', (select count(*) from public.analytics_visitors where first_seen_at < v_start_30 and last_seen_at >= v_start_30),
      'previousUniqueVisitors30d', (select count(distinct visitor_id) from public.analytics_pageviews where occurred_at >= v_start_60 and occurred_at < v_start_30),
      'pageViews30d', (select count(*) from public.analytics_pageviews where occurred_at >= v_start_30),
      'identifiedVisitors30d', (select count(distinct user_id) from public.analytics_pageviews where occurred_at >= v_start_30 and user_id is not null),
      'members30d', (select count(*) from public.member_profiles where created_at >= v_start_30),
      'members7d', (select count(*) from public.member_profiles where created_at >= v_now - interval '7 days')
    ),
    'dailySeries', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', to_char(day_value, 'YYYY-MM-DD'),
        'visitors', (select count(distinct visitor_id) from public.analytics_pageviews where occurred_at >= (day_value at time zone 'Africa/Cairo') and occurred_at < ((day_value + interval '1 day') at time zone 'Africa/Cairo')),
        'views', (select count(*) from public.analytics_pageviews where occurred_at >= (day_value at time zone 'Africa/Cairo') and occurred_at < ((day_value + interval '1 day') at time zone 'Africa/Cairo'))
      ) order by day_value), '[]'::jsonb)
      from generate_series(date_trunc('day', v_now at time zone 'Africa/Cairo') - interval '13 days', date_trunc('day', v_now at time zone 'Africa/Cairo'), interval '1 day') day_value
    ),
    'topPages', (
      select coalesce(jsonb_agg(jsonb_build_object('path', ranked.path, 'views', ranked.views, 'visitors', ranked.visitors) order by ranked.views desc), '[]'::jsonb)
      from (
        select path, count(*)::bigint as views, count(distinct visitor_id)::bigint as visitors
        from public.analytics_pageviews where occurred_at >= v_start_30
        group by path order by views desc limit 8
      ) ranked
    ),
    'sources', (
      select coalesce(jsonb_agg(jsonb_build_object('source', ranked.source, 'visitors', ranked.visitors) order by ranked.visitors desc), '[]'::jsonb)
      from (
        select coalesce(nullif(referrer_host, ''), 'direct') as source, count(distinct visitor_id)::bigint as visitors
        from public.analytics_pageviews where occurred_at >= v_start_30
        group by coalesce(nullif(referrer_host, ''), 'direct') order by visitors desc limit 6
      ) ranked
    ),
    'devices', (
      select coalesce(jsonb_agg(jsonb_build_object('device', ranked.device_class, 'visitors', ranked.visitors) order by ranked.visitors desc), '[]'::jsonb)
      from (
        select device_class, count(distinct visitor_id)::bigint as visitors
        from public.analytics_pageviews where occurred_at >= v_start_30
        group by device_class order by visitors desc
      ) ranked
    ),
    'events', (
      select coalesce(jsonb_agg(jsonb_build_object('event', ranked.event_type, 'count', ranked.event_count) order by ranked.event_count desc), '[]'::jsonb)
      from (
        select event_type, count(*)::bigint as event_count
        from public.directory_events where created_at >= v_start_30
        group by event_type order by event_count desc limit 8
      ) ranked
    ),
    'missedSearches', (
      select coalesce(jsonb_agg(jsonb_build_object('query', ranked.query_text, 'count', ranked.query_count) order by ranked.query_count desc), '[]'::jsonb)
      from (
        select query_text, count(*)::bigint as query_count
        from public.directory_events
        where created_at >= v_start_30 and event_type = 'zero_results' and query_text is not null
        group by query_text order by query_count desc limit 8
      ) ranked
    ),
    'identifiedVisitors', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', identified.id,
        'name', identified.full_name,
        'email', identified.email,
        'bio', identified.bio,
        'locality', identified.locality,
        'avatarUrl', identified.avatar_url,
        'lastSeenAt', identified.last_seen_at,
        'pageViews', identified.pageviews,
        'browsers', identified.browsers
      ) order by identified.last_seen_at desc), '[]'::jsonb)
      from (
        select
          member.id,
          coalesce(profile.full_name, nullif(member.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(member.email, ''), '@', 1)) as full_name,
          member.email,
          profile.bio,
          profile.locality,
          coalesce(profile.avatar_url, nullif(member.raw_user_meta_data ->> 'avatar_url', ''), nullif(member.raw_user_meta_data ->> 'picture', '')) as avatar_url,
          max(visitor.last_seen_at) as last_seen_at,
          sum(visitor.pageviews)::bigint as pageviews,
          count(visitor.visitor_id)::bigint as browsers
        from public.analytics_visitors visitor
        join auth.users member on member.id = visitor.user_id
        left join public.member_profiles profile on profile.id = member.id
        where visitor.last_seen_at >= v_start_30
        group by member.id, profile.full_name, member.raw_user_meta_data, member.email, profile.bio, profile.locality, profile.avatar_url
        order by last_seen_at desc
        limit 12
      ) identified
    )
  );
end;
$$;

revoke all on function public.get_naqada_visitor_analytics() from public, anon;
grant execute on function public.get_naqada_visitor_analytics() to authenticated;


create function public.get_public_site_reviews_with_avatars()
returns table(
  id uuid,
  rating smallint,
  body text,
  author_name text,
  author_bio text,
  avatar_url text,
  created_at timestamptz,
  updated_at timestamptz,
  is_own boolean,
  frame_code text,
  role_label text
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    review.id,
    review.rating,
    review.body,
    coalesce(profile.full_name, review.author_name) as author_name,
    profile.bio as author_bio,
    case when member_role.role_code = 'gold_moderator' and lower(member.email) = 'battarefaey2005@gmail.com'
      then coalesce(profile.avatar_url, nullif(member.raw_user_meta_data ->> 'avatar_url', ''), nullif(member.raw_user_meta_data ->> 'picture', ''))
      else null end as avatar_url,
    review.created_at,
    review.updated_at,
    coalesce((select auth.uid()) = review.user_id, false) as is_own,
    coalesce(
      member_role.frame_code,
      case
        when coalesce(contrib.contribution_count, 0) > 100 or coalesce(profile.created_at, review.created_at) <= now() - interval '1 year' then 'gold'
        when coalesce(contrib.contribution_count, 0) > 50 then 'silver'
        when coalesce(contrib.contribution_count, 0) > 10 then 'bronze'
        else 'gray'
      end
    ) as frame_code,
    coalesce(
      member_role.role_label,
      case
        when coalesce(contrib.contribution_count, 0) > 100 or coalesce(profile.created_at, review.created_at) <= now() - interval '1 year' then 'مساهم ذهبي'
        when coalesce(contrib.contribution_count, 0) > 50 then 'مساهم فضي'
        when coalesce(contrib.contribution_count, 0) > 10 then 'مساهم برونزي'
        else 'عضو جديد'
      end
    ) as role_label
  from public.site_reviews review
  left join public.member_profiles profile on profile.id = review.user_id
  left join auth.users member on member.id = review.user_id
  left join public.directory_member_roles member_role on member_role.user_id = review.user_id and member_role.active = true
  left join lateral (
    select count(*)::int as contribution_count
    from public.directory_contributions contribution
    where contribution.submitted_by_user_id = review.user_id
      and contribution.status <> 'rejected'
  ) contrib on true
  where review.status = 'published'
  order by review.created_at desc
  limit 100;
$function$;

revoke all on function public.get_public_site_reviews_with_avatars() from public;
grant execute on function public.get_public_site_reviews_with_avatars() to anon, authenticated;

-- The owner's report follows Aya's account alone, even when more moderators join.
create or replace function public.get_naqada_moderator_owner_report()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_aya uuid := (select id from auth.users where lower(email)='battarefaey2005@gmail.com' limit 1);
begin
  if not public.is_directory_admin() then raise exception 'not authorized'; end if;
  return jsonb_build_object(
    'generatedAt',now(),
    'moderator',(select jsonb_build_object('id',u.id,'name',coalesce(p.full_name,u.raw_user_meta_data->>'full_name'),
      'avatarUrl',coalesce(p.avatar_url,u.raw_user_meta_data->>'avatar_url',u.raw_user_meta_data->>'picture'),
      'email',u.email,'active',r.active,'since',r.created_at,
      'status',coalesce(s.status,'active')) from public.directory_member_roles r
      join auth.users u on u.id=r.user_id
      left join public.member_profiles p on p.id=u.id
      left join public.directory_member_state s on s.user_id=u.id
      where r.user_id=v_aya and r.role_code='gold_moderator' and r.active limit 1),
    'actions30d',(select count(*) from public.directory_moderator_audit a
      where a.actor_id=v_aya and a.created_at >= now()-interval '30 days'),
    'actionsByType',(select coalesce(jsonb_agg(jsonb_build_object('action',action,'count',hits)
      order by hits desc),'[]'::jsonb) from (select action,count(*) as hits
        from public.directory_moderator_audit a
        where a.actor_id=v_aya and a.created_at >= now()-interval '30 days'
        group by action order by hits desc) x),
    'recent',(select coalesce(jsonb_agg(jsonb_build_object('action',a.action,
      'kind',a.target_kind,'target',a.target_id,'at',a.created_at,
      'actor',coalesce(p.full_name,u.email)) order by a.created_at desc),'[]'::jsonb)
      from (select * from public.directory_moderator_audit
        where actor_id=v_aya order by created_at desc limit 15) a
      join auth.users u on u.id=a.actor_id
      left join public.member_profiles p on p.id=a.actor_id)
  );
end;
$$;
revoke all on function public.get_naqada_moderator_owner_report() from public, anon;
grant execute on function public.get_naqada_moderator_owner_report() to authenticated;

-- A small account-scoped feed for the header bell. Only active gold moderators can call it.
create or replace function public.get_naqada_gold_notifications()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.is_directory_gold_moderator() then
    raise exception 'not authorized';
  end if;
  return jsonb_build_object(
    'generatedAt',now(),
    'items',(select coalesce(jsonb_agg(n.notice order by n.occurred_at desc),'[]'::jsonb)
      from (
        select created_at as occurred_at, jsonb_build_object(
          'id','business:'||id::text,'href','/moderator/?tab=business#workspace',
          'label','نشاط ينتظر مراجعتك','title',name,
          'detail',coalesce(locality,'نقادة'),'occurredAt',created_at,'tone','gold') as notice
        from (select id,name,locality,created_at from public.directory_owner_listings
          where status='pending' order by created_at desc limit 5) businesses
        union all
        select created_at,jsonb_build_object(
          'id','contribution:'||id::text,'href','/moderator/?tab=business#workspace',
          'label','طلب إضافة أو تصحيح','title',name,
          'detail',coalesce(locality,'نقادة'),'occurredAt',created_at,'tone','gold')
        from (select id,name,locality,created_at from public.directory_contributions
          where status in ('pending','reviewing','needs_info') order by created_at desc limit 5) contributions
        union all
        select created_at,jsonb_build_object(
          'id','review:'||id::text,'href','/moderator/?tab=overview#workspace',
          'label','تقييم جديد بالدليل','title',coalesce(author_name,'عضو بالدليل'),
          'detail','تقييم الموقع','occurredAt',created_at,'tone','mint')
        from (select id,author_name,created_at from public.site_reviews
          where status='published' and created_at >= now()-interval '7 days'
          order by created_at desc limit 3) reviews
      ) n)
  );
end;
$$;
revoke all on function public.get_naqada_gold_notifications() from public, anon;
grant execute on function public.get_naqada_gold_notifications() to authenticated;

notify pgrst, 'reload schema';
