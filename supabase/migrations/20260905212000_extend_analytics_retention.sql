-- Keep first-party page views for 180 days and remove inactive visitor identities after one year.

create extension if not exists pg_cron;

do $$
declare
  job record;
begin
  for job in select jobid from cron.job where jobname = 'naqada-data-retention'
  loop
    perform cron.unschedule(job.jobid);
  end loop;
end $$;

select cron.schedule(
  'naqada-data-retention',
  '15 3 * * *',
  $cron$
    delete from public.public_request_limits
    where bucket_start < now() - interval '2 days';

    update public.directory_contributions
    set contact = null
    where contact is not null
      and created_at < now() - interval '90 days';

    delete from public.directory_events
    where created_at < now() - interval '180 days';

    delete from public.analytics_pageviews
    where occurred_at < now() - interval '180 days';

    delete from public.analytics_visitors
    where last_seen_at < now() - interval '365 days';
  $cron$
);
