create table if not exists public.external_rating_catalog (
  rating_id text primary key,
  provider text not null default 'РИА Рейтинг',
  title text not null,
  category text not null,
  edition_year integer not null check (edition_year between 1900 and 2200),
  published_at date,
  reference_period text not null,
  geographic_level text not null check (geographic_level in ('region','city','municipality','mixed')),
  geography_scope text not null default 'Российская Федерация',
  description text,
  methodology_summary text,
  source_id text references public.data_sources(id) on update cascade on delete set null,
  source_url text not null,
  dataset_url text,
  coverage_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.external_rating_results (
  id uuid primary key default gen_random_uuid(),
  rating_id text not null references public.external_rating_catalog(rating_id) on update cascade on delete cascade,
  geographic_level text not null check (geographic_level in ('region','city','municipality','other')),
  geography_name text not null,
  region_name text,
  national_rank integer check (national_rank is null or national_rank > 0),
  rating_score numeric,
  previous_year_rank integer check (previous_year_rank is null or previous_year_rank > 0),
  previous_year_score numeric,
  metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(metrics) = 'object'),
  reference_year integer check (reference_year is null or reference_year between 1900 and 2200),
  source_url text,
  verification_status text not null default 'verified' check (verification_status in ('verified','needs_review')),
  notes text,
  retrieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (rating_id, geographic_level, geography_name)
);

create index if not exists external_rating_results_rating_rank_idx
  on public.external_rating_results (rating_id, national_rank);

create index if not exists external_rating_results_geo_idx
  on public.external_rating_results (geographic_level, geography_name);

create index if not exists external_rating_results_metrics_gin_idx
  on public.external_rating_results using gin (metrics);

alter table public.external_rating_catalog enable row level security;
alter table public.external_rating_results enable row level security;

drop policy if exists "Public can read external rating catalog" on public.external_rating_catalog;
create policy "Public can read external rating catalog"
  on public.external_rating_catalog
  for select to anon, authenticated
  using (true);

drop policy if exists "Public can read verified external rating results" on public.external_rating_results;
create policy "Public can read verified external rating results"
  on public.external_rating_results
  for select to anon, authenticated
  using (verification_status = 'verified');

grant select on public.external_rating_catalog to anon, authenticated;
grant select on public.external_rating_results to anon, authenticated;
revoke insert, update, delete on public.external_rating_catalog from anon, authenticated;
revoke insert, update, delete on public.external_rating_results from anon, authenticated;
