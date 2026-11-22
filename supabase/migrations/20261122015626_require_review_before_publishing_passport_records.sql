alter table public.municipal_investment_projects
  alter column verification_status set default 'needs_review';
alter table public.municipal_industrial_enterprises
  alter column verification_status set default 'needs_review';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'municipal_investment_projects_verification_status_check'
      and conrelid = 'public.municipal_investment_projects'::regclass
  ) then
    alter table public.municipal_investment_projects
      add constraint municipal_investment_projects_verification_status_check
      check (verification_status in ('verified', 'needs_review'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'municipal_industrial_enterprises_verification_status_check'
      and conrelid = 'public.municipal_industrial_enterprises'::regclass
  ) then
    alter table public.municipal_industrial_enterprises
      add constraint municipal_industrial_enterprises_verification_status_check
      check (verification_status in ('verified', 'needs_review'));
  end if;
end
$$;
