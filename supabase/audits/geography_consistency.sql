-- Read-only geography and referential-integrity audit for verified indicators.
-- Run in Supabase SQL Editor. This file contains SELECT statements only.
-- A clean result validates references and metadata presence, not the correctness
-- of values against the original publications.

-- 1. Verified observations must reference existing municipalities (when a
-- municipality_id is supplied), have explicit geography, and reference a
-- registered source.
select
  'orphan_municipality_indicator_refs' as check_name,
  count(*)::bigint as affected_rows
from public.municipality_indicators mi
left join public.municipalities m on m.id = mi.municipality_id
where mi.municipality_id is not null and m.id is null
union all
select
  'verified_rows_missing_geographic_level',
  count(*)::bigint
from public.municipality_indicators
where verification_status = 'verified'
  and (geographic_level is null or btrim(geographic_level) = '')
union all
select
  'verified_rows_missing_geographic_name',
  count(*)::bigint
from public.municipality_indicators
where verification_status = 'verified'
  and (geographic_name is null or btrim(geographic_name) = '')
union all
select
  'verified_rows_with_unknown_source',
  count(*)::bigint
from public.municipality_indicators mi
left join public.data_sources ds on ds.id = mi.source_id
where mi.verification_status = 'verified' and ds.id is null;

-- 2. Flag a logical indicator-period-unit group that mixes geography levels.
-- Such rows need review before aggregation or cross-territory comparison.
select
  indicator_code,
  reference_year,
  reference_period,
  unit,
  count(*) as rows,
  count(distinct geographic_level) as geographic_levels,
  array_agg(distinct geographic_level order by geographic_level) as levels,
  count(distinct municipality_id) as municipality_refs,
  count(distinct geographic_name) as geographic_names
from public.municipality_indicators
where verification_status = 'verified'
group by indicator_code, reference_year, reference_period, unit
having count(distinct geographic_level) > 1
order by rows desc, indicator_code, reference_year desc;
