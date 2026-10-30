-- Import the reported 2023 migration balance for Khanty-Mansiysk from the official 2025-2027 SER forecast table.
-- Only the 2023 column is a report. 2024 is an estimate and 2025-2027 are forecasts; they are intentionally excluded.

insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,last_checked_at,notes)
values
('khanty_mansiysk_ser_forecast_2025_2027',
 'Администрация Ханты-Мансийска — прогноз СЭР на 2025–2027 годы, фактические итоги 2023 года',
 'municipal_official_report',
 'https://admhmansy.ru/upload/17.%20%D0%9F%D1%80%D0%BE%D0%B3%D0%BD%D0%BE%D0%B7%20%D0%A1%D0%AD%D0%A0%202025-2027.pdf',
 'Официальный прогноз социально-экономического развития города Ханты-Мансийска на 2025–2027 годы; таблица 2 отдельно содержит отчётные значения за 2022 и 2023 годы.',
 'pdf',
 'Ханты-Мансийск, 2023–2027',
 'annual',
 'partially_imported',
 now(),
 'Импортировано только отчётное значение за 2023 год. Оценка за 2024 год и прогнозы 2025–2027 годов не импортированы как фактические наблюдения.')
on conflict(id) do update set
 name=excluded.name,url=excluded.url,description=excluded.description,
 import_status='partially_imported',last_checked_at=now(),notes=excluded.notes;

insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,value,unit,source_id,source_url,retrieved_at,verification_status,notes,geographic_level,geographic_name,reference_period)
select m.id,'migration_net_total','Миграционный прирост (сальдо), всего',2023,1357,'человек',
 'khanty_mansiysk_ser_forecast_2025_2027',
 'https://admhmansy.ru/upload/17.%20%D0%9F%D1%80%D0%BE%D0%B3%D0%BD%D0%BE%D0%B7%20%D0%A1%D0%AD%D0%A0%202025-2027.pdf',
 now(),'verified',
 'Отчётное значение за 2023 год в таблице 2 официального прогноза СЭР. Оценка за 2024 год и прогнозы за 2025–2027 годы исключены.',
 'municipality','Ханты-Мансийск','annual'
from public.municipalities m
where m.name='Ханты-Мансийск'
and not exists(select 1 from public.municipality_indicators x
 where x.municipality_id=m.id and x.indicator_code='migration_net_total'
 and x.reference_year=2023 and coalesce(x.reference_period,'annual')='annual');
