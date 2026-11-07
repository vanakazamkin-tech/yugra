create extension if not exists pgcrypto;
do $$
begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create table public.data_sources (
 id text primary key,name text not null,category text not null,url text not null,description text not null,
 format text,coverage text,update_frequency text,import_status text not null default 'identified',
 last_checked_at timestamptz,notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.municipalities (
 id text primary key, name text not null
);
insert into public.municipalities(id,name) values ('test-municipality','Test municipality');
create table public.municipality_indicators (
 id uuid primary key default gen_random_uuid(),municipality_id text not null,indicator_code text not null,
 indicator_name text not null,reference_year integer not null,value numeric not null,unit text not null,
 source_id text not null references public.data_sources(id),source_url text not null,source_published_at date,
 retrieved_at timestamptz not null default now(),verification_status text not null default 'verified',
 notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 geographic_level text not null default 'municipality',geographic_name text,reference_period text not null default 'annual'
);
alter table public.municipality_indicators
 add constraint municipality_indicators_observation_unique
 unique (municipality_id,indicator_code,reference_year,reference_period,source_id);
insert into public.data_sources(id,name,category,url,description) values
 ('src-primary','Primary test source','official','https://example.test/primary','Disposable fixture'),
 ('src-secondary','Secondary test source','official','https://example.test/secondary','Disposable fixture');
insert into public.municipality_indicators(
 id,municipality_id,indicator_code,indicator_name,reference_year,reference_period,value,unit,source_id,source_url,verification_status,geographic_level,geographic_name
) values ('00000000-0000-0000-0000-000000000001','test-municipality','test_indicator','Test indicator',2025,'annual',10,'persons','src-primary','https://example.test/primary','verified','municipality',null);
