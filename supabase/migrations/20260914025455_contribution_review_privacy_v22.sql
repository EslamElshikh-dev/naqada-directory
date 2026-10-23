-- Restored from the recorded Supabase migration; schema/security only.
revoke select on table public.directory_contributions from authenticated;

grant select (
  id,
  request_type,
  name,
  status,
  review_message,
  created_at,
  updated_at,
  submitted_by_user_id
) on table public.directory_contributions to authenticated;

notify pgrst, 'reload schema';
