-- Replace rounded preliminary 2025 Yugorsk budget figures with the adopted annual execution report.
-- Source: City Duma decision No. 36 dated 28 April 2026.
-- These are final annual execution values, not forecasts.

insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,last_checked_at,notes)
values
('ugorsk_budget_execution_2025',
 'Дума города Югорска — решение № 36 об исполнении бюджета за 2025 год',
 'municipal_budget_execution',
 'https://admugorsk.ru/upload/iblock/a4d/lc9lirm1zh2ioaebuveju3szaxm0qlnx/01%20Решение%20Думы%20г.%20Югорска%20об%20исполнении%20бюджета%20от%2028.04.2026%20№%2036.pdf',
 'Решение Думы города Югорска от 28.04.2026 № 36, утверждающее годовой отчет об исполнении бюджета за 2025 год.',
 'pdf',
 'Югорск, 2025',
 'annual',
 'imported',
 now(),
 'Итоговые утвержденные значения годового исполнения бюджета; заменяют округленные предварительные показатели из отчета главы города.')
on conflict (id) do update set
 name=excluded.name,url=excluded.url,description=excluded.description,
 import_status='imported',last_checked_at=now(),notes=excluded.notes;

update public.municipality_indicators mi
set value=7985228861.27, source_id='ugorsk_budget_execution_2025',
 source_url='https://admugorsk.ru/upload/iblock/a4d/lc9lirm1zh2ioaebuveju3szaxm0qlnx/01%20Решение%20Думы%20г.%20Югорска%20об%20исполнении%20бюджета%20от%2028.04.2026%20№%2036.pdf',
 retrieved_at=now(),
 notes='Итоговое исполнение бюджета по решению Думы города Югорска от 28.04.2026 № 36; доходы 7 985 228 861,27 руб.'
where mi.indicator_code='local_budget_revenue_reported' and mi.reference_year=2025
and exists(select 1 from public.municipalities m where m.id=mi.municipality_id and m.name='Югорск');

update public.municipality_indicators mi
set value=8216170778.34, source_id='ugorsk_budget_execution_2025',
 source_url='https://admugorsk.ru/upload/iblock/a4d/lc9lirm1zh2ioaebuveju3szaxm0qlnx/01%20Решение%20Думы%20г.%20Югорска%20об%20исполнении%20бюджета%20от%2028.04.2026%20№%2036.pdf',
 retrieved_at=now(),
 notes='Итоговое исполнение бюджета по решению Думы города Югорска от 28.04.2026 № 36; расходы 8 216 170 778,34 руб.'
where mi.indicator_code='local_budget_expenditure_reported' and mi.reference_year=2025
and exists(select 1 from public.municipalities m where m.id=mi.municipality_id and m.name='Югорск');

update public.municipality_indicators mi
set value=230941917.07, source_id='ugorsk_budget_execution_2025',
 source_url='https://admugorsk.ru/upload/iblock/a4d/lc9lirm1zh2ioaebuveju3szaxm0qlnx/01%20Решение%20Думы%20г.%20Югорска%20об%20исполнении%20бюджета%20от%2028.04.2026%20№%2036.pdf',
 retrieved_at=now(),
 notes='Итоговый дефицит бюджета по решению Думы города Югорска от 28.04.2026 № 36; 230 941 917,07 руб.'
where mi.indicator_code='local_budget_deficit_reported' and mi.reference_year=2025
and exists(select 1 from public.municipalities m where m.id=mi.municipality_id and m.name='Югорск');
