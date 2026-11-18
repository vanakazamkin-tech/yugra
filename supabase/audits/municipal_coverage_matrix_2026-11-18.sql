-- Yugra18: read-only municipal coverage audit, snapshot date 2026-11-18.
-- SELECT statements only. This file does not modify production data.

-- 1. Global table and municipal coverage summary.
select
  count(*) as total_rows,
  count(*) filter (where verification_status = 'verified') as verified_rows_all_geographies,
  count(*) filter (where verification_status = 'verified' and geographic_level = 'municipality') as verified_municipal_rows,
  count(*) filter (where verification_status <> 'verified') as non_verified_rows,
  count(distinct municipality_id) as municipalities_with_any_rows,
  count(distinct indicator_code) as indicator_codes,
  count(distinct (indicator_code, indicator_name)) as code_name_pairs
from public.municipality_indicators;

-- 2. Exact 22-municipality inventory. Row counts are not performance scores.
with indicator_stats as (
  select
    municipality_id,
    count(*) filter (
      where verification_status = 'verified'
        and geographic_level = 'municipality'
    ) as verified_municipal_rows,
    count(distinct indicator_code) filter (
      where verification_status = 'verified'
        and geographic_level = 'municipality'
    ) as verified_indicator_codes,
    count(distinct (indicator_code, indicator_name)) filter (
      where verification_status = 'verified'
        and geographic_level = 'municipality'
    ) as verified_code_name_pairs,
    min(reference_year) filter (
      where verification_status = 'verified'
        and geographic_level = 'municipality'
    ) as first_verified_year,
    max(reference_year) filter (
      where verification_status = 'verified'
        and geographic_level = 'municipality'
    ) as last_verified_year
  from public.municipality_indicators
  group by municipality_id
)
select
  m.id as municipality_id,
  m.name as municipality_name,
  coalesce(s.verified_municipal_rows, 0) as verified_municipal_rows,
  coalesce(s.verified_indicator_codes, 0) as verified_indicator_codes,
  coalesce(s.verified_code_name_pairs, 0) as verified_code_name_pairs,
  s.first_verified_year,
  s.last_verified_year
from public.municipalities m
left join indicator_stats s on s.municipality_id = m.id
order by m.name;

-- 3. Coverage histogram by exact indicator-code + source-name pair.
with pair_coverage as (
  select
    indicator_code,
    indicator_name,
    count(distinct municipality_id) filter (
      where verification_status = 'verified'
        and geographic_level = 'municipality'
    ) as verified_municipality_count
  from public.municipality_indicators
  group by indicator_code, indicator_name
)
select
  case
    when verified_municipality_count = 22 then '22'
    when verified_municipality_count between 11 and 21 then '11-21'
    when verified_municipality_count between 5 and 10 then '5-10'
    when verified_municipality_count between 2 and 4 then '2-4'
    when verified_municipality_count = 1 then '1'
    else '0'
  end as coverage_band,
  count(*) as code_name_pairs
from pair_coverage
group by coverage_band
order by case coverage_band
  when '22' then 1 when '11-21' then 2 when '5-10' then 3
  when '2-4' then 4 when '1' then 5 else 6 end;

-- 4. Full comparison key. Never merge different units, geography, year,
-- reference period, status, or indicator-name variants implicitly.
select
  indicator_code,
  indicator_name,
  unit,
  geographic_level,
  geographic_name,
  reference_year,
  reference_period,
  verification_status,
  count(*) as observation_count,
  count(distinct municipality_id) as municipality_count,
  min(value) as min_value,
  max(value) as max_value,
  array_agg(distinct municipality_id order by municipality_id) as municipality_ids,
  array_agg(distinct source_id order by source_id) as source_ids
from public.municipality_indicators
group by
  indicator_code, indicator_name, unit, geographic_level, geographic_name,
  reference_year, reference_period, verification_status
order by indicator_code, reference_year, reference_period, geographic_level, unit, verification_status;

-- 5. Candidate core indicators: inspect each exact name-period-unit combination.
select
  indicator_code,
  indicator_name,
  reference_year,
  reference_period,
  unit,
  geographic_level,
  verification_status,
  count(*) as observations,
  count(distinct municipality_id) as municipalities,
  array_agg(distinct municipality_id order by municipality_id) as municipality_ids,
  array_agg(distinct source_id order by source_id) as source_ids
from public.municipality_indicators
where indicator_code in (
  'population_municipality',
  'population_urban_municipality',
  'population_rural_municipality',
  'fixed_capital_investment_non_mining',
  'fixed_capital_investment_enterprises_non_sme',
  'sme_employment_share',
  'sme_per_10k',
  'average_employees_annual',
  'average_monthly_salary_annual',
  'budget_revenue_excluding_grants',
  'budget_intergovernmental_transfers',
  'budget_tax_non_tax_revenue',
  'budget_total_revenue',
  'budget_total_expenditure'
)
group by
  indicator_code, indicator_name, reference_year, reference_period,
  unit, geographic_level, verification_status
order by indicator_code, reference_year, reference_period, indicator_name, verification_status;

-- 6. Existing quality diagnostics.
select *
from public.municipality_indicator_quality_issues
order by issue_code, indicator_code, reference_year, municipality_id;

-- 7. Same-source duplicates on the full statistical identity key.
-- Expected outcome for the 2026-11-18 snapshot: zero rows.
select
  municipality_id,
  indicator_code,
  reference_year,
  reference_period,
  unit,
  geographic_level,
  geographic_name,
  source_id,
  count(*) as duplicate_rows,
  array_agg(distinct value order by value) as distinct_values
from public.municipality_indicators
group by
  municipality_id, indicator_code, reference_year, reference_period,
  unit, geographic_level, geographic_name, source_id
having count(*) > 1
order by municipality_id, indicator_code, reference_year;

-- 8. Source catalog status and metadata gaps.
select import_status, count(*) as source_count
from public.data_sources
group by import_status
order by import_status;

select
  count(*) as total_sources,
  count(*) filter (where data_owner is null) as missing_data_owner,
  count(*) filter (where temporal_coverage is null) as missing_temporal_coverage,
  count(*) filter (where data_type is null) as missing_data_type,
  count(*) filter (where access_restrictions is null) as missing_access_restrictions,
  count(*) filter (where retrieved_at is null) as missing_retrieved_at
from public.data_sources;

-- 9. Operational register coverage.
select 'investment_sites' as registry, count(*) as rows, count(distinct municipality_id) as municipalities
from public.investment_sites
union all
select 'municipal_program_execution', count(*), count(distinct municipality_id)
from public.municipal_program_execution
union all
select 'fuel_price_observations', count(*), count(distinct municipality_id)
from public.fuel_price_observations
union all
select 'municipal_facilities', count(*), count(distinct municipality_id)
from public.municipal_facilities
order by registry;

-- 10. External ratings: preserve their native geographic level.
select
  c.rating_id,
  c.provider,
  c.title,
  c.edition_year,
  c.geographic_level as catalog_geographic_level,
  c.geography_scope,
  r.geographic_level as result_geographic_level,
  count(r.id) as result_rows,
  count(distinct r.geography_name) as distinct_geographies,
  array_agg(distinct r.geography_name order by r.geography_name)
    filter (where r.geography_name is not null) as geography_names
from public.external_rating_catalog c
left join public.external_rating_results r on r.rating_id = c.rating_id
group by
  c.rating_id, c.provider, c.title, c.edition_year,
  c.geographic_level, c.geography_scope, r.geographic_level
order by c.edition_year, c.rating_id, result_geographic_level;

-- 11. Staging is isolated from analytics until controlled import.
select review_status, count(*) as staging_rows
from public.municipality_indicator_import_staging
group by review_status
order by review_status;

select count(*) as total_staging_rows
from public.municipality_indicator_import_staging;

-- 12. Read-only privileges for tables reported by the RLS advisor.
-- No-policy tables must remain private where public access is not intended.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  has_table_privilege('anon', format('%I.%I', n.nspname, c.relname), 'SELECT') as anon_select,
  has_table_privilege('authenticated', format('%I.%I', n.nspname, c.relname), 'SELECT') as authenticated_select,
  has_table_privilege('anon', format('%I.%I', n.nspname, c.relname), 'INSERT') as anon_insert,
  has_table_privilege('authenticated', format('%I.%I', n.nspname, c.relname), 'INSERT') as authenticated_insert
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where (n.nspname = 'private' and c.relname = 'municipality_indicator_source_links')
   or (n.nspname = 'public' and c.relname in (
     'forecast_runs',
     'municipality_indicator_import_staging',
     'municipality_legacy_snapshots',
     'project_work_log'
   ))
order by n.nspname, c.relname;
