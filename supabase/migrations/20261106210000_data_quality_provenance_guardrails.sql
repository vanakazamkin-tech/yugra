-- Add additive provenance layer and align uniqueness with the full observation identity.
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

-- Preflight the intended full identity before creating its unique index.
-- A failure aborts the migration without deleting or rewriting any observation.
do $$
begin
  if exists (
    select 1
    from public.municipality_indicators
    group by municipality_id, indicator_code, reference_year, reference_period,
      unit, geographic_level, coalesce(geographic_name, ''), source_id
    having count(*) > 1
  ) then
    raise exception 'Cannot install source observation identity index: same-source duplicates exist for the full identity key';
  end if;
end;
$$;

-- Unit and geographic scope are part of the observation identity.
-- Create the complete index first, then remove the older narrower unique index.
-- Keeping the old index would continue rejecting legitimate unit/geography variants.
create unique index if not exists uq_municipality_indicators_source_observation
  on public.municipality_indicators (
    municipality_id, indicator_code, reference_year, reference_period,
    unit, geographic_level, (coalesce(geographic_name, '')), source_id
  );

-- Production has this legacy index owned by a UNIQUE constraint. A plain
-- DROP INDEX fails with dependent-object error in that schema. Keep a fallback
-- for older/test installations where it exists as a standalone index.
do $
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.municipality_indicators'::regclass
      and conname = 'municipality_indicators_observation_unique'
      and contype = 'u'
  ) then
    alter table public.municipality_indicators
      drop constraint municipality_indicators_observation_unique;
  else
    drop index if exists public.municipality_indicators_observation_unique;
  end if;
end;
$;

comment on index public.uq_municipality_indicators_source_observation is
  'Prevents duplicate observations from the same source using the full municipality/indicator/period/unit/geography identity while allowing cross-source comparisons and disagreements.';
