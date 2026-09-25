-- Supabase's scheduler works at this frequency even if Vercel is on Hobby.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

select cron.schedule(
  'naqada-job-sources-half-hour',
  '*/30 * * * *',
  $cron$
    select net.http_post(
      url := 'https://ceyjfguoomdlrtsujskj.supabase.co/functions/v1/naqada-jobs?action=refresh',
      headers := '{"Content-Type":"application/json","apikey":"sb_publishable_QsT7jYGw7sWx0v6Vbg2Vjw_-uFV8wMk"}'::jsonb,
      body := '{}'::jsonb,
      timeout_milliseconds := 12000
    );
  $cron$
);

-- Trigger the first scan now; scheduled runs continue every half hour.
select net.http_post(
  url := 'https://ceyjfguoomdlrtsujskj.supabase.co/functions/v1/naqada-jobs?action=refresh',
  headers := '{"Content-Type":"application/json","apikey":"sb_publishable_QsT7jYGw7sWx0v6Vbg2Vjw_-uFV8wMk"}'::jsonb,
  body := '{}'::jsonb,
  timeout_milliseconds := 12000
);
