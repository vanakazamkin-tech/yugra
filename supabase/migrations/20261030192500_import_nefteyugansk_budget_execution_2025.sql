insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,notes)
values
('nefteyugansk_budget_execution_2025',
 'Дума города Нефтеюганска — решение № 979-VII об исполнении бюджета за 2025 год',
 'municipal_budget_execution',
 'https://www.admugansk.ru/category/1303',
 'Официальный раздел решений об исполнении бюджета; решение Думы города от 29.04.2026 № 979-VII, размещено 30.04.2026.',
 'PDF',
 'Город Нефтеюганск; исполнение местного бюджета за 2025 год',
 'annual',
 'imported',
 'Итоговые утверждённые показатели исполнения бюджета. Источник: решение Думы города Нефтеюганска от 29.04.2026 № 979-VII «Об исполнении бюджета города Нефтеюганска за 2025 год».'
)
on conflict (id) do update set
 name=excluded.name, category=excluded.category, url=excluded.url,
 description=excluded.description, format=excluded.format,
 coverage=excluded.coverage, update_frequency=excluded.update_frequency,
 import_status=excluded.import_status, notes=excluded.notes, updated_at=now();

with src as (select id from public.data_sources where id='nefteyugansk_budget_execution_2025'),
mo as (select id from public.municipalities where id='nefteyugansk'),
rows(indicator_code,indicator_name,value,notes) as (
 values
 ('local_budget_revenue_reported','Доходы местного бюджета',14266004842::numeric,'Итоговое исполнение бюджета за 2025 год; 14 266 004 842 руб. (96,4% плана).'),
 ('local_budget_expenditure_reported','Расходы местного бюджета',14063453205::numeric,'Итоговое исполнение бюджета за 2025 год; 14 063 453 205 руб. (85,9% уточнённого плана).'),
 ('local_budget_surplus_reported','Профицит местного бюджета',202551637::numeric,'Итоговое исполнение бюджета за 2025 год; профицит 202 551 637 руб.')
)
insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,value,unit,source_id,source_url,source_published_at,retrieved_at,verification_status,notes,geographic_level,geographic_name,reference_period)
select mo.id,rows.indicator_code,rows.indicator_name,2025,rows.value,'руб.',src.id,
'https://www.admugansk.ru/category/1303',date '2026-04-29',now(),'verified',rows.notes,
'municipality','Нефтеюганск','annual'
from rows cross join src cross join mo
where not exists (
 select 1 from public.municipality_indicators old
 where old.municipality_id=mo.id and old.indicator_code=rows.indicator_code
 and old.reference_year=2025 and coalesce(old.reference_period,'annual')='annual'
);
