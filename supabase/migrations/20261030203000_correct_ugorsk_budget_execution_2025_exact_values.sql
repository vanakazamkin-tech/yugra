insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,notes)
values
('ugorsk_budget_execution_2025',
 'Дума города Югорска — решение № 36 об исполнении бюджета за 2025 год',
 'municipal_budget_execution',
 'https://ugorsk.ru/resheniya-dumy-goroda-yugorska-2026/',
 'Решение Думы города Югорска от 28.04.2026 № 36 «Об исполнении бюджета города Югорска за 2025 год», опубликовано 30.04.2026.',
 'PDF',
 'Город Югорск; исполнение местного бюджета за 2025 год',
 'annual',
 'imported',
 'Окончательные суммы по официальному решению: доходы 7 985 228 861,27 руб., расходы 8 216 170 778,34 руб., дефицит 230 941 917,07 руб. Источник PDF: https://adm.ugorsk.ru/upload/iblock/a4d/lc9lirm1zh2ioaebuveju3szaxm0qlnx/01%20Решение%20Думы%20г.%20Югорска%20об%20исполнении%20бюджета%20от%2028.04.2026%20№%2036.pdf.'
)
on conflict (id) do update set
 name=excluded.name,category=excluded.category,url=excluded.url,
 description=excluded.description,format=excluded.format,coverage=excluded.coverage,
 update_frequency=excluded.update_frequency,import_status=excluded.import_status,
 notes=excluded.notes,updated_at=now();

update public.municipality_indicators
set value=7985228861.27,
    unit='руб.',
    source_id='ugorsk_budget_execution_2025',
    source_url='https://ugorsk.ru/resheniya-dumy-goroda-yugorska-2026/',
    source_published_at=date '2026-04-30',
    notes='Окончательное исполнение бюджета за 2025 год по решению Думы города Югорска от 28.04.2026 № 36: доходы 7 985 228 861,27 руб.'
where municipality_id='ugorsk' and reference_year=2025 and indicator_code='local_budget_revenue_reported';

update public.municipality_indicators
set value=8216170778.34,
    unit='руб.',
    source_id='ugorsk_budget_execution_2025',
    source_url='https://ugorsk.ru/resheniya-dumy-goroda-yugorska-2026/',
    source_published_at=date '2026-04-30',
    notes='Окончательное исполнение бюджета за 2025 год по решению Думы города Югорска от 28.04.2026 № 36: расходы 8 216 170 778,34 руб.'
where municipality_id='ugorsk' and reference_year=2025 and indicator_code='local_budget_expenditure_reported';

update public.municipality_indicators
set value=230941917.07,
    unit='руб.',
    source_id='ugorsk_budget_execution_2025',
    source_url='https://ugorsk.ru/resheniya-dumy-goroda-yugorska-2026/',
    source_published_at=date '2026-04-30',
    notes='Окончательное исполнение бюджета за 2025 год по решению Думы города Югорска от 28.04.2026 № 36: дефицит 230 941 917,07 руб.'
where municipality_id='ugorsk' and reference_year=2025 and indicator_code='local_budget_deficit_reported';
