-- Harden the staging import contract without mutating existing observations.
-- This forward migration also brings production in line with the repository's
-- cross-source import intent (migration 20261107122134), while adding explicit
-- period, publication/retrieval and exact-URL provenance to each accepted row.
--
-- Staging is currently empty in production. The new fields are nullable for
-- pending/rejected source rows; an accepted row must satisfy the full contract.

alter table public.municipality_indicator_import_staging
  add column if not exists normalized_period text,
  add column if not exists source_url_snapshot text,
  add column if not exists source_published_at date,
  add column if not exists source_retrieved_at timestamptz;

do $accepted_contract$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.municipality_indicator_import_staging'::regclass
      and conname = 'municipality_indicator_import_staging_accepted_contract'
  ) then
    alter table public.municipality_indicator_import_staging
      add constraint municipality_indicator_import_staging_accepted_contract
      check (
        review_status <> 'accepted'
        or (
          nullif(btrim(source_record_key), '') is not null
          and nullif(btrim(raw_municipality_name), '') is not null
          and nullif(btrim(raw_value), '') is not null
          and nullif(btrim(raw_unit), '') is not null
          and nullif(btrim(raw_indicator_code), '') is not null
          and nullif(btrim(mapped_municipality_id), '') is not null
          and nullif(btrim(mapped_indicator_code), '') is not null
          and normalized_value is not null
          and nullif(btrim(normalized_unit), '') is not null
          and raw_year is not null
          and raw_year between 1900 and 2200
          and normalized_period is not null
          and normalized_period ~ '^(annual|[0-9]{4}|[0-9]{4}-Q[1-4]|[0-9]{4}-H[1-2]|[0-9]{4}-(0[1-9]|1[0-2])|[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]))$'
          and case
            when normalized_period ~ '^\d{4}-\d{2}-\d{2}$' then
              extract(year from (
                make_date(
                  substring(normalized_period, 1, 4)::integer,
                  substring(normalized_period, 6, 2)::integer,
                  1
                ) + substring(normalized_period, 9, 2)::integer - 1
              ))::integer = raw_year
              and extract(month from (
                make_date(
                  substring(normalized_period, 1, 4)::integer,
                  substring(normalized_period, 6, 2)::integer,
                  1
                ) + substring(normalized_period, 9, 2)::integer - 1
              ))::integer = substring(normalized_period, 6, 2)::integer
            else true
          end
          and (
            normalized_period = 'annual'
            or left(normalized_period, 4) = raw_year::text
          )
          and geographic_level is not distinct from 'municipality'
          and nullif(btrim(source_url_snapshot), '') is not null
          and source_url_snapshot ~* '^https?://'
          and source_retrieved_at is not null
          and nullif(btrim(reviewed_by), '') is not null
          and reviewed_at is not null
          and coalesce(cardinality(validation_errors), 0) = 0
        )
      );
  end if;
end;
$accepted_contract$;

create or replace view public.municipality_indicator_import_review
with (security_invoker = true)
as
select
  s.id,
  s.source_id,
  s.source_record_key,
  s.raw_record,
  s.raw_municipality_name,
  s.raw_oktmo,
  s.raw_indicator_name,
  s.raw_indicator_code,
  s.raw_year,
  s.raw_period,
  s.raw_value,
  s.raw_unit,
  s.mapped_municipality_id,
  s.mapped_indicator_code,
  s.normalized_value,
  s.normalized_unit,
  s.geographic_level,
  s.review_status,
  s.validation_errors,
  s.reviewed_by,
  s.reviewed_at,
  s.imported_indicator_id,
  s.created_at,
  s.updated_at,
  m.name as matched_municipality_name,
  case
    when s.mapped_municipality_id is null then 'needs_mapping'
    when m.id is null then 'unknown_municipality'
    else 'matched'
  end as municipality_match_status,
  case
    when s.raw_year is null
      or s.raw_year < 1900
      or s.raw_year > extract(year from current_date)::integer + 1
      then 'invalid_year'
    when nullif(btrim(s.raw_municipality_name), '') is null
      then 'missing_municipality_name'
    when nullif(btrim(s.raw_value), '') is null
      then 'missing_value'
    when nullif(btrim(s.raw_unit), '') is null
      then 'missing_raw_unit'
    when s.normalized_value is null
      then 'value_not_normalized'
    when nullif(btrim(s.normalized_unit), '') is null
      then 'missing_normalized_unit'
    when nullif(btrim(s.normalized_period), '') is null
      then 'needs_period_mapping'
    when s.normalized_period !~ '^(annual|[0-9]{4}|[0-9]{4}-Q[1-4]|[0-9]{4}-H[1-2]|[0-9]{4}-(0[1-9]|1[0-2])|[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]))$'
      or (
        s.normalized_period <> 'annual'
        and left(s.normalized_period, 4) <> s.raw_year::text
      )
      or case
        when s.normalized_period ~ '^\d{4}-\d{2}-\d{2}$' then
          extract(year from (
            make_date(
              substring(s.normalized_period, 1, 4)::integer,
              substring(s.normalized_period, 6, 2)::integer,
              1
            ) + substring(s.normalized_period, 9, 2)::integer - 1
          ))::integer <> s.raw_year
          or extract(month from (
            make_date(
              substring(s.normalized_period, 1, 4)::integer,
              substring(s.normalized_period, 6, 2)::integer,
              1
            ) + substring(s.normalized_period, 9, 2)::integer - 1
          ))::integer <> substring(s.normalized_period, 6, 2)::integer
        else false
      end
      then 'invalid_normalized_period'
    when nullif(btrim(s.source_record_key), '') is null
      then 'missing_source_record_key'
    when nullif(btrim(s.mapped_indicator_code), '') is null
      then 'needs_indicator_mapping'
    when s.geographic_level is distinct from 'municipality'
      then 'wrong_geographic_level'
    when m.id is null
      then 'unknown_municipality'
    when nullif(btrim(s.source_url_snapshot), '') is null
      or s.source_url_snapshot !~* '^https?://'
      then 'missing_or_invalid_source_url'
    when s.source_retrieved_at is null
      then 'missing_retrieval_timestamp'
    when nullif(btrim(s.reviewed_by), '') is null
      or s.reviewed_at is null
      then 'missing_manual_review'
    when coalesce(cardinality(s.validation_errors), 0) > 0
      then 'validation_errors_present'
    when exists (
      select 1
      from public.municipality_indicators mi
      where mi.municipality_id = s.mapped_municipality_id
        and mi.indicator_code = s.mapped_indicator_code
        and mi.reference_year = s.raw_year
        and mi.reference_period = s.normalized_period
        and mi.unit = s.normalized_unit
        and mi.geographic_level = 'municipality'
        and mi.geographic_name = m.name
        and mi.source_id = s.source_id
    ) then 'possible_same_source_duplicate'
    else 'ready_for_manual_review'
  end as automated_review_result,
  s.normalized_period,
  s.source_url_snapshot,
  s.source_published_at,
  s.source_retrieved_at
from public.municipality_indicator_import_staging s
left join public.municipalities m
  on m.id = s.mapped_municipality_id;

comment on view public.municipality_indicator_import_review is
  'Read-only staging preflight. Duplicate identity matches municipality, indicator, year, normalized period, unit, geography name and source. Different source records remain comparable; no row is auto-approved.';

create or replace function public.import_accepted_municipality_indicators(p_source_id text default null)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row record;
  v_inserted integer := 0;
  v_id uuid;
begin
  for v_row in
    select s.*, m.name as canonical_municipality_name
    from public.municipality_indicator_import_staging s
    join public.municipalities m
      on m.id = s.mapped_municipality_id
    where s.review_status = 'accepted'
      and s.reviewed_at is not null
      and nullif(btrim(s.reviewed_by), '') is not null
      and coalesce(cardinality(s.validation_errors), 0) = 0
      and nullif(btrim(s.source_record_key), '') is not null
      and s.normalized_value is not null
      and nullif(btrim(s.mapped_indicator_code), '') is not null
      and nullif(btrim(s.normalized_unit), '') is not null
      and s.raw_year between 1900 and extract(year from current_date)::integer + 1
      and s.normalized_period ~ '^(annual|[0-9]{4}|[0-9]{4}-Q[1-4]|[0-9]{4}-H[1-2]|[0-9]{4}-(0[1-9]|1[0-2])|[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]))$'
      and case
        when s.normalized_period ~ '^\d{4}-\d{2}-\d{2}$' then
          extract(year from (
            make_date(
              substring(s.normalized_period, 1, 4)::integer,
              substring(s.normalized_period, 6, 2)::integer,
              1
            ) + substring(s.normalized_period, 9, 2)::integer - 1
          ))::integer = s.raw_year
          and extract(month from (
            make_date(
              substring(s.normalized_period, 1, 4)::integer,
              substring(s.normalized_period, 6, 2)::integer,
              1
            ) + substring(s.normalized_period, 9, 2)::integer - 1
          ))::integer = substring(s.normalized_period, 6, 2)::integer
        else true
      end
      and (
        s.normalized_period = 'annual'
        or left(s.normalized_period, 4) = s.raw_year::text
      )
      and nullif(btrim(s.source_url_snapshot), '') is not null
      and s.source_url_snapshot ~* '^https?://'
      and s.source_retrieved_at is not null
      and s.geographic_level = 'municipality'
      and (p_source_id is null or s.source_id = p_source_id)
      and s.imported_indicator_id is null
      and not exists (
        select 1
        from public.municipality_indicators mi
        where mi.municipality_id = s.mapped_municipality_id
          and mi.indicator_code = s.mapped_indicator_code
          and mi.reference_year = s.raw_year
          and mi.reference_period = s.normalized_period
          and mi.unit = s.normalized_unit
          and mi.geographic_level = 'municipality'
          and mi.geographic_name = m.name
          and mi.source_id = s.source_id
        )
    order by s.created_at, s.id
    for update of s skip locked
  loop
    insert into public.municipality_indicators (
      municipality_id,
      indicator_code,
      indicator_name,
      reference_year,
      value,
      unit,
      source_id,
      source_url,
      source_published_at,
      retrieved_at,
      verification_status,
      notes,
      geographic_level,
      geographic_name,
      reference_period
    )
    select
      v_row.mapped_municipality_id,
      v_row.mapped_indicator_code,
      coalesce(nullif(btrim(v_row.raw_indicator_name), ''), v_row.mapped_indicator_code),
      v_row.raw_year,
      v_row.normalized_value,
      v_row.normalized_unit,
      v_row.source_id,
      v_row.source_url_snapshot,
      v_row.source_published_at,
      v_row.source_retrieved_at,
      'verified',
      concat_ws(E'\n',
        'Импортировано из staging после ручного подтверждения.',
        'Исходная запись: ' || v_row.source_record_key,
        'Период нормализован вручную в staging: ' || v_row.normalized_period,
        'Исходное название МО в источнике: ' || v_row.raw_municipality_name,
        'Каноническое название МО в справочнике: ' || v_row.canonical_municipality_name
      ),
      'municipality',
      v_row.canonical_municipality_name,
      v_row.normalized_period
    from public.data_sources ds
    where ds.id = v_row.source_id
    on conflict do nothing
    returning id into v_id;

    if v_id is not null then
      -- Preserve a private, immutable URL snapshot for the primary source.
      insert into private.municipality_indicator_source_links (
        indicator_id,
        source_id,
        source_role,
        source_url_snapshot,
        contribution_note
      )
      values (
        v_id,
        v_row.source_id,
        'primary',
        v_row.source_url_snapshot,
        'Primary source URL copied from the reviewed staging row at import time.'
      )
      on conflict (indicator_id, source_id, source_role) do nothing;

      -- The source catalogue records the latest known retrieval event.
      update public.data_sources
      set retrieved_at = greatest(
            coalesce(retrieved_at, v_row.source_retrieved_at),
            v_row.source_retrieved_at
          ),
          updated_at = now()
      where id = v_row.source_id;

      update public.municipality_indicator_import_staging
      set imported_indicator_id = v_id,
          updated_at = now()
      where id = v_row.id;

      v_inserted := v_inserted + 1;
      v_id := null;
    else
      -- Same-source duplicates can arise from multiple accepted rows in one batch.
      -- Keep them out of analytics and preserve the audit reason.
      update public.municipality_indicator_import_staging
      set review_status = 'duplicate',
          validation_errors = array_append(validation_errors, 'duplicate_verified_observation'),
          updated_at = now()
      where id = v_row.id;
    end if;
  end loop;
  return v_inserted;
end;
$$;

revoke all on function public.import_accepted_municipality_indicators(text)
  from public, anon, authenticated;
grant execute on function public.import_accepted_municipality_indicators(text)
  to service_role;

comment on function public.import_accepted_municipality_indicators(text) is
  'Controlled import. Requires an explicitly normalized period, exact source URL, actual retrieval timestamp, empty validation error list and manual reviewer identity. Uses the full same-source observation identity; preserves cross-source values and writes a private primary provenance link. Execute only from trusted service_role.';
