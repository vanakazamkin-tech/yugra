insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,notes)
values
('hmrn_budget_execution_2025',
 'Дума Ханты-Мансийского района — решение № 760 об исполнении бюджета за 2025 год',
 'municipal_budget_execution',
 'https://hmrn.ru/duma/docduma/428/',
 'Решение Думы Ханты-Мансийского района от 29.05.2026 № 760 «Об исполнении бюджета Ханты-Мансийского района за 2025 год». Числа также приведены в протоколе публичных слушаний от 06.04.2026, опубликованном в газете «Наш район» 10.04.2026.',
 'PDF/ZIP',
 'Ханты-Мансийский район; исполнение районного бюджета за 2025 год',
 'annual',
 'imported',
 'Итоговые суммы исполнения: доходы 6 271 000,8 тыс. руб., расходы 6 248 298,5 тыс. руб., профицит 22 702,3 тыс. руб. Не смешивать с консолидированными бюджетами сельских поселений.'
)
on conflict (id) do update set
 name=excluded.name,category=excluded.category,url=excluded.url,
 description=excluded.description,format=excluded.format,coverage=excluded.coverage,
 update_frequency=excluded.update_frequency,import_status=excluded.import_status,
 notes=excluded.notes,updated_at=now();

with src as (select id from public.data_sources where id='hmrn_budget_execution_2025'),
mo as (select id from public.municipalities where id='khanty-mansiysky-raion'),
rows(indicator_code,indicator_name,value,notes) as (
 values
 ('local_budget_revenue_reported','Доходы местного бюджета',6271000800::numeric,'Исполнение районного бюджета за 2025 год: 6 271 000,8 тыс. руб.; 102,0% уточнённого плана.'),
 ('local_budget_expenditure_reported','Расходы местного бюджета',6248298500::numeric,'Исполнение районного бюджета за 2025 год: 6 248 298,5 тыс. руб.; 88,4% уточнённого плана.'),
 ('local_budget_surplus_reported','Профицит местного бюджета',22702300::numeric,'Исполнение районного бюджета за 2025 год: профицит 22 702,3 тыс. руб.')
)
insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,value,unit,source_id,source_url,source_published_at,retrieved_at,verification_status,notes,geographic_level,geographic_name,reference_period)
select mo.id,rows.indicator_code,rows.indicator_name,2025,rows.value,'руб.',src.id,
'https://gazeta-hmrn.ru/images/PDF2026/142026.pdf',date '2026-05-29',now(),'verified',rows.notes,
'municipality','Ханты-Мансийский район','annual'
from rows cross join src cross join mo
where not exists (
 select 1 from public.municipality_indicators old
 where old.municipality_id=mo.id and old.indicator_code=rows.indicator_code
 and old.reference_year=2025 and coalesce(old.reference_period,'annual')='annual'
);
