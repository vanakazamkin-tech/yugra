insert into public.forecast_scenarios
  (key,title,summary,investment_growth_rate,sme_growth_rate,score_growth_rate,uncertainty_rate,display_order,is_active,export_shock_pct,cost_pressure_pct,labor_shortage_pct)
values
 ('cautious','Стрессовый','Неблагоприятный сценарий: снижение экспортной выручки, усиление санкционных ограничений, рост издержек предприятий и дефицит кадров.',-8,-4,-3,18,1,true,-10,8,6),
 ('base','Базовый','Продолжение наблюдаемых тенденций при сохранении текущих внешних и внутренних условий.',4,3,1.5,7,2,true,0,0,0),
 ('ambitious','Оптимистичный','Улучшение инвестиционной активности, расширение занятости и реализация мер поддержки при доступности ресурсов.',8,6,3,12,3,true,4,-2,-2)
on conflict (key) do update set
 title=excluded.title, summary=excluded.summary,
 investment_growth_rate=excluded.investment_growth_rate,
 sme_growth_rate=excluded.sme_growth_rate,
 score_growth_rate=excluded.score_growth_rate,
 uncertainty_rate=excluded.uncertainty_rate,
 display_order=excluded.display_order, is_active=excluded.is_active,
 export_shock_pct=excluded.export_shock_pct, cost_pressure_pct=excluded.cost_pressure_pct,
 labor_shortage_pct=excluded.labor_shortage_pct, updated_at=now();

alter table public.municipal_investment_projects enable row level security;
alter table public.municipal_industrial_enterprises enable row level security;

drop policy if exists "Public can read verified municipal investment projects" on public.municipal_investment_projects;
create policy "Public can read verified municipal investment projects"
  on public.municipal_investment_projects for select to anon, authenticated
  using (verification_status = 'verified');
drop policy if exists "Public can read verified municipal industrial enterprises" on public.municipal_industrial_enterprises;
create policy "Public can read verified municipal industrial enterprises"
  on public.municipal_industrial_enterprises for select to anon, authenticated
  using (verification_status = 'verified');
drop policy if exists "Public read municipal infrastructure objects" on public.municipal_infrastructure_objects;
create policy "Public read municipal infrastructure objects"
  on public.municipal_infrastructure_objects for select to anon, authenticated
  using (verification_status = 'verified');

grant select on public.municipal_investment_projects to anon, authenticated;
grant select on public.municipal_industrial_enterprises to anon, authenticated;
grant select on public.municipal_infrastructure_objects to anon, authenticated;
revoke insert, update, delete on public.municipal_investment_projects from anon, authenticated;
revoke insert, update, delete on public.municipal_industrial_enterprises from anon, authenticated;
revoke insert, update, delete on public.municipal_infrastructure_objects from anon, authenticated;
