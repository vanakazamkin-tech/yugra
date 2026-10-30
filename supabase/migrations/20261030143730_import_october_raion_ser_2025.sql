insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,notes)
values
('municipal_ser_october_2025',
 'Администрация Октябрьского района — итоги социально-экономического развития за 2025 год',
 'municipal_official_report',
 'https://oktregion.ru/upload/docs/ekonomika-i-finansy/sotsialno-ekonomicheskoe-azvitie/itogi/Itogi_SER_za_2025.pdf',
 'Официальный годовой доклад администрации; содержит сопоставимые показатели за 2023–2025 годы и отраслевые разделы.',
 'PDF',
 'Октябрьский район; импортирована выборка сопоставимых макроэкономических показателей за 2024–2025 годы и отдельные показатели уровня жизни за 2025 год.',
 'ежегодно',
 'partially_imported',
 'В импорт включены только значения, явно приведённые в докладе. Объём инвестиций за 2025 год в тексте доклада обозначен как рассчитанный по прогнозным данным; это отражено в notes соответствующего наблюдения.')
on conflict (id) do update set
 name=excluded.name, category=excluded.category, url=excluded.url, description=excluded.description,
 format=excluded.format, coverage=excluded.coverage, update_frequency=excluded.update_frequency,
 import_status=excluded.import_status, notes=excluded.notes, updated_at=now();

with source as (select id from public.data_sources where id='municipal_ser_october_2025'),
rows(indicator_code,indicator_name,reference_year,reference_period,value,unit,notes) as (
 values
 ('october_investment_fixed_capital','Объём инвестиций в основной капитал в действующих ценах',2024,'2024',27298.8::numeric,'млн руб.','Значение за 2024 год из сравнительной таблицы официального доклада.'),
 ('october_investment_fixed_capital','Объём инвестиций в основной капитал в действующих ценах',2025,'2025',30016.8::numeric,'млн руб.','Значение за 2025 год рассчитано администрацией по прогнозным данным СЭР; не является окончательной статистической оценкой.'),
 ('october_construction_works','Объём работ по виду деятельности «Строительство» в действующих ценах',2024,'2024',19798.2::numeric,'млн руб.','Сравнительная таблица официального доклада.'),
 ('october_construction_works','Объём работ по виду деятельности «Строительство» в действующих ценах',2025,'2025',20159.1::numeric,'млн руб.','Сравнительная таблица официального доклада.'),
 ('october_retail_turnover','Оборот розничной торговли в действующих ценах',2024,'2024',5327.8::numeric,'млн руб.','Сравнительная таблица официального доклада.'),
 ('october_retail_turnover','Оборот розничной торговли в действующих ценах',2025,'2025',5897.9::numeric,'млн руб.','Сравнительная таблица официального доклада.'),
 ('october_paid_services','Объём реализации платных услуг в действующих ценах',2024,'2024',1754.5::numeric,'млн руб.','Сравнительная таблица официального доклада.'),
 ('october_paid_services','Объём реализации платных услуг в действующих ценах',2025,'2025',2016.1::numeric,'млн руб.','Сравнительная таблица официального доклада.'),
 ('october_agricultural_output','Производство сельскохозяйственной продукции без учёта населения',2024,'2024',242.39::numeric,'млн руб.','Сравнительная таблица официального доклада.'),
 ('october_agricultural_output','Производство сельскохозяйственной продукции без учёта населения',2025,'2025',100.9::numeric,'млн руб.','Сравнительная таблица официального доклада.'),
 ('october_per_capita_income','Среднедушевые денежные доходы населения',2025,'2025',66151.4::numeric,'руб./мес.','Значение в сводной таблице доклада; в тексте рядом приведено округлённое значение 66 151,16 руб.'),
 ('october_average_monthly_wage','Среднемесячная заработная плата',2025,'2025-10-01',142095.0::numeric,'руб.','Срез на 01.10.2025, не годовое среднее; источник доклада с отсылкой к данным Тюменьстата.')
)
insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,reference_period,value,unit,source_id,source_url,verification_status,notes,geographic_level,geographic_name)
select 'october-raion',r.indicator_code,r.indicator_name,r.reference_year,r.reference_period,r.value,r.unit,s.id,
 'https://oktregion.ru/upload/docs/ekonomika-i-finansy/sotsialno-ekonomicheskoe-azvitie/itogi/Itogi_SER_za_2025.pdf',
 'verified',r.notes,'municipality','Октябрьский район'
from rows r cross join source s
where not exists (
 select 1 from public.municipality_indicators x
 where x.municipality_id='october-raion' and x.indicator_code=r.indicator_code
 and x.reference_year=r.reference_year and x.reference_period=r.reference_period
 and x.source_id=s.id
);