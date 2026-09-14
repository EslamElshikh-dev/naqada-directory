-- Contribution Review Operations V22 privacy hardening.
-- RLS limits rows, while column privileges prevent contributors from reading
-- internal moderation fields such as review_notes, reviewer, contact, or source_url.

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
