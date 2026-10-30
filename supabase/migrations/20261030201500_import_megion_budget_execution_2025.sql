insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,notes)
values
('megion_budget_execution_2025',
 'Дума города Мегиона — решение № 85 об исполнении бюджета за 2025 год',
 'municipal_budget_execution',
 'https://megion24.ru/laws/?ELEMENT_ID=16305',
 'Решение Думы города Мегиона от 24.04.2026 № 85 «Об исполнении бюджета городского округа Мегион за 2025 год», опубликовано 06.05.2026. Материалы Департамента финансов содержат расшифровку доходов.',
 'PDF/HTML',
 'Городской округ Мегион; исполнение местного бюджета за 2025 год',
 'annual',
 'imported',
 'Утверждённые итоговые значения: доходы 8 284 953,3 тыс. руб., расходы 8 369 187,8 тыс. руб., дефицит 84 234,5 тыс. руб. Подробная расшифровка доходов опубликована Департаментом финансов 08.07.2026: https://depfin.admmegion.ru/budcitizen/8780/.'
)
on conflict (id) do update set
 name=excluded.name,category=excluded.category,url=excluded.url,
 description=excluded.description,format=excluded.format,coverage=excluded.coverage,
 update_frequency=excluded.update_frequency,import_status=excluded.import_status,
 notes=excluded.notes,updated_at=now();

with src as (select id from public.data_sources where id='megion_budget_execution_2025'),
mo as (select id from public.municipalities where id='megion'),
rows(indicator_code,indicator_name,value,notes) as (
 values
 ('local_budget_revenue_reported','Доходы местного бюджета',8284953300::numeric,'Исполнение бюджета за 2025 год: 8 284 953,3 тыс. руб.; 99,2% уточнённого плана.'),
 ('local_budget_expenditure_reported','Расходы местного бюджета',8369187800::numeric,'Исполнение бюджета за 2025 год: 8 369 187,8 тыс. руб.'),
 ('local_budget_deficit_reported','Дефицит местного бюджета',84234500::numeric,'Исполнение бюджета за 2025 год: дефицит 84 234,5 тыс. руб.'),
 ('local_budget_tax_revenue','Налоговые доходы местного бюджета',2161533400::numeric,'Налоговые доходы за 2025 год: 2 161 533,4 тыс. руб.; 102,5% годового плана.'),
 ('local_budget_nontax_revenue','Неналоговые доходы местного бюджета',329598800::numeric,'Неналоговые доходы за 2025 год: 329 598,8 тыс. руб.; 102,8% уточнённого плана.'),
 ('local_budget_own_revenue','Собственные доходы местного бюджета (налоговые и неналоговые)',2491132200::numeric,'Собственные доходы за 2025 год: 2 491 132,2 тыс. руб.; 102,5% годового плана.'),
 ('local_budget_transfers','Безвозмездные поступления из вышестоящих бюджетов',5793821100::numeric,'Безвозмездные поступления из вышестоящих бюджетов за 2025 год: 5 793 821,1 тыс. руб.')
)
insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,value,unit,source_id,source_url,source_published_at,retrieved_at,verification_status,notes,geographic_level,geographic_name,reference_period)
select mo.id,rows.indicator_code,rows.indicator_name,2025,rows.value,'руб.',src.id,
'https://megion24.ru/laws/?ELEMENT_ID=16305',date '2026-05-06',now(),'verified',rows.notes,
'municipality','Мегион','annual'
from rows cross join src cross join mo
where not exists (
 select 1 from public.municipality_indicators old
 where old.municipality_id=mo.id and old.indicator_code=rows.indicator_code
 and old.reference_year=2025 and coalesce(old.reference_period,'annual')='annual'
);
