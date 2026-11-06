-- Add explicit source provenance metadata without fabricating legacy values.
-- Nullable fields allow gradual enrichment after each document is actually checked.

alter table public.data_sources
  add column if not exists data_owner text,
  add column if not exists temporal_coverage text,
  add column if not exists data_type text,
  add column if not exists access_restrictions text,
  add column if not exists retrieved_at timestamptz;

comment on column public.data_sources.data_owner is
  'Organization responsible for publishing or maintaining the dataset; leave NULL until verified.';
comment on column public.data_sources.temporal_coverage is
  'Exact period or years covered by the source document/dataset; do not infer from import dates.';
comment on column public.data_sources.data_type is
  'Nature of source content, e.g. official observation, administrative report, forecast, analytical rating, or derived dataset.';
comment on column public.data_sources.access_restrictions is
  'Known access, reuse, licensing, or publication restrictions; NULL means not yet checked, not unrestricted.';
comment on column public.data_sources.retrieved_at is
  'Timestamp when this source record/document was actually retrieved; NULL for legacy rows without reliable evidence.';
