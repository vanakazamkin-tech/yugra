-- Align scenario storage with the supported 1–3 year UI horizon and
-- persist explicit factor assumptions without changing RLS or table grants.
alter table public.forecast_scenarios
  add column if not exists export_shock_pct numeric(6,2) not null default 0,
  add column if not exists cost_pressure_pct numeric(6,2) not null default 0,
  add column if not exists labor_shortage_pct numeric(6,2) not null default 0;

alter table public.forecast_scenarios
  drop constraint if exists forecast_scenario_rates_check;
alter table public.forecast_scenarios
  add constraint forecast_scenario_rates_check check (
    investment_growth_rate between -50 and 100
    and sme_growth_rate between -50 and 100
    and score_growth_rate between -50 and 100
    and uncertainty_rate between 0 and 100
    and export_shock_pct between -100 and 100
    and cost_pressure_pct between -100 and 100
    and labor_shortage_pct between -100 and 100
  );

update public.forecast_scenarios set
  export_shock_pct = case key when 'cautious' then -10 when 'ambitious' then 4 else 0 end,
  cost_pressure_pct = case key when 'cautious' then 8 when 'ambitious' then -2 else 0 end,
  labor_shortage_pct = case key when 'cautious' then 6 when 'ambitious' then -2 else 0 end,
  updated_at = now()
where key in ('cautious', 'base', 'ambitious');

alter table public.forecast_runs
  drop constraint if exists forecast_runs_horizon_years_check;
alter table public.forecast_runs
  add constraint forecast_runs_horizon_years_check check (horizon_years in (1, 2, 3));
