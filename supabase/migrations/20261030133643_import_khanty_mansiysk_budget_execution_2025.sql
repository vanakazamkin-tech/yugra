-- Import final 2025 budget execution for Khanty-Mansiysk.
-- City Duma decision No. 413-VII RD dated 30 April 2026 (signed official text).

insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,last_checked_at,notes)
values
('khanty_mansiysk_budget_execution_2025',
 'Дума города Ханты-Мансийска — решение № 413-VII РД об исполнении бюджета за 2025 год',
 'municipal_budget_execution',
 'https://xn----ctbsrbgbyj6a.xn--p1ai/upload/iblock/fef/1lihh17d78umyf7po68c88p0sc4yfr6m.pdf',
 'Решение Думы города Ханты-Мансийска от 30.04.2026 № 413-VII РД, утверждающее годовой отчёт об исполнении бюджета за 2025 год.',
 'pdf',
 'Ханты-Мансийск, 2025',
 'annual',
 'imported',
 now(),
 'Опубликованный подписанный текст решения: доходы 19 197 791 596,51 руб., расходы 19 267 081 712,68 руб., дефицит 69 290 116,17 руб.')
on conflict(id) do update set
 name=excluded.name,url=excluded.url,description=excluded.description,
 import_status='imported',last_checked_at=now(),notes=excluded.notes;

insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,value,unit,source_id,source_url,retrieved_at,verification_status,notes,geographic_level,geographic_name,reference_period)
select m.id,v.code,v.name,2025,v.value,'руб.',
 'khanty_mansiysk_budget_execution_2025',
 'https://xn----ctbsrbgbyj6a.xn--p1ai/upload/iblock/fef/1lihh17d78umyf7po68c88p0sc4yfr6m.pdf',
 now(),'verified',v.notes,'municipality','Ханты-Мансийск','annual'
from public.municipalities m
cross join (values
 ('local_budget_revenue_reported','Доходы бюджета города по годовому исполнению',19197791596.51::numeric,'Утверждено решением Думы города от 30.04.2026 № 413-VII РД.'),
 ('local_budget_expenditure_reported','Расходы бюджета города по годовому исполнению',19267081712.68::numeric,'Утверждено решением Думы города от 30.04.2026 № 413-VII РД.'),
 ('local_budget_deficit_reported','Дефицит бюджета города по годовому исполнению',69290116.17::numeric,'Дефицит: расходы превысили доходы; утверждено решением Думы города от 30.04.2026 № 413-VII РД.')
) as v(code,name,value,notes)
where m.name='Ханты-Мансийск'
and not exists(select 1 from public.municipality_indicators x
 where x.municipality_id=m.id and x.indicator_code=v.code and x.reference_year=2025
 and coalesce(x.reference_period,'annual')='annual');
