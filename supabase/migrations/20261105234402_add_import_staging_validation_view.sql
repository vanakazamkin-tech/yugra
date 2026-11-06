create or replace view public.municipality_indicator_import_review
with (security_invoker = true)
as
select
  s.*,
  m.name as matched_municipality_name,
  case
    when s.mapped_municipality_id is null then 'needs_mapping'
    when m.id is null then 'unknown_municipality'
    else 'matched'
  end as municipality_match_status,
  case
    when s.raw_year is null or s.raw_year < 1900 or s.raw_year > extract(year from current_date)::int + 1 then 'invalid_year'
    when s.raw_value is null or btrim(s.raw_value) = '' then 'missing_value'
    when s.normalized_value is null then 'value_not_normalized'
    when s.raw_unit is null or btrim(s.raw_unit) = '' then 'missing_unit'
    when s.mapped_indicator_code is null or btrim(s.mapped_indicator_code) = '' then 'needs_indicator_mapping'
    when s.geographic_level is distinct from 'municipality' then 'wrong_geographic_level'
    when m.id is null then 'unknown_municipality'
    when exists (
      select 1 from public.municipality_indicators mi
      where mi.municipality_id = s.mapped_municipality_id
        and mi.indicator_code = s.mapped_indicator_code
        and mi.reference_year = s.raw_year
        and mi.reference_period = coalesce(s.raw_period, 'annual')
        and mi.unit = coalesce(s.normalized_unit, s.raw_unit)
        and mi.verification_status = 'verified'
        and mi.geographic_level = 'municipality'
    ) then 'possible_existing_duplicate'
    else 'ready_for_manual_review'
  end as automated_review_result
from public.municipality_indicator_import_staging s
left join public.municipalities m on m.id = s.mapped_municipality_id;
comment on view public.municipality_indicator_import_review is
 'Read-only automated preflight for staged municipal statistics. It does not approve or import rows.';
