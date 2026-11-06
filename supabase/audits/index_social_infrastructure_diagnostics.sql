-- Yugra18 social-sector and infrastructure comparability audit.
-- READ ONLY: no schema, source catalog or observation rows are modified.
-- A municipal indicator is not admitted merely because its label looks similar.
-- Keep exact definitions, units, reference periods, geography and source provenance.

-- 1. Candidate social / infrastructure indicators by exact code and definition.
select
  indicator_code,
  indicator_name,
  unit,
  reference_year,
  reference_period,
  verification_status,
  count(*) as rows,
  count(distinct municipality_id) as municipalities,
  count(distinct source_id) as sources,
  count(*) filter (where source_published_at is null)
    as missing_publication_date_rows
from public.municipality_indicators
where geographic_level = 'municipality'
  and (
    indicator_name ~* '(образован|дошколь|школ|учащ|ученик|студент|здравоохран|медицин|врач|фельдшер|коеч|больниц|поликлиник|жиль|водоснабж|водоотвед|газифиц|дорог|транспорт|связ|интернет|культур|спорт|библиотек|благоустрой|отход|обеспеченн|учрежден|населенн.*без|мощност|мест в|посещени)'
    or indicator_code ~* '(education|school|preschool|health|doctor|hospital|bed|housing|water|road|transport|internet|culture|sport|utility|social|welfare|facility|access)'
  )
group by
  indicator_code, indicator_name, unit, reference_year,
  reference_period, verification_status
order by indicator_code, reference_year, reference_period,
         verification_status, indicator_name;

-- 2. Relevant source-catalog records and the number of observations actually
-- linked to each source. Import status alone is not proof of imported rows.
select
  ds.id,
  ds.name,
  ds.category,
  ds.import_status,
  ds.url,
  ds.coverage,
  ds.update_frequency,
  ds.last_checked_at,
  count(mi.id) as linked_observation_rows,
  count(distinct mi.municipality_id) filter (
    where mi.geographic_level = 'municipality'
  ) as linked_municipalities
from public.data_sources ds
left join public.municipality_indicators mi on mi.source_id = ds.id
where
  ds.name ilike any(array[
    '%school%','%preschool%','%education%','%health%','%hospital%',
    '%housing%','%water%','%road%','%transport%','%culture%','%sport%',
    '%utility%','%школ%','%дошколь%','%образован%','%здравоохран%',
    '%медицин%','%жиль%','%водоснабж%','%дорог%','%транспорт%',
    '%культур%','%спорт%','%благоустрой%'
  ])
  or ds.category ilike any(array[
    '%social%','%infrastructure%','%education%','%health%','%housing%'
  ])
group by ds.id, ds.name, ds.category, ds.import_status, ds.url,
         ds.coverage, ds.update_frequency, ds.last_checked_at
order by ds.import_status, ds.name;

-- 3. Explicit coverage test for a full 22-municipality peer panel.
-- Reports only candidates detected by the same semantic search as query 1.
with candidates as (
  select distinct indicator_code, indicator_name, unit
  from public.municipality_indicators
  where geographic_level = 'municipality'
    and verification_status = 'verified'
    and (
      indicator_name ~* '(образован|дошколь|школ|учащ|ученик|студент|здравоохран|медицин|врач|фельдшер|коеч|больниц|поликлиник|жиль|водоснабж|водоотвед|газифиц|дорог|транспорт|связ|интернет|культур|спорт|библиотек|благоустрой|отход|обеспеченн|учрежден|населенн.*без|мощност|мест в|посещени)'
      or indicator_code ~* '(education|school|preschool|health|doctor|hospital|bed|housing|water|road|transport|internet|culture|sport|utility|social|welfare|facility|access)'
    )
)
select
  c.indicator_code,
  c.indicator_name,
  c.unit,
  mi.reference_year,
  mi.reference_period,
  count(distinct mi.municipality_id) as verified_municipalities,
  count(*) as verified_rows,
  22 - count(distinct mi.municipality_id) as missing_municipalities
from candidates c
join public.municipality_indicators mi
  on mi.indicator_code = c.indicator_code
 and mi.indicator_name = c.indicator_name
 and mi.unit = c.unit
where mi.geographic_level = 'municipality'
  and mi.verification_status = 'verified'
group by c.indicator_code, c.indicator_name, c.unit,
         mi.reference_year, mi.reference_period
order by c.indicator_code, mi.reference_year, mi.reference_period;
