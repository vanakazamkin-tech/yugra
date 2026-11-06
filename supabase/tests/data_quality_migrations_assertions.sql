do $$
declare link_count integer; metadata_count integer;
begin
 if to_regclass('private.municipality_indicator_source_links') is null then raise exception 'provenance table missing'; end if;
 select count(*) into link_count from private.municipality_indicator_source_links;
 if link_count<>1 then raise exception 'expected one backfilled provenance link, got %',link_count; end if;
 if to_regclass('public.municipality_indicators_observation_unique') is not null then raise exception 'legacy unique index remains'; end if;
 if to_regclass('public.uq_municipality_indicators_source_observation') is null then raise exception 'new full unique index missing'; end if;
 select count(*) into metadata_count from information_schema.columns where table_schema='public' and table_name='data_sources'
 and column_name in ('data_owner','temporal_coverage','data_type','access_restrictions','retrieved_at');
 if metadata_count<>5 then raise exception 'expected 5 metadata columns, got %',metadata_count; end if;
 if to_regclass('public.municipality_indicator_quality_issues') is null then raise exception 'quality view missing'; end if;
end $$;
insert into public.municipality_indicators(municipality_id,indicator_code,indicator_name,reference_year,reference_period,value,unit,source_id,source_url,verification_status,geographic_level,geographic_name) values
 ('test-municipality','test_indicator','Test indicator',2025,'annual',11,'thousand persons','src-primary','https://example.test/primary','verified','municipality',null),
 ('test-municipality','test_indicator','Test indicator',2025,'annual',12,'persons','src-primary','https://example.test/primary','verified','settlement','Test settlement'),
 ('test-municipality','test_indicator','Test indicator',2025,'annual',13,'persons','src-secondary','https://example.test/secondary','needs_review','municipality',null);
do $$
begin
 begin
  insert into public.municipality_indicators(municipality_id,indicator_code,indicator_name,reference_year,reference_period,value,unit,source_id,source_url,verification_status,geographic_level,geographic_name)
  values('test-municipality','test_indicator','Test indicator',2025,'annual',99,'persons','src-primary','https://example.test/primary','verified','municipality',null);
  raise exception 'duplicate full identity unexpectedly accepted';
 exception when unique_violation then null;
 end;
end $$;
select 'integration assertions passed' as result;
