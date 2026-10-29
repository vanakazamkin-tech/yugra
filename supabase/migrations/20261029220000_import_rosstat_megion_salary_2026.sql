insert into public.municipality_indicators
 (municipality_id,indicator_code,indicator_name,reference_year,reference_period,value,unit,source_id,source_url,verification_status,notes,geographic_level,geographic_name)
values
 ('megion','average_monthly_salary_q1','Среднемесячная заработная плата работников организаций (без субъектов малого предпринимательства), всего по обследуемым видам экономической деятельности',2026,'2026-Q1',146001.8,'руб.','rosstat_passport_megion','https://rosstat.gov.ru/scripts/db_inet2/passport/table.aspx?opt=718730002026','verified','Росстат, муниципальный паспорт Мегиона, январь–март 2026 года. Среднемесячная начисленная заработная плата работников организаций без субъектов малого предпринимательства.','municipality','Мегион'),
 ('megion','average_monthly_salary_h1','Среднемесячная заработная плата работников организаций (без субъектов малого предпринимательства), всего по обследуемым видам экономической деятельности',2026,'2026-H1',142942.5,'руб.','rosstat_passport_megion','https://rosstat.gov.ru/scripts/db_inet2/passport/table.aspx?opt=718730002026','verified','Росстат, муниципальный паспорт Мегиона, январь–июнь 2026 года. Среднемесячная начисленная заработная плата работников организаций без субъектов малого предпринимательства.','municipality','Мегион')
on conflict (municipality_id,indicator_code,reference_year,reference_period,source_id) do update set
 indicator_name=excluded.indicator_name,value=excluded.value,unit=excluded.unit,source_url=excluded.source_url,
 retrieved_at=now(),verification_status=excluded.verification_status,notes=excluded.notes,
 geographic_level=excluded.geographic_level,geographic_name=excluded.geographic_name,updated_at=now();
