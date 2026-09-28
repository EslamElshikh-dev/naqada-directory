create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
alter table public.naqada_news_refresh_lock enable row level security;
select cron.schedule('naqada-news-archive-half-hour', '*/30 * * * *', $cron$
  select net.http_post(
    url := 'https://ceyjfguoomdlrtsujskj.supabase.co/functions/v1/naqada-news',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_QsT7jYGw7sWx0v6Vbg2Vjw_-uFV8wMk"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 28000
  );
$cron$);
