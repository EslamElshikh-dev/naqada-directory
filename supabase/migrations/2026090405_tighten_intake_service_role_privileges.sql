-- Keep the Edge Function service role on the smallest table privileges it needs.
-- Rate limiting remains behind the SECURITY DEFINER RPC, so direct access to the
-- request-limit table is unnecessary.

revoke all on table public.directory_contributions from service_role;
revoke all on table public.directory_events from service_role;
revoke all on table public.public_request_limits from service_role;

grant select, insert on table public.directory_contributions to service_role;
grant insert on table public.directory_events to service_role;

grant execute on function public.consume_public_rate_limit(text,text,integer) to service_role;
