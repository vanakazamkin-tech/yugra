-- Import factual 2019-2022 migration balance for Khanty-Mansiysk from the city's official activity report.
-- The 2023 figure in that document is explicitly an expected value and is intentionally excluded.

insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,last_checked_at,notes)
values
('khanty_mansiysk_migration_2019_2022',
 'Администрация Ханты-Мансийска — отчёт о результатах деятельности за 2023 год, демографический раздел',
 'municipal_official_report',
 'https://xn----ctbsrbgbyj6a.xn--p1ai/upload/iblock/8c7/ov8lmpi7m8mu9k12wkd7o0lkwz3gw7gc.pdf',
 'Официальный отчёт о результатах деятельности органов местного самоуправления Ханты-Мансийска, опубликованный в газете «Самарово» 06.12.2024; содержит сальдо миграции за 2019–2022 годы.',
 'pdf',
 'Ханты-Мансийск, 2019–2022',
 'annual',
 'partially_imported',
 now(),
 'Импортированы только фактические значения 2019–2022 годов. Указанное в том же документе значение за 2023 год было ожидаемым и не импортировано как факт.')
on conflict(id) do update set
 name=excluded.name,url=excluded.url,description=excluded.description,
 import_status='partially_imported',last_checked_at=now(),notes=excluded.notes;

insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,value,unit,source_id,source_url,retrieved_at,verification_status,notes,geographic_level,geographic_name,reference_period)
select m.id,'migration_net_total','Миграционный прирост (сальдо), всего',v.year,v.value,'человек',
 'khanty_mansiysk_migration_2019_2022',
 'https://xn----ctbsrbgbyj6a.xn--p1ai/upload/iblock/8c7/ov8lmpi7m8mu9k12wkd7o0lkwz3gw7gc.pdf',
 now(),'verified',v.notes,'municipality','Ханты-Мансийск','annual'
from public.municipalities m
cross join (values
 (2019,1374::numeric,'Фактическое сальдо миграции за 2019 год по отчёту администрации города.'),
 (2020,1007::numeric,'Фактическое сальдо миграции за 2020 год по отчёту администрации города.'),
 (2021,2338::numeric,'Фактическое сальдо миграции за 2021 год по отчёту администрации города.'),
 (2022,373::numeric,'Фактическое сальдо миграции за 2022 год по отчёту администрации города.')
) as v(year,value,notes)
where m.name='Ханты-Мансийск'
and not exists(select 1 from public.municipality_indicators x
 where x.municipality_id=m.id and x.indicator_code='migration_net_total' and x.reference_year=v.year
 and coalesce(x.reference_period,'annual')='annual');
