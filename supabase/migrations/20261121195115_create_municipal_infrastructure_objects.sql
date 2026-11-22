-- Schema reconstructed from the applied DB1 migration metadata.
-- Stage 7 passport tables for projects, industrial enterprises and infrastructure.

create table if not exists public.municipal_investment_projects (
  id uuid primary key default gen_random_uuid(),
  municipality_id text not null references public.municipalities(id),
  source_id text not null references public.data_sources(id),
  external_id text,
  project_name text not null,
  investment_amount_thousand numeric,
  project_category text,
  activity_type text,
  project_stage text,
  project_status text,
  start_year integer,
  end_year integer,
  location_text text,
  description text,
  source_url text not null,
  source_payload jsonb not null default '{}'::jsonb,
  verification_status text not null default 'verified',
  retrieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  investor text,
  planned_jobs integer,
  expected_results text,
  latitude numeric,
  longitude numeric
);
create index if not exists municipal_investment_projects_source_external_uidx
  on public.municipal_investment_projects (source_id, external_id)
  where external_id is not null;
create index if not exists municipal_investment_projects_coordinates_idx
  on public.municipal_investment_projects (latitude, longitude)
  where latitude is not null and longitude is not null;

create table if not exists public.municipal_industrial_enterprises (
  id uuid primary key default gen_random_uuid(),
  municipality_id text not null references public.municipalities(id),
  source_id text not null references public.data_sources(id),
  registry_number integer,
  enterprise_name text not null,
  entity_type text,
  activity_type text,
  address text,
  source_url text not null,
  source_payload jsonb not null default '{}'::jsonb,
  verification_status text not null default 'verified',
  retrieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  employee_count integer,
  main_products text,
  production_indicators jsonb,
  operating_status text,
  latitude numeric,
  longitude numeric
);
create unique index if not exists municipal_industrial_enterprises_source_regnum_uidx
  on public.municipal_industrial_enterprises (source_id, registry_number)
  where registry_number is not null;
create index if not exists municipal_industrial_enterprises_coordinates_idx
  on public.municipal_industrial_enterprises (latitude, longitude)
  where latitude is not null and longitude is not null;

create table if not exists public.municipal_infrastructure_objects (
  id uuid primary key default gen_random_uuid(),
  municipality_id text not null references public.municipalities(id) on update cascade on delete restrict,
  source_id text not null references public.data_sources(id) on update cascade on delete restrict,
  external_id text not null,
  object_type text not null check (object_type in ('road','bridge','sidewalk','traffic_calming','street_lighting','water_supply','wastewater','heat_supply','electricity','gas_supply','waste_management','public_space','other')),
  name text not null,
  address text,
  location_text text,
  latitude numeric,
  longitude numeric,
  status text,
  description text,
  planned_start_date date,
  planned_end_date date,
  commissioned_date date,
  source_url text not null,
  source_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(source_payload) = 'object'),
  verification_status text not null default 'needs_review'
    check (verification_status in ('verified','needs_review','demonstration')),
  retrieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  length_km numeric,
  technical_condition text,
  construction_year integer,
  reconstruction_year integer,
  characteristics jsonb,
  check ((latitude is null and longitude is null)
    or (latitude between -90 and 90 and longitude between -180 and 180))
);
create unique index if not exists municipal_infrastructure_objects_source_external_uidx
  on public.municipal_infrastructure_objects (source_id, external_id);
create index if not exists municipal_infrastructure_objects_municipality_idx
  on public.municipal_infrastructure_objects (municipality_id);
create index if not exists municipal_infrastructure_objects_type_idx
  on public.municipal_infrastructure_objects (object_type);
create index if not exists municipal_infrastructure_coordinates_idx
  on public.municipal_infrastructure_objects (latitude, longitude)
  where latitude is not null and longitude is not null;

alter table public.municipal_infrastructure_objects enable row level security;
drop policy if exists "Public read municipal infrastructure objects"
  on public.municipal_infrastructure_objects;
create policy "Public read municipal infrastructure objects"
  on public.municipal_infrastructure_objects for select to anon, authenticated
  using (verification_status = 'verified');
grant select on public.municipal_infrastructure_objects to anon, authenticated;
revoke insert, update, delete on public.municipal_infrastructure_objects from anon, authenticated;
