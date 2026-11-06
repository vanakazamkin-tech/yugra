-- Yugra18 read-only data-quality audit. Run each SELECT independently.
-- This file does not mutate data.

-- Overall coverage and verification.
select count(*) observations,
 count(distinct municipality_id) municipalities_covered,
 count(distinct indicator_code) indicator_codes,
 count(distinct source_id) contributing_sources,
 count(*) filter(where verification_status='verified') verified_rows,
 count(*) filter(where verification_status='needs_review') review_rows,
 count(*) filter(where verification_status='demonstration') demonstration_rows
from public.municipality_indicators;

-- Coverage by municipality.
select m.id,m.name,count(i.id) observations,
 count(distinct i.indicator_code) indicators,min(i.reference_year) first_year,
 max(i.reference_year) last_year,
 count(i.id) filter(where i.verification_status='needs_review') review_rows
from public.municipalities m
left join public.municipality_indicators i on i.municipality_id=m.id
group by m.id,m.name order by m.name;

-- Same-source duplicates under the full observation identity (errors).
select municipality_id,indicator_code,reference_year,reference_period,unit,
 geographic_level,coalesce(geographic_name,'') geographic_name,source_id,count(*) duplicate_rows
from public.municipality_indicators
group by municipality_id,indicator_code,reference_year,reference_period,unit,
 geographic_level,coalesce(geographic_name,''),source_id
having count(*)>1 order by duplicate_rows desc;

-- Cross-source disagreements (review; do not auto-select a winner).
select municipality_id,indicator_code,reference_year,reference_period,unit,
 geographic_level,coalesce(geographic_name,'') geographic_name,
 count(distinct source_id) sources,count(distinct value) distinct_values,
 jsonb_agg(jsonb_build_object('source_id',source_id,'value',value,
   'status',verification_status,'source_url',source_url) order by source_id) source_values
from public.municipality_indicators
group by municipality_id,indicator_code,reference_year,reference_period,unit,
 geographic_level,coalesce(geographic_name,'')
having count(distinct source_id)>1
order by distinct_values desc,sources desc;

-- Required provenance and FK integrity.
select count(*) filter(where m.id is null) orphan_municipality_rows,
 count(*) filter(where s.id is null) orphan_source_rows,
 count(*) filter(where mi.source_url is null or btrim(mi.source_url)='') missing_urls,
 count(*) filter(where mi.unit is null or btrim(mi.unit)='') missing_units,
 count(*) filter(where mi.indicator_code is null or btrim(mi.indicator_code)='') missing_codes
from public.municipality_indicators mi
left join public.municipalities m on m.id=mi.municipality_id
left join public.data_sources s on s.id=mi.source_id;

-- Period vocabulary: review mixed encodings before any normalization.
select reference_period,count(*) rows,min(reference_year) first_year,max(reference_year) last_year
from public.municipality_indicators group by reference_period order by reference_period;

-- Source catalogue status and actual use.
select ds.category,ds.import_status,count(*) catalogue_sources,
 count(distinct mi.source_id) sources_used,count(mi.id) linked_observations
from public.data_sources ds left join public.municipality_indicators mi on mi.source_id=ds.id
group by ds.category,ds.import_status order by ds.category,ds.import_status;

-- URL snapshots may differ from canonical catalogue URLs (exact document vs landing page).
select count(*) linked_observations,
 count(*) filter(where lower(mi.source_url)<>lower(ds.url)) url_snapshot_differs
from public.municipality_indicators mi join public.data_sources ds on ds.id=mi.source_id;

-- Read-only access posture.
select c.relname relation,c.relrowsecurity rls_enabled,
 has_table_privilege('anon',c.oid,'SELECT') anon_can_select,
 has_table_privilege('authenticated',c.oid,'SELECT') authenticated_can_select,
 has_table_privilege('anon',c.oid,'INSERT') anon_can_insert,
 has_table_privilege('authenticated',c.oid,'INSERT') authenticated_can_insert
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p','v') order by c.relname;

-- Time coverage by year and period; interpret the current year against source calendars.
select reference_year,reference_period,count(*) observations,
 count(distinct municipality_id) municipalities,
 count(distinct indicator_code) indicators,
 count(*) filter(where verification_status='needs_review') review_rows
from public.municipality_indicators
group by reference_year,reference_period order by reference_year,reference_period;

-- Indicator coverage matrix: distinguish full, partial, and single-municipality series.
-- This is a raw presence audit, not a judgement that every indicator should cover all 22 municipalities.
with per_indicator as (
  select indicator_code,
    count(distinct municipality_id) municipalities_covered,
    count(*) observations,
    count(*) filter(where geographic_level <> 'municipality') other_geography_rows
  from public.municipality_indicators
  group by indicator_code
)
select count(*) total_indicator_codes,
  count(*) filter(where municipalities_covered = 22) full_municipality_coverage,
  count(*) filter(where municipalities_covered between 2 and 21) partial_multi_municipality,
  count(*) filter(where municipalities_covered = 1) single_municipality_only,
  count(*) filter(where other_geography_rows > 0) indicators_with_nonmunicipal_geography
from per_indicator;

-- Highest-coverage indicators, useful for defining a comparable municipal panel.
select indicator_code,max(indicator_name) indicator_name,
  count(distinct municipality_id) municipalities_covered,count(*) observations,
  min(reference_year) first_year,max(reference_year) last_year,
  count(distinct source_id) sources
from public.municipality_indicators
group by indicator_code
having count(distinct municipality_id) > 1
order by municipalities_covered desc,observations desc,indicator_code
limit 50;

-- Source catalogue metadata completeness and publication/refresh tracking.
select count(*) total_sources,
  count(*) filter(where name is null or btrim(name)='') missing_name,
  count(*) filter(where url is null or btrim(url)='') missing_url,
  count(*) filter(where category is null or btrim(category)='') missing_category,
  count(*) filter(where description is null or btrim(description)='') missing_description,
  count(*) filter(where format is null or btrim(format)='') missing_format,
  count(*) filter(where coverage is null or btrim(coverage)='') missing_coverage,
  count(*) filter(where update_frequency is null or btrim(update_frequency)='') missing_update_frequency,
  count(*) filter(where last_checked_at is null) missing_last_checked_at
from public.data_sources;

-- A repeated landing-page URL does not prove duplicate datasets.
select lower(trim(trailing '/' from url)) normalized_url,count(*) source_records,
  array_agg(id order by id) source_ids
from public.data_sources
group by lower(trim(trailing '/' from url))
having count(*)>1
order by source_records desc,normalized_url;

-- Verify catalog entries are referenced by any dataset, not only municipality_indicators.
with used_sources as (
  select source_id from public.municipality_indicators
  union select source_id from public.investment_sites
  union select source_id from public.municipal_program_execution
  union select source_id from public.fuel_price_observations
  union select source_id from public.municipal_facilities
  union select source_id from public.municipality_legacy_snapshots
  union select source_id from public.external_rating_catalog where source_id is not null
  union select source_id from public.municipality_indicator_import_staging
)
select ds.import_status,count(*) total_sources,
  count(*) filter(where u.source_id is not null) referenced_anywhere,
  count(*) filter(where u.source_id is null) unreferenced_anywhere
from public.data_sources ds
left join used_sources u on u.source_id=ds.id
group by ds.import_status
order by ds.import_status;
