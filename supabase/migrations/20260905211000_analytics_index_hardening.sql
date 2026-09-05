-- Cover the optional authenticated-user relation used by the admin visitor report.

create index if not exists analytics_pageviews_user_occurred_idx
  on public.analytics_pageviews (user_id, occurred_at desc)
  where user_id is not null;
