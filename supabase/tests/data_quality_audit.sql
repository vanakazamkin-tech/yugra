-- Run against a disposable/staging database after applying migrations.
-- These assertions intentionally inspect existing rows without changing them.
do $$
begin
  if not exists (
    select 1 from information_schema.views
    where table_schema = 'public'
      and table_name = 'municipality_indicator_quality_issues'
  ) then
    raise exception 'quality diagnostics view is missing';
  end if;

  if not exists (
    select 1 from public.municipality_indicator_quality_issues
    where issue_code = 'conflicting_source_values'
      and municipality_id = 'nyagan-city'
      and indicator_code = 'sme_employment_share'
      and reference_year = 2022
  ) then
    raise exception 'known multi-source disagreement is not reported';
  end if;

  if not exists (
    select 1 from public.municipality_indicator_quality_issues
    where issue_code = 'verification_backlog'
  ) then
    raise exception 'unverified observation backlog is not reported';
  end if;

  if exists (
    select 1 from public.municipality_indicator_quality_issues
    where issue_code = 'conflicting_source_values'
      and municipality_id = 'surgut'
      and indicator_code = 'retail_turnover_large_medium_growth_comparable'
  ) then
    raise exception 'legitimate negative growth value was incorrectly classified as a conflict';
  end if;

  if has_table_privilege('anon', 'public.municipality_indicator_quality_issues', 'SELECT')
     or has_table_privilege('authenticated', 'public.municipality_indicator_quality_issues', 'SELECT') then
    raise exception 'quality diagnostics view is exposed to API roles';
  end if;
end;
$$;
