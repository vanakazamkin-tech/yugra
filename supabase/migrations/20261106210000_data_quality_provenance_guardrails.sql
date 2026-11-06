-- Additive data-lineage layer and same-source duplicate guard.
-- Existing observations remain unchanged. Cross-source observations are intentionally
-- allowed because different documents may report different values for the same key.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.municipality_indicator_source_links (
  id uuid primary key default gen_random_uuid(),
  indicator_id uuid not null references public.municipality_indicators(id) on delete cascade,
  source_id text not null references public.data_sources(id) on update cascade on delete restrict,
  source_role text not null default 'primary'
    check (source_role in ('primary', 'input', 'methodology', 'validation', 'context')),
  source_url_snapshot text not null,
  contribution_note text,
  created_at timestamptz not null default now(),
  unique (indicator_id, source_id, source_role),
  check (length(btrim(source_url_snapshot)) > 0)
);

comment on table private.municipality_indicator_source_links is
  'Private provenance links for observations. One observation may depend on multiple source documents. Existing municipality_indicators.source_id remains the primary-source compatibility field.';
comment on column private.municipality_indicator_source_links.source_url_snapshot is
  'Exact URL used for this observation/source relationship; independent from the current canonical data_sources.url.';

create index if not exists municipality_indicator_source_links_source_idx
  on private.municipality_indicator_source_links (source_id, indicator_id);

alter table private.municipality_indicator_source_links enable row level security;
revoke all privileges on table private.municipality_indicator_source_links
  from public, anon, authenticated;
grant select, insert, update, delete on table private.municipality_indicator_source_links
  to service_role;

-- Backfill the current primary source for each existing observation.
-- Idempotent; does not update/delete observations or source catalogue records.
insert into private.municipality_indicator_source_links (
  indicator_id, source_id, source_role, source_url_snapshot, contribution_note
)
select mi.id, mi.source_id, 'primary', mi.source_url,
  'Backfilled from municipality_indicators.source_id/source_url during provenance-layer rollout.'
from public.municipality_indicators mi
where mi.source_id is not null and mi.source_url is not null and btrim(mi.source_url) <> ''
on conflict (indicator_id, source_id, source_role) do nothing;

-- Block repeat imports from the same source; allow other sources to report
-- the same observation key so disagreements remain reviewable.
create unique index if not exists uq_municipality_indicators_source_observation
  on public.municipality_indicators (
    municipality_id, indicator_code, reference_year, reference_period,
    geographic_level, (coalesce(geographic_name, '')), source_id
  );

comment on index public.uq_municipality_indicators_source_observation is
  'Prevents duplicate observations from the same source while allowing cross-source comparisons and disagreements.';
