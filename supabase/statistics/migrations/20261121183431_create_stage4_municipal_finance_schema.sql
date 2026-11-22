create table if not exists public.municipal_program_execution (
  id uuid primary key default gen_random_uuid(),
  municipality_id text not null references public.municipalities(id) on delete cascade,
  source_id text not null references public.data_sources(id),
  program_code text not null,
  program_name text not null,
  report_date date not null,
  approved_budget_thousand numeric,
  revised_budget_thousand numeric,
  executed_budget_thousand numeric,
  execution_percent numeric generated always as (
    case when revised_budget_thousand > 0
      then round((executed_budget_thousand / revised_budget_thousand) * 100, 2)
      else null end
  ) stored,
  source_url text not null,
  source_published_at date,
  retrieved_at timestamptz not null default now(),
  verification_status text not null default 'needs_review'
    check (verification_status in ('verified','needs_review')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (municipality_id, source_id, program_code, report_date)
);

create index if not exists municipal_program_execution_report_date_idx
  on public.municipal_program_execution (report_date desc);
create index if not exists municipal_program_execution_source_id_idx
  on public.municipal_program_execution (source_id);
create index if not exists municipal_program_execution_year_idx
  on public.municipal_program_execution (municipality_id, report_date);

alter table public.municipal_program_execution enable row level security;
drop policy if exists "Public can read verified municipal program execution"
  on public.municipal_program_execution;
create policy "Public can read verified municipal program execution"
  on public.municipal_program_execution for select to anon, authenticated
  using (verification_status = 'verified');
grant select on public.municipal_program_execution to anon, authenticated;
revoke insert, update, delete on public.municipal_program_execution from anon, authenticated;
