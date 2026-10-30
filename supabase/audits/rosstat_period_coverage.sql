-- Read-only coverage audit for imported Rosstat municipal-passport indicators.
-- This intentionally reports coverage by period and does not modify observations.
-- Annual, Q1, H1 and Q3 values are separate cumulative/period-specific observations;
-- do not sum them together or compare them as if they were the same period.

select
  indicator_code,
  indicator_name,
  reference_year,
  reference_period,
  unit,
  count(*) as observation_count,
  count(distinct municipality_id) as municipality_id_count,
  count(distinct geographic_name) as geographic_name_count,
  min(value::numeric) as min_value,
  max(value::numeric) as max_value,
  array_agg(distinct geographic_name order by geographic_name) as covered_territories
from public.municipality_indicators
where source_id::text like 'rosstat_passport_%'
  and geographic_level = 'municipality'
group by indicator_code, indicator_name, reference_year, reference_period, unit
order by indicator_code, reference_year, reference_period;

-- Focus on partial 2026 coverage, which should not be interpreted as regional totals.
select
  indicator_code,
  reference_period,
  unit,
  count(*) as observations,
  count(distinct geographic_name) as covered_territories,
  array_agg(distinct geographic_name order by geographic_name) as territories
from public.municipality_indicators
where source_id::text like 'rosstat_passport_%'
  and geographic_level = 'municipality'
  and reference_year = 2026
group by indicator_code, reference_period, unit
having count(distinct geographic_name) < 22
order by indicator_code, reference_period;
