-- Yugra18 post-migration read-only audit.
-- Run only after applying migrations listed below to the target database:
-- 20261107055913_forecast_scenario_alignment.sql
-- 20261107055915_data_quality_provenance_guardrails.sql
-- 20261107055917_add_municipality_indicator_quality_view.sql
-- 20261107055919_extend_data_source_provenance_metadata.sql
-- Production has these versions registered as of 2026-11-07. Verify the
-- migration history before running this read-only audit on another project.
-- Each SELECT can be run independently.
--
-- Provenance coverage after the provenance migration.
-- A missing link is a review item; do not synthesize links from guessed URLs.
select count(distinct mi.id) observations,
  count(distinct mi.id) filter(where l.indicator_id is null) observations_without_provenance_link,
  count(distinct l.indicator_id) observations_with_provenance,
  count(*) filter(where l.source_role = 'primary') primary_source_links,
  count(*) filter(where l.source_role <> 'primary') supporting_source_links
from public.municipality_indicators mi
left join private.municipality_indicator_source_links l on l.indicator_id = mi.id;

-- Multiple provenance links per observation; expected for observations
-- supported by multiple documents, not automatically a data-quality error.
select mi.id,mi.municipality_id,mi.indicator_code,mi.reference_year,mi.reference_period,
  count(*) source_links,
  jsonb_agg(jsonb_build_object(
    'source_id',l.source_id,'role',l.source_role,'url_snapshot',l.source_url_snapshot
  ) order by l.source_role,l.source_id) provenance
from public.municipality_indicators mi
join private.municipality_indicator_source_links l on l.indicator_id=mi.id
group by mi.id,mi.municipality_id,mi.indicator_code,mi.reference_year,mi.reference_period
having count(*)>1
order by source_links desc,mi.municipality_id,mi.indicator_code;

-- Referential integrity for provenance links (foreign keys should make both
-- orphan counts zero; retained as a diagnostic in case constraints change).
select count(*) filter(where mi.id is null) orphan_observation_links,
  count(*) filter(where ds.id is null) orphan_source_links,
  count(*) filter(where l.source_url_snapshot is null or btrim(l.source_url_snapshot)='') empty_url_snapshots
from private.municipality_indicator_source_links l
left join public.municipality_indicators mi on mi.id=l.indicator_id
left join public.data_sources ds on ds.id=l.source_id;

-- Aggregate diagnostic-view queue. Each returned row is a review flag, not
-- an automatic correction or a claim that one source is authoritative.
select issue_code,severity,count(*) issue_rows,
  count(distinct municipality_id) municipalities,
  count(distinct indicator_code) indicators
from public.municipality_indicator_quality_issues
group by issue_code,severity
order by severity,issue_code;

-- Source metadata completeness added by the provenance metadata migration.
select count(*) total_sources,
  count(*) filter(where data_owner is null or btrim(data_owner)='') missing_data_owner,
  count(*) filter(where temporal_coverage is null or btrim(temporal_coverage)='') missing_temporal_coverage,
  count(*) filter(where data_type is null or btrim(data_type)='') missing_data_type,
  count(*) filter(where access_restrictions is null or btrim(access_restrictions)='') unchecked_access_restrictions,
  count(*) filter(where retrieved_at is null) missing_retrieved_at,
  min(last_checked_at) oldest_last_checked_at,
  min(retrieved_at) oldest_retrieved_at
from public.data_sources;

-- URL format diagnostics: flag non-HTTP(S) URLs for manual review without
-- rejecting repository-local identifiers or rewriting source records.
select id,name,url
from public.data_sources
where url !~* '^https?://'
order by id;

-- Period labels outside the currently accepted vocabulary. Bare years are
-- intentionally valid; do not normalize flagged values without checking source.
select reference_period,count(*) rows,
  array_agg(distinct indicator_code order by indicator_code) indicator_codes
from public.municipality_indicators
where reference_period !~ '^(annual|[0-9]{4}|[0-9]{4}-Q[1-4]|[0-9]{4}-H[1-2]|[0-9]{4}-[0-9]{2}-[0-9]{2})$'
group by reference_period
order by rows desc,reference_period;

-- Observation preservation checkpoint. Compare these counts with the saved
-- pre-migration baseline; counts alone do not prove value-level preservation.
select count(*) observations,
  count(distinct id) distinct_observation_ids,
  count(*) filter(where verification_status='verified') verified_rows,
  count(*) filter(where verification_status='needs_review') review_rows,
  count(*) filter(where verification_status='demonstration') demonstration_rows,
  count(*) filter(where source_id is null) missing_source_ids,
  count(*) filter(where source_url is null or btrim(source_url)='') missing_source_urls
from public.municipality_indicators;

-- The new identity index must be UNIQUE and contain eight key attributes.
-- Inspect the definition as well as the count; expression keys are included.
select i.indisunique is true as is_unique,
  i.indnkeyatts as key_attribute_count,
  pg_get_indexdef(i.indexrelid) as index_definition
from pg_index i
where i.indexrelid = to_regclass('public.uq_municipality_indicators_source_observation');

-- Security posture of the new private table and diagnostic view.
-- Expected: RLS=true; anon/authenticated cannot use private schema or read
-- either object; service_role has the explicitly intended access.
select
  has_schema_privilege('anon','private','USAGE') as anon_private_schema_usage,
  has_schema_privilege('authenticated','private','USAGE') as authenticated_private_schema_usage,
  has_schema_privilege('service_role','private','USAGE') as service_role_private_schema_usage,
  has_table_privilege('anon','private.municipality_indicator_source_links','SELECT') as anon_can_read_provenance,
  has_table_privilege('authenticated','private.municipality_indicator_source_links','SELECT') as authenticated_can_read_provenance,
  has_table_privilege('service_role','private.municipality_indicator_source_links','SELECT') as service_role_can_read_provenance,
  has_table_privilege('anon','public.municipality_indicator_quality_issues','SELECT') as anon_can_read_quality_view,
  has_table_privilege('authenticated','public.municipality_indicator_quality_issues','SELECT') as authenticated_can_read_quality_view,
  has_table_privilege('service_role','public.municipality_indicator_quality_issues','SELECT') as service_role_can_read_quality_view,
  coalesce((
    select c.relrowsecurity
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='private' and c.relname='municipality_indicator_source_links'
  ),false) as provenance_rls_enabled,
  coalesce((
    select c.reloptions @> array['security_invoker=true']
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='municipality_indicator_quality_issues'
  ),false) as quality_view_security_invoker;

-- The five nullable metadata fields should all exist after migration.
select column_name,is_nullable,data_type
from information_schema.columns
where table_schema='public' and table_name='data_sources'
  and column_name in ('data_owner','temporal_coverage','data_type','access_restrictions','retrieved_at')
order by column_name;

-- Duplicate check using the same full identity as the new unique index.
-- Expected result: zero rows.
select municipality_id,indicator_code,reference_year,reference_period,unit,
  geographic_level,coalesce(geographic_name,'') geographic_name,source_id,count(*) duplicate_rows
from public.municipality_indicators
group by municipality_id,indicator_code,reference_year,reference_period,unit,
  geographic_level,coalesce(geographic_name,''),source_id
having count(*)>1
order by duplicate_rows desc;
