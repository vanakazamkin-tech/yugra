insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,notes)
values
('municipal_forecast_pokachi_2025_2027','Администрация города Покачи — основные показатели прогноза социально-экономического развития на 2025–2027 годы','municipal_official_forecast','https://admpokachi.ru/upload/docs/2024/08/Прогноз%20социально-экономического%20развития%20города%20Покачи%20на%202025%20год%20и%20на%20плановый%20период%202026%20и%202027%20годов.pdf','Официальная таблица администрации с отчётными показателями за 2022–2023 годы, оценкой 2024 года и сценарным прогнозом на 2025–2027 годы.','PDF','Город Покачи; импортированы только исторические отчётные колонки 2022–2023 и отдельно маркированная оценка 2024 года.','ежегодно','partially_imported','Колонки 2022 и 2023 обозначены как отчёт, 2024 — оценка показателя, 2025–2027 — прогноз с консервативным и базовым сценариями. Прогнозные сценарии в фактические наблюдения не импортированы.')
on conflict (id) do update set name=excluded.name,category=excluded.category,url=excluded.url,description=excluded.description,format=excluded.format,coverage=excluded.coverage,update_frequency=excluded.update_frequency,import_status=excluded.import_status,notes=excluded.notes,updated_at=now();
with source as (select id from public.data_sources where id='municipal_forecast_pokachi_2025_2027'),
rows(indicator_code,indicator_name,unit,v2022,v2023,v2024,notes) as (
 values
 ('pokachi_population_average','Среднегодовая численность постоянного населения','тыс. человек',16.146::numeric,16.378::numeric,16.645::numeric,'2022 и 2023 — отчёт; 2024 — оценка администрации.'),
 ('pokachi_population_jan1','Численность населения на 1 января','тыс. человек',16.09::numeric,16.201::numeric,16.556::numeric,'2022 и 2023 — отчёт; 2024 — оценка администрации.'),
 ('pokachi_working_age_population','Численность населения трудоспособного возраста на 1 января','тыс. человек',11.202::numeric,9.485::numeric,9.840::numeric,'2022 и 2023 — отчёт; 2024 — оценка администрации.'),
 ('pokachi_industrial_shipments','Объём отгруженных товаров собственного производства, работ и услуг','млн руб.',13740.66::numeric,16645.75::numeric,15813.46::numeric,'2022 и 2023 — отчёт; 2024 — оценка администрации.'),
 ('pokachi_industrial_production_index','Индекс промышленного производства','% к предыдущему году',128.95::numeric,124.12::numeric,92.68::numeric,'В сопоставимых ценах; 2022 и 2023 — отчёт, 2024 — оценка.'),
 ('pokachi_mining_shipments','Объём отгрузки в добыче полезных ископаемых','млн руб.',8250.08::numeric,9837.96::numeric,10821.75::numeric,'2022 и 2023 — отчёт; 2024 — оценка администрации.'),
 ('pokachi_manufacturing_shipments','Объём отгрузки обрабатывающих производств','млн руб.',780.52::numeric,949.27::numeric,820.17::numeric,'2022 и 2023 — отчёт; 2024 — оценка администрации.'),
 ('pokachi_construction_volume','Объём работ по виду деятельности «Строительство»','млн руб.',692.8::numeric,679.3::numeric,1049.3::numeric,'В ценах соответствующих лет; 2022 и 2023 — отчёт, 2024 — оценка.'),
 ('pokachi_housing_commissioning','Ввод в действие жилых домов','тыс. кв. м',0.640::numeric,2.509::numeric,4.072::numeric,'Общая площадь; 2022 и 2023 — отчёт, 2024 — оценка.'),
 ('pokachi_retail_turnover','Оборот розничной торговли','млн руб.',1761.57::numeric,2156.19::numeric,2371.81::numeric,'2022 и 2023 — отчёт; 2024 — оценка администрации.'),
 ('pokachi_paid_services','Объём платных услуг населению','млн руб.',106.02::numeric,115.06::numeric,120.81::numeric,'2022 и 2023 — отчёт; 2024 — оценка администрации.'),
 ('pokachi_sme_count','Количество малых и средних предприятий, включая микропредприятия','единиц',907::numeric,1162::numeric,1351::numeric,'На конец года; 2022 и 2023 — отчёт, 2024 — оценка.'),
 ('pokachi_sme_employment','Среднесписочная численность работников МСП','тыс. человек',1.63::numeric,1.86::numeric,2.00::numeric,'Без внешних совместителей; 2022 и 2023 — отчёт, 2024 — оценка.'),
 ('pokachi_investment_fixed_capital','Инвестиции в основной капитал','млн руб.',2095.75::numeric,1670.98::numeric,1346.58::numeric,'2022 и 2023 — отчёт; 2024 — оценка администрации.'),
 ('pokachi_per_capita_income','Среднедушевые денежные доходы населения','руб./мес.',37604.57::numeric,43328.91::numeric,46958.07::numeric,'Среднемесячные доходы; 2022 и 2023 — отчёт, 2024 — оценка.'),
 ('pokachi_real_disposable_income_index','Индекс реальных располагаемых денежных доходов','% г/г',93.43::numeric,95.58::numeric,97.60::numeric,'Индекс к предыдущему году; 2022 и 2023 — отчёт, 2024 — оценка.'),
 ('pokachi_employed_population','Численность занятых в экономике','тыс. человек',9.364::numeric,9.636::numeric,9.607::numeric,'2022 и 2023 — отчёт; 2024 — оценка администрации.'),
 ('pokachi_average_monthly_salary','Номинальная начисленная среднемесячная заработная плата работников организаций','руб./мес.',85331.40::numeric,98187.10::numeric,112051.50::numeric,'2022 и 2023 — отчёт; 2024 — оценка администрации.'),
 ('pokachi_registered_unemployment_rate','Уровень зарегистрированной безработицы на конец года','%',0.71::numeric,0.35::numeric,0.39::numeric,'2022 и 2023 — отчёт; 2024 — оценка администрации.'),
 ('pokachi_registered_unemployed','Численность зарегистрированных безработных на конец года','тыс. человек',0.073::numeric,0.036::numeric,0.040::numeric,'2022 и 2023 — отчёт; 2024 — оценка администрации.'),
 ('pokachi_wage_fund','Фонд заработной платы работников организаций','млн руб.',5856.84::numeric,6708.11::numeric,7278.42::numeric,'2022 и 2023 — отчёт; 2024 — оценка администрации.'),
 ('pokachi_population_below_poverty','Доля населения с денежными доходами ниже прожиточного минимума','%',4.9::numeric,4.4::numeric,4.4::numeric,'2022 и 2023 — отчёт; 2024 — оценка администрации.')
),
expanded as (
 select r.*, y.reference_year,y.reference_period,y.value,y.status_note from rows r
 cross join lateral (values
 (2022,'2022',r.v2022,'Отчётный показатель за 2022 год.'),
 (2023,'2023',r.v2023,'Отчётный показатель за 2023 год.'),
 (2024,'2024',r.v2024,'Оценка показателя на 2024 год, не окончательный статистический итог.')
 ) y(reference_year,reference_period,value,status_note)
)
insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,reference_period,value,unit,source_id,source_url,verification_status,notes,geographic_level,geographic_name)
select 'pokachi',e.indicator_code,e.indicator_name,e.reference_year,e.reference_period,e.value,e.unit,s.id,'https://admpokachi.ru/upload/docs/2024/08/Прогноз%20социально-экономического%20развития%20города%20Покачи%20на%202025%20год%20и%20на%20плановый%20период%202026%20и%202027%20годов.pdf','verified',e.notes || ' ' || e.status_note,'municipality','Покачи'
from expanded e cross join source s
where not exists (select 1 from public.municipality_indicators x where x.municipality_id='pokachi' and x.indicator_code=e.indicator_code and x.reference_year=e.reference_year and x.reference_period=e.reference_period and x.source_id=s.id);