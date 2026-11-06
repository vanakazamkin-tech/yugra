do $$
declare link_count integer; metadata_count integer;
begin
 if to_regclass('private.municipality_indicator_source_links') is null then raise exception 'provenance table missing'; end if;
 select count(*) into link_count from private.municipality_indicator_source_links;
 if link_count<>1 then raise exception 'expected one backfilled provenance link, got %',link_count; end if;
 if to_regclass('public.municipality_indicators_observation_unique') is not null
    or exists (select 1 from pg_constraint where conrelid='public.municipality_indicators'::regclass and conname='municipality_indicators_observation_unique')
 then raise exception 'legacy unique index/constraint remains'; end if;
 if to_regclass('public.uq_municipality_indicators_source_observation') is null then raise exception 'new full unique index missing'; end if;
 select count(*) into metadata_count from information_schema.columns where table_schema='public' and table_name='data_sources'
 and column_name in ('data_owner','temporal_coverage','data_type','access_restrictions','retrieved_at');
 if metadata_count<>5 then raise exception 'expected 5 metadata columns, got %',metadata_count; end if;
 if to_regclass('public.municipality_indicator_quality_issues') is null then raise exception 'quality view missing'; end if;
end $$;
insert into public.municipality_indicators(municipality_id,indicator_code,indicator_name,reference_year,reference_period,value,unit,source_id,source_url,verification_status,geographic_level,geographic_name) values
 ('test-municipality','test_indicator','Test indicator',2025,'annual',11,'thousand persons','src-primary','https://example.test/primary','verified','municipality',null),
 ('test-municipality','test_indicator','Test indicator',2025,'annual',12,'persons','src-primary','https://example.test/primary','verified','settlement','Test settlement'),
 ('test-municipality','test_indicator','Test indicator',2025,'annual',13,'thousand persons','src-secondary','https://example.test/secondary','needs_review','municipality',null),
 ('test-municipality','test_indicator','Test indicator',2025,'annual',14,'persons','src-secondary','https://example.test/secondary','needs_review','municipality',null);
do $
begin
 if not exists (
   select 1 from public.municipality_indicator_quality_issues
   where issue_code = 'incompatible_source_units'
     and municipality_id = 'test-municipality'
     and indicator_code = 'test_indicator'
 ) then
   raise exception 'cross-source incompatible units are not reported';
 end if;
 begin
  insert into public.municipality_indicators(municipality_id,indicator_code,indicator_name,reference_year,reference_period,value,unit,source_id,source_url,verification_status,geographic_level,geographic_name)
  values('test-municipality','test_indicator','Test indicator',2025,'annual',99,'thousand persons','src-primary','https://example.test/primary','verified','municipality',null);
  raise exception 'duplicate full identity unexpectedly accepted';
 exception when unique_violation then null;
 end;
end $$;
select 'integration assertions passed' as result;

-- Security contract: private provenance stays private to API roles, while
-- service_role retains the intended operational access.
do $$
declare
  private_rls_enabled boolean;
  view_security_invoker boolean;
begin
  if has_schema_privilege('anon', 'private', 'USAGE')
     or has_schema_privilege('authenticated', 'private', 'USAGE') then
    raise exception 'anon/authenticated unexpectedly have USAGE on private schema';
  end if;
  if not has_schema_privilege('service_role', 'private', 'USAGE') then
    raise exception 'service_role is missing USAGE on private schema';
  end if;

  if has_table_privilege('anon', 'private.municipality_indicator_source_links', 'SELECT')
     or has_table_privilege('authenticated', 'private.municipality_indicator_source_links', 'SELECT') then
    raise exception 'anon/authenticated unexpectedly can read private provenance';
  end if;
  if not has_table_privilege('service_role', 'private.municipality_indicator_source_links', 'SELECT')
     or not has_table_privilege('service_role', 'private.municipality_indicator_source_links', 'INSERT')
     or not has_table_privilege('service_role', 'private.municipality_indicator_source_links', 'UPDATE')
     or not has_table_privilege('service_role', 'private.municipality_indicator_source_links', 'DELETE') then
    raise exception 'service_role is missing expected provenance table privileges';
  end if;

  if has_table_privilege('anon', 'public.municipality_indicator_quality_issues', 'SELECT')
     or has_table_privilege('authenticated', 'public.municipality_indicator_quality_issues', 'SELECT') then
    raise exception 'anon/authenticated unexpectedly can read quality diagnostics view';
  end if;
  if not has_table_privilege('service_role', 'public.municipality_indicator_quality_issues', 'SELECT') then
    raise exception 'service_role is missing SELECT on quality diagnostics view';
  end if;

  select c.relrowsecurity into private_rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'private' and c.relname = 'municipality_indicator_source_links';
  if private_rls_enabled is distinct from true then
    raise exception 'RLS is not enabled on private provenance table';
  end if;

  select coalesce(c.reloptions @> array['security_invoker=true'], false)
    into view_security_invoker
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'municipality_indicator_quality_issues';
  if view_security_invoker is distinct from true then
    raise exception 'quality diagnostics view is not security_invoker';
  end if;
end $$;

select 'security and idempotency assertions passed' as result;
