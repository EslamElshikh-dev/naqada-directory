-- Preserve existing Qena listings while marking new Luxor jobs explicitly.
alter table public.naqada_jobs
  add column if not exists governorate text not null default 'قنا'
  check (governorate in ('قنا', 'الأقصر'));

create index if not exists naqada_jobs_governorate_public_idx
  on public.naqada_jobs (governorate, published_at desc)
  where status = 'published';
