alter table public.municipality_indicators
  add column if not exists reference_period text not null default 'annual';

alter table public.municipality_indicators
  drop constraint if exists municipality_indicators_municipality_id_indicator_code_refe_key;

alter table public.municipality_indicators
  add constraint municipality_indicators_observation_unique
  unique (municipality_id, indicator_code, reference_year, reference_period, source_id);

insert into public.data_sources
 (id,name,category,url,description,format,coverage,update_frequency,import_status,notes,last_checked_at)
values
 ('rosstat_passport_kogalym','Росстат — паспорт Когалыма, показатели за I квартал 2026 года','official_statistics',
  'https://rosstat.gov.ru/scripts/db_inet2/passport/table.aspx?opt=718830002026',
  'Показатели социально-экономического состояния городского округа Когалым из базы данных показателей муниципальных образований Росстата. Импортированы квартальные показатели за январь–март 2026 года и регистрационные показатели на 1 апреля 2026 года.',
  'HTML, база показателей муниципальных образований',
  'Городской округ Когалым; I квартал 2026 года','Квартальная/по показателю','partially_imported',
  'Численность работников, фонд оплаты труда, заработная плата, отгрузка и обороты приведены без субъектов малого предпринимательства, если это прямо указано в названии показателя. Регистрационные показатели — значения на 01.04.2026. Не сравнивать с годовыми показателями или рядами, включающими МСП, без нормализации методики.',
  now())
on conflict (id) do update set
 name=excluded.name,category=excluded.category,url=excluded.url,description=excluded.description,
 format=excluded.format,coverage=excluded.coverage,update_frequency=excluded.update_frequency,
 import_status=excluded.import_status,notes=excluded.notes,last_checked_at=now(),updated_at=now();

insert into public.municipality_indicators
 (municipality_id,indicator_code,indicator_name,reference_year,reference_period,value,unit,source_id,source_url,verification_status,notes,geographic_level,geographic_name)
values
 ('kogalym','retail_turnover_q1','Оборот розничной торговли, без субъектов малого предпринимательства',2026,'2026-Q1',3629461.3,'тыс. руб.','rosstat_passport_kogalym','https://rosstat.gov.ru/scripts/db_inet2/passport/table.aspx?opt=718830002026','verified','Росстат, городской округ Когалым; период январь–март 2026 года; показатель по обследуемым видам экономической деятельности, без субъектов малого предпринимательства.','municipality','Когалым'),
 ('kogalym','retail_specialized_food_q1','Розничная торговля пищевыми продуктами, напитками и табачными изделиями в специализированных магазинах',2026,'2026-Q1',357850.7,'тыс. руб.','rosstat_passport_kogalym','https://rosstat.gov.ru/scripts/db_inet2/passport/table.aspx?opt=718830002026','verified','Росстат, городской округ Когалым; период январь–март 2026 года; без субъектов малого предпринимательства, согласно описанию раздела оборота розничной торговли.','municipality','Когалым'),
 ('kogalym','food_service_turnover_q1','Оборот общественного питания, без субъектов малого предпринимательства',2026,'2026-Q1',180925.2,'тыс. руб.','rosstat_passport_kogalym','https://rosstat.gov.ru/scripts/db_inet2/passport/table.aspx?opt=718830002026','verified','Росстат, городской округ Когалым; период январь–март 2026 года.','municipality','Когалым'),
 ('kogalym','average_employees_q1','Среднесписочная численность работников организаций, без субъектов малого предпринимательства',2026,'2026-Q1',25734,'человек','rosstat_passport_kogalym','https://rosstat.gov.ru/scripts/db_inet2/passport/table.aspx?opt=718830002026','verified','Росстат, городской округ Когалым; значение за январь–март 2026 года.','municipality','Когалым'),
 ('kogalym','average_monthly_salary_q1','Среднемесячная заработная плата работников организаций, без субъектов малого предпринимательства',2026,'2026-Q1',155153.5,'руб.','rosstat_passport_kogalym','https://rosstat.gov.ru/scripts/db_inet2/passport/table.aspx?opt=718830002026','verified','Росстат, городской округ Когалым; среднее значение за январь–март 2026 года.','municipality','Когалым'),
 ('kogalym','own_production_shipments_q1','Отгружено товаров собственного производства, выполнено работ и услуг собственными силами, без субъектов малого предпринимательства',2026,'2026-Q1',38707226.6,'тыс. руб.','rosstat_passport_kogalym','https://rosstat.gov.ru/scripts/db_inet2/passport/table.aspx?opt=718830002026','verified','Росстат, городской округ Когалым; период январь–март 2026 года.','municipality','Когалым'),
 ('kogalym','resale_goods_q1','Продано товаров несобственного производства, без субъектов малого предпринимательства',2026,'2026-Q1',8901300.8,'тыс. руб.','rosstat_passport_kogalym','https://rosstat.gov.ru/scripts/db_inet2/passport/table.aspx?opt=718830002026','verified','Росстат, городской округ Когалым; период январь–март 2026 года.','municipality','Когалым'),
 ('kogalym','registered_organizations_2026_04','Количество организаций по данным государственной регистрации на 1 апреля',2026,'2026-04-01',747,'единиц','rosstat_passport_kogalym','https://rosstat.gov.ru/scripts/db_inet2/passport/table.aspx?opt=718830002026','verified','Росстат, городской округ Когалым; моментный показатель на 01.04.2026. Не является числом субъектов МСП.','municipality','Когалым'),
 ('kogalym','registered_individual_entrepreneurs_2026_04','Количество индивидуальных предпринимателей по данным государственной регистрации на 1 апреля',2026,'2026-04-01',1556,'человек','rosstat_passport_kogalym','https://rosstat.gov.ru/scripts/db_inet2/passport/table.aspx?opt=718830002026','verified','Росстат, городской округ Когалым; моментный показатель на 01.04.2026. Не является числом всех субъектов МСП.','municipality','Когалым')
on conflict (municipality_id,indicator_code,reference_year,reference_period,source_id) do update set
 indicator_name=excluded.indicator_name,value=excluded.value,unit=excluded.unit,
 source_url=excluded.source_url,retrieved_at=now(),verification_status=excluded.verification_status,
 notes=excluded.notes,geographic_level=excluded.geographic_level,geographic_name=excluded.geographic_name,
 updated_at=now();
