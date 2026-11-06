-- Yugra18 post-migration read-only audit.
-- Run only after applying migrations:
-- 20261106210000_data_quality_provenance_guardrails.sql
-- 20261106230000_add_municipality_indicator_quality_view.sql
-- 20261106233000_extend_data_source_provenance_metadata.sql
-- This file is intentionally separate because production may not yet have
-- these additive relations/columns. Each SELECT can be run independently.
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
