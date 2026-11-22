alter table public.investment_sites
  add column if not exists engineering_communications jsonb,
  add column if not exists provision_conditions text;
alter table public.municipal_facilities
  add column if not exists website text,
  add column if not exists department text,
  add column if not exists operating_status text,
  add column if not exists institution_type text;
alter table public.municipal_program_execution
  add column if not exists implementation_start_date date,
  add column if not exists implementation_end_date date,
  add column if not exists objectives text,
  add column if not exists funding_directions jsonb,
  add column if not exists planned_indicators jsonb,
  add column if not exists actual_results jsonb,
  add column if not exists program_status text;
alter table public.municipal_investment_projects
  add column if not exists investor text,
  add column if not exists planned_jobs integer,
  add column if not exists expected_results text,
  add column if not exists latitude numeric,
  add column if not exists longitude numeric;
alter table public.municipal_industrial_enterprises
  add column if not exists employee_count integer,
  add column if not exists main_products text,
  add column if not exists production_indicators jsonb,
  add column if not exists operating_status text,
  add column if not exists latitude numeric,
  add column if not exists longitude numeric;
