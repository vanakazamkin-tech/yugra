-- Read-only diagnostics for provenance conflicts and temporal-label normalization.
-- No observation is modified, deleted, or promoted by this migration.

create or replace view public.municipality_indicator_quality_issues
with (security_invoker = true)
as
with conflicting_values as (
  select
    municipality_id,
    indicator_code,
    reference_year,
    reference_period,
    unit,
    geographic_level,
    coalesce(geographic_name, '') as geographic_name,
    count(*)::bigint as row_count,
    count(distinct source_id)::bigint as source_count,
    array_agg(distinct value order by value) as conflicting_values,
    array_agg(distinct source_id order by source_id) as source_ids
  from public.municipality_indicators
  group by municipality_id, indicator_code, reference_year, reference_period,
    unit, geographic_level, coalesce(geographic_name, '')
  having count(distinct value) > 1
     and count(distinct source_id) > 1
),
period_labels as (
  select
    id, municipality_id, indicator_code, reference_year, reference_period,
    unit, source_id, geographic_level, coalesce(geographic_name, '') as geographic_name
  from public.municipality_indicators
  -- A bare year is a valid annual label in the existing dataset.
  -- Flag only genuinely noncanonical labels for manual source review.
  where reference_period !~ '^(annual|[0-9]{4}|[0-9]{4}-Q[1-4]|[0-9]{4}-H[1-2]|[0-9]{4}-[0-9]{2}-[0-9]{2})$'
),
review_backlog as (
  select
    id, municipality_id, indicator_code, reference_year, reference_period,
    unit, source_id, verification_status, geographic_level,
    coalesce(geographic_name, '') as geographic_name
  from public.municipality_indicators
  where verification_status <> 'verified'
)
select
  'conflicting_source_values'::text as issue_code,
  'warning'::text as severity,
  municipality_id,
  indicator_code,
  reference_year,
  reference_period,
  unit,
  geographic_level,
  geographic_name,
  row_count,
  source_count,
  conflicting_values,
  source_ids,
  'Источники содержат разные значения для одного муниципалитета, показателя, периода и географического уровня; сохранять обе версии до методической сверки.'::text as details
from conflicting_values

union all

select
  'noncanonical_period_label',
  'info',
  p.municipality_id,
  p.indicator_code,
  p.reference_year,
  p.reference_period,
  p.unit,
  p.geographic_level,
  p.geographic_name,
  1::bigint,
  1::bigint,
  null::numeric[],
  array[p.source_id]::text[],
  'Нестандартная метка периода. Не нормализовать автоматически без проверки исходной публикации.'
from period_labels p

union all

select
  'verification_backlog',
  'warning',
  r.municipality_id,
  r.indicator_code,
  r.reference_year,
  r.reference_period,
  r.unit,
  r.geographic_level,
  r.geographic_name,
  1::bigint,
  1::bigint,
  null::numeric[],
  array[r.source_id]::text[],
  ('Статус наблюдения: ' || r.verification_status || '. Не использовать как подтверждённое наблюдение.')
from review_backlog r;

comment on view public.municipality_indicator_quality_issues is
 'Read-only quality diagnostics. Cross-source disagreements and noncanonical period labels are review flags, not automatic corrections. Bare years are accepted as annual labels. Negative values are not globally rejected because valid growth/decline indicators may be negative.';

revoke all on table public.municipality_indicator_quality_issues from public, anon, authenticated;
grant select on table public.municipality_indicator_quality_issues to service_role;
