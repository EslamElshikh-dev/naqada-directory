-- Reconcile the allowed statuses with the already-live review workflow.
-- No rows are modified and no additional role privileges are granted.
alter table public.directory_contributions
  drop constraint if exists directory_contributions_status_check;
alter table public.directory_contributions
  add constraint directory_contributions_status_check
  check (status in ('pending','reviewing','needs_info','approved','rejected','published'));
