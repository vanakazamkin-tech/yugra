-- Yugra18 labour-indicator comparability audit.
-- READ ONLY: no database objects or observations are modified.
-- The output deliberately preserves exact indicator names, periods and statuses.
-- Do not interpret average employees excluding SMEs as total employment or
-- an employment rate. Do not interpret registered unemployment as ILO unemployment.

-- 1. Verified and needs_review coverage by exact definition, year and period.
select
  indicator_code, indicator_name, reference_year, reference_period,
  verification_status, unit,
  count(*) as rows,
  count(distinct municipality_id) as municipalities,
  count(distinct source_id) as sources,
  count(*) filter (where source_published_at is null) as missing_publication_date_rows
from public.municipality_indicators
where geographic_level = 'municipality'
  and indicator_code in (
    'sme_employment_share',
    'average_employees_annual',
    'average_monthly_salary_annual',
    'registered_unemployment_rate'
  )
group by indicator_code, indicator_name, reference_year, reference_period,
         verification_status, unit
order by indicator_code, reference_year, reference_period,
         verification_status, indicator_name;

-- 2. Conflicting source values for SME employment share.
-- Both values are retained in needs_review; difference is percentage points.
with paired as (
  select
    municipality_id, reference_year,
    max(value::numeric) filter (
      where source_id = 'investugra_municipal_rating_report_2023'
    ) as rating_report_value,
    max(value::numeric) filter (
      where source_id = 'ugra_municipal_efficiency_349rp_2024_uray_yugorsk_khm'
    ) as government_report_value
  from public.municipality_indicators
  where indicator_code = 'sme_employment_share'
    and geographic_level = 'municipality'
    and verification_status = 'needs_review'
    and reference_year in (2022, 2023)
    and source_id in (
      'investugra_municipal_rating_report_2023',
      'ugra_municipal_efficiency_349rp_2024_uray_yugorsk_khm'
    )
  group by municipality_id, reference_year
  having count(distinct source_id) = 2
)
select
  m.name as municipality, p.reference_year,
  p.rating_report_value, p.government_report_value,
  round((p.rating_report_value - p.government_report_value)::numeric, 2)
    as difference_percentage_points
from paired p
join public.municipalities m on m.id = p.municipality_id
order by p.reference_year, m.name;

-- 3. Salary and headcount: exact overlap, not an inferred complete labour market.
with employees as (
  select municipality_id, reference_year, max(value::numeric) as employees
  from public.municipality_indicators
  where indicator_code = 'average_employees_annual'
    and verification_status = 'verified'
    and geographic_level = 'municipality'
    and reference_period = 'annual'
    and indicator_name =
      'Среднесписочная численность работников организаций без субъектов малого предпринимательства, всего по обследуемым видам экономической деятельности'
  group by municipality_id, reference_year
),
salary as (
  select municipality_id, reference_year, max(value::numeric) as salary_rubles
  from public.municipality_indicators
  where indicator_code = 'average_monthly_salary_annual'
    and verification_status = 'verified'
    and geographic_level = 'municipality'
    and reference_period = 'annual'
  group by municipality_id, reference_year
),
paired as (
  select e.municipality_id, e.reference_year, e.employees, s.salary_rubles
  from employees e
  join salary s using (municipality_id, reference_year)
)
select
  p.reference_year,
  count(*) as paired_municipalities,
  round(avg(p.salary_rubles)::numeric, 2) as mean_salary_rubles,
  round(percentile_cont(0.5) within group (order by p.salary_rubles)::numeric, 2)
    as median_salary_rubles,
  round(avg(p.employees)::numeric, 2) as mean_employees_excluding_sme,
  round(corr(p.employees, p.salary_rubles)::numeric, 4)
    as employees_salary_correlation,
  string_agg(m.name, ', ' order by m.name) as exact_cohort
from paired p
join public.municipalities m on m.id = p.municipality_id
group by p.reference_year
order by p.reference_year;

-- 4. Nominal salary change for the nine municipalities with both annual values.
-- This is not real-wage growth: no CPI/deflator is applied here.
with salary as (
  select
    municipality_id,
    max(value::numeric) filter (where reference_year = 2024) as salary_2024,
    max(value::numeric) filter (where reference_year = 2025) as salary_2025
  from public.municipality_indicators
  where indicator_code = 'average_monthly_salary_annual'
    and verification_status = 'verified'
    and geographic_level = 'municipality'
    and reference_period = 'annual'
    and reference_year in (2024, 2025)
  group by municipality_id
)
select
  count(*) as paired_municipalities,
  round(avg((salary_2025 / nullif(salary_2024, 0) - 1) * 100)::numeric, 2)
    as mean_nominal_growth_percent,
  round(percentile_cont(0.5) within group (
    order by (salary_2025 / nullif(salary_2024, 0) - 1) * 100
  )::numeric, 2) as median_nominal_growth_percent,
  round(min((salary_2025 / nullif(salary_2024, 0) - 1) * 100)::numeric, 2)
    as min_nominal_growth_percent,
  round(max((salary_2025 / nullif(salary_2024, 0) - 1) * 100)::numeric, 2)
    as max_nominal_growth_percent,
  round(corr(salary_2024, salary_2025)::numeric, 4) as salary_level_correlation
from salary
where salary_2024 is not null and salary_2025 is not null;
