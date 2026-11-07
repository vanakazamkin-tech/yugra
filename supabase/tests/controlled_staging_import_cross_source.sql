-- Regression: a verified observation from another source must not block a
-- manually accepted staging row. Same-source duplicates must still be blocked.
insert into public.municipality_indicators (
  municipality_id, indicator_code, indicator_name, reference_year,
  reference_period, value, unit, source_id, source_url,
  verification_status, geographic_level, geographic_name
) values (
  'test-municipality', 'cross_source_import_test', 'Cross-source import test',
  2025, 'annual', 10, 'persons', 'src-primary',
  'https://example.test/primary', 'verified', 'municipality', null
);

grant select on public.municipalities, public.data_sources to service_role;
grant select, insert, update on public.municipality_indicators to service_role;
grant select, insert, update on public.municipality_indicator_import_staging to service_role;

insert into public.municipality_indicator_import_staging (
  source_id, source_record_key, raw_record, raw_municipality_name,
  raw_indicator_name, raw_year, raw_period, raw_value, raw_unit,
  mapped_municipality_id, mapped_indicator_code, normalized_value,
  normalized_unit, geographic_level, review_status, reviewed_by, reviewed_at, created_at
) values
  (
    'src-secondary', 'cross-source-accepted', '{}'::jsonb, null,
    'Cross-source import test', 2025, null, '12', 'persons',
    'test-municipality', 'cross_source_import_test', 12, 'persons',
    'municipality', 'accepted', 'qa-test', now(), now() - interval '3 seconds'
  ),
  (
    'src-primary', 'same-source-duplicate', '{}'::jsonb, null,
    'Cross-source import test', 2025, '', '11', 'persons',
    'test-municipality', 'cross_source_import_test', 11, 'persons',
    'municipality', 'accepted', 'qa-test', now(), now() - interval '2 seconds'
  ),
  (
    'src-secondary', 'same-batch-duplicate', '{}'::jsonb, null,
    'Cross-source import test', 2025, 'annual', '13', 'persons',
    'test-municipality', 'cross_source_import_test', 13, 'persons',
    'municipality', 'accepted', 'qa-test', now(), now() - interval '1 second'
  );

set role service_role;
select public.import_accepted_municipality_indicators() as imported_rows;
reset role;

do $assert_import$
declare
  secondary_rows integer;
  accepted_duplicate integer;
  marked_duplicate integer;
  imported_link integer;
begin
  select count(*) into secondary_rows
  from public.municipality_indicators
  where municipality_id = 'test-municipality'
    and indicator_code = 'cross_source_import_test'
    and source_id = 'src-secondary'
    and verification_status = 'verified';
  if secondary_rows <> 1 then
    raise exception 'expected one verified secondary-source observation, got %', secondary_rows;
  end if;

  select count(*) into imported_link
  from public.municipality_indicator_import_staging s
  join public.municipality_indicators mi on mi.id = s.imported_indicator_id
  where s.source_record_key = 'cross-source-accepted'
    and mi.source_id = 'src-secondary'
    and mi.value = 12;
  if imported_link <> 1 then
    raise exception 'accepted cross-source staging row was not linked to its imported observation';
  end if;

  select count(*) into accepted_duplicate
  from public.municipality_indicator_import_staging
  where source_record_key = 'same-source-duplicate'
    and review_status = 'accepted'
    and imported_indicator_id is null;
  if accepted_duplicate <> 1 then
    raise exception 'same-source duplicate should remain unimported for review';
  end if;

  select count(*) into marked_duplicate
  from public.municipality_indicator_import_staging
  where source_record_key = 'same-batch-duplicate'
    and review_status = 'duplicate'
    and 'duplicate_verified_observation' = any(validation_errors);
  if marked_duplicate <> 1 then
    raise exception 'same-batch duplicate was not safely marked duplicate';
  end if;
end
$assert_import$;

select 'controlled staging import cross-source regression passed' as result;
