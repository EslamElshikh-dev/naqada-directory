-- Fresh installs must not rely on Supabase's former implicit service grants.
-- This explicit table allowlist matches the read-only managed catalog audit.
-- No application rows, browser grants, defaults, or RLS policies change.
-- Keep contributions SELECT/INSERT-only, events INSERT-only, and rate-limit
-- storage RPC-only; do not grant ALL TABLES or alter default privileges.
grant select, insert, update, delete on table
  public.analytics_pageviews,
  public.analytics_visitors,
  public.directory_admins,
  public.directory_curated_content,
  public.directory_member_roles,
  public.directory_member_state,
  public.directory_moderator_audit,
  public.directory_owner_listings,
  public.directory_ratings,
  public.directory_request_notifications,
  public.member_profiles,
  public.naqada_job_feed_state,
  public.naqada_jobs,
  public.naqada_news_archive,
  public.naqada_sanad_interactions,
  public.site_reviews
to service_role;
