create table if not exists public.project_work_log (
  id uuid primary key default gen_random_uuid(),
  project_key text not null default 'yugra',
  stage_key text not null,
  title text not null,
  status text not null check (status in ('planned','in_progress','partially_done','done','blocked','needs_review')),
  details text not null default '',
  next_action text not null default '',
  artifact_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_key, stage_key)
);

-- Keep project recovery notes private: no browser roles need access.
alter table public.project_work_log enable row level security;
revoke all on table public.project_work_log from anon, authenticated;
grant all on table public.project_work_log to service_role;
