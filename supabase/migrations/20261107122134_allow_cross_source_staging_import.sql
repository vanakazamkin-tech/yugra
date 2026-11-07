-- Keep the controlled staging importer aligned with the full observation identity.
-- A verified observation from another source is not a duplicate: preserve it so
-- independent source values can be compared and reviewed side by side.
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
    select s.*
    from public.municipality_indicator_import_staging s
    join public.municipalities m on m.id = s.mapped_municipality_id
    where s.review_status = 'accepted'
      and s.reviewed_at is not null
      and s.normalized_value is not null
      and nullif(btrim(s.mapped_indicator_code), '') is not null
      and nullif(btrim(s.normalized_unit), '') is not null
      and s.raw_year between 1900 and extract(year from current_date)::int + 1
      and s.geographic_level = 'municipality'
      and (p_source_id is null or s.source_id = p_source_id)
      and s.imported_indicator_id is null
      and not exists (
        select 1
        from public.municipality_indicators mi
        where mi.municipality_id = s.mapped_municipality_id
          and mi.indicator_code = s.mapped_indicator_code
          and mi.reference_year = s.raw_year
          and mi.reference_period = coalesce(nullif(s.raw_period, ''), 'annual')
          and mi.unit = s.normalized_unit
          and mi.verification_status = 'verified'
          and mi.geographic_level = 'municipality'
          and coalesce(mi.geographic_name, '') = coalesce(s.raw_municipality_name, '')
          and mi.source_id = s.source_id
      )
    order by s.created_at, s.id
    for update of s skip locked
  loop
    insert into public.municipality_indicators (
      municipality_id, indicator_code, indicator_name, reference_year,
      value, unit, source_id, source_url, verification_status,
      notes, geographic_level, geographic_name, reference_period
    )
    select
      v_row.mapped_municipality_id,
      v_row.mapped_indicator_code,
      coalesce(nullif(btrim(v_row.raw_indicator_name), ''), v_row.mapped_indicator_code),
      v_row.raw_year,
      v_row.normalized_value,
      v_row.normalized_unit,
      v_row.source_id,
      ds.url,
      'verified',
      concat_ws(E'\\n',
        'Импортировано из staging после ручного подтверждения.',
        'Исходная запись: ' || coalesce(v_row.source_record_key, v_row.id::text),
        nullif(array_to_string(v_row.validation_errors, '; '), '')
      ),
      'municipality',
      v_row.raw_municipality_name,
      coalesce(nullif(v_row.raw_period, ''), 'annual')
    from public.data_sources ds
    where ds.id = v_row.source_id
    on conflict do nothing
    returning id into v_id;

    if v_id is not null then
      update public.municipality_indicator_import_staging
      set imported_indicator_id = v_id,
          updated_at = now()
      where id = v_row.id;
      v_inserted := v_inserted + 1;
      v_id := null;
    else
      -- A duplicate can still arise from another accepted staging row in the
      -- same batch. Keep the row out of the import queue and preserve the audit.
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

revoke all on function public.import_accepted_municipality_indicators(text) from public, anon, authenticated;
grant execute on function public.import_accepted_municipality_indicators(text) to service_role;
comment on function public.import_accepted_municipality_indicators(text) is
 'Controlled import: only manually accepted, reviewed, normalized, municipality-level staging rows are inserted as verified. Duplicate detection uses the full source observation identity so different sources can coexist; execute only from trusted service role.';
