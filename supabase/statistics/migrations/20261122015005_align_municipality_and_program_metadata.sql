alter table public.municipalities
  add column if not exists group_2024 text,
  add column if not exists rank_2024 integer,
  add column if not exists score integer,
  add column if not exists investments_volume_billion numeric,
  add column if not exists investments_growth_percent numeric,
  add column if not exists sme_count integer,
  add column if not exists assessment_score numeric;

alter table public.municipal_program_execution
  add column if not exists implementation_start_date date,
  add column if not exists implementation_end_date date,
  add column if not exists objectives text,
  add column if not exists funding_directions jsonb,
  add column if not exists planned_indicators jsonb,
  add column if not exists actual_results jsonb,
  add column if not exists program_status text;
