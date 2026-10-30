-- Yugra conceptual forecasting module
-- This is additive: the existing public.municipalities table is intentionally preserved.

create table if not exists public.forecast_scenarios (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  summary text not null,
  investment_growth_rate numeric(6,2) not null default 4,
  sme_growth_rate numeric(6,2) not null default 3,
  score_growth_rate numeric(6,2) not null default 1.5,
  uncertainty_rate numeric(6,2) not null default 7,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint forecast_scenario_rates_check check (
    investment_growth_rate between -50 and 100
    and sme_growth_rate between -50 and 100
    and score_growth_rate between -50 and 100
    and uncertainty_rate between 0 and 100
  )
);

create table if not exists public.forecast_runs (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid references public.forecast_scenarios(id) on delete set null,
  scenario_key text not null,
  horizon_years integer not null check (horizon_years in (1, 3, 5)),
  input_parameters jsonb not null,
  projected_results jsonb not null,
  municipality_count integer not null check (municipality_count between 1 and 100),
  base_year integer not null default 2024,
  source_label text not null default 'Концептуальная модель',
  created_at timestamptz not null default now(),
  constraint forecast_inputs_object check (jsonb_typeof(input_parameters) = 'object'),
  constraint forecast_results_array check (
    jsonb_typeof(projected_results) = 'array'
    and jsonb_array_length(projected_results) between 1 and 100
  ),
  constraint forecast_source_length check (length(source_label) <= 500)
);

create index if not exists forecast_runs_created_at_idx
  on public.forecast_runs (created_at desc);
create index if not exists forecast_runs_scenario_key_idx
  on public.forecast_runs (scenario_key, created_at desc);

insert into public.forecast_scenarios
  (key, title, summary, investment_growth_rate, sme_growth_rate, score_growth_rate, uncertainty_rate, display_order, is_active)
values
  ('cautious', 'Осторожный', 'Сдержанная динамика и повышенная неопределённость.', 1, 1, 0.5, 10, 1, true),
  ('base', 'Инерционный', 'Умеренное продолжение заданных тенденций без резкого ускорения.', 4, 3, 1.5, 7, 2, true),
  ('ambitious', 'Ускоренное развитие', 'Более высокие темпы при условии реализации инициатив и доступности ресурсов.', 8, 6, 3, 12, 3, true)
on conflict (key) do update set
  title = excluded.title,
  summary = excluded.summary,
  investment_growth_rate = excluded.investment_growth_rate,
  sme_growth_rate = excluded.sme_growth_rate,
  score_growth_rate = excluded.score_growth_rate,
  uncertainty_rate = excluded.uncertainty_rate,
  display_order = excluded.display_order,
  is_active = excluded.is_active,
  updated_at = now();

alter table public.forecast_scenarios enable row level security;
alter table public.forecast_runs enable row level security;

drop policy if exists "Public can read active forecast scenarios" on public.forecast_scenarios;
create policy "Public can read active forecast scenarios"
  on public.forecast_scenarios
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Public can save bounded forecast runs" on public.forecast_runs;
create policy "Public can save bounded forecast runs"
  on public.forecast_runs
  for insert
  to anon, authenticated
  with check (
    horizon_years in (1, 3, 5)
    and municipality_count between 1 and 100
    and jsonb_typeof(input_parameters) = 'object'
    and jsonb_typeof(projected_results) = 'array'
    and jsonb_array_length(projected_results) between 1 and 100
    and length(source_label) <= 500
  );

grant select on public.forecast_scenarios to anon, authenticated;
grant insert on public.forecast_runs to anon, authenticated;
