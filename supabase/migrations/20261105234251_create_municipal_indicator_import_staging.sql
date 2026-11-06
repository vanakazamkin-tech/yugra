create table if not exists public.municipality_indicator_import_staging (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.data_sources(id) on update cascade,
  source_record_key text,
  raw_record jsonb not null,
  raw_municipality_name text,
  raw_oktmo text,
  raw_indicator_name text,
  raw_indicator_code text,
  raw_year integer,
  raw_period text,
  raw_value text,
  raw_unit text,
  mapped_municipality_id text,
  mapped_indicator_code text,
  normalized_value numeric,
  normalized_unit text,
  geographic_level text,
  review_status text not null default 'pending'
    check (review_status in ('pending','accepted','rejected','duplicate','needs_mapping')),
  validation_errors text[] not null default '{}',
  reviewed_by text,
  reviewed_at timestamptz,
  imported_indicator_id uuid references public.municipality_indicators(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, source_record_key)
);
create index if not exists municipality_indicator_import_staging_status_idx
 on public.municipality_indicator_import_staging (source_id, review_status);
create index if not exists municipality_indicator_import_staging_oktmo_idx
 on public.municipality_indicator_import_staging (raw_oktmo);
create index if not exists municipality_indicator_import_staging_municipality_idx
 on public.municipality_indicator_import_staging (mapped_municipality_id);
comment on table public.municipality_indicator_import_staging is
 'Raw and normalized external municipal-statistics rows awaiting validation; never included in analytics until explicitly imported into municipality_indicators as verified municipality-level observations.';
