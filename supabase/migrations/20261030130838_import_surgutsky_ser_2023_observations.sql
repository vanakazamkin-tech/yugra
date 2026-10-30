-- Import 2023 factual indicators from Surgutsky District administration forecast decree.
-- Source: Administration of Surgutsky District Resolution No. 2381, 2024-10-22.
-- Only the 2023 actual values from Chapter 2 are imported. 2024 estimates and later forecasts are excluded.
-- The linked legal reference is a secondary publication of the municipal normative act.

insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,last_checked_at,notes)
values
('surgutsky_ser_forecast_2025_2027','Администрация Сургутского района — прогноз социально-экономического развития на 2025–2027 годы (фактические данные за 2023 год)','official_statistics','https://base.garant.ru/410589626/','Постановление администрации Сургутского района от 22.10.2024 № 2381. Для импорта использована глава 2 «Оценка достигнутого уровня социально-экономического развития»: показатели за 2023 год; значения 2024 года, обозначенные как оценка, не импортировались.','HTML / нормативный акт','Сургутский муниципальный район; фактические показатели за 2023 год','annual','partially_imported',now(),'Ссылка ведёт на публикацию текста муниципального нормативного акта в правовой системе ГАРАНТ; документ принят администрацией района. Импортированы только строки, прямо относящиеся к 2023 году, оценки и прогнозы исключены.')
on conflict (id) do update set
 name=excluded.name,category=excluded.category,url=excluded.url,description=excluded.description,
 format=excluded.format,coverage=excluded.coverage,update_frequency=excluded.update_frequency,
 import_status=excluded.import_status,last_checked_at=excluded.last_checked_at,notes=excluded.notes;

with raw(indicator_code,indicator_name,reference_year,value,unit,notes) as (values
('industrial_production_index_surgutsky','Индекс промышленного производства',2023,94.8::numeric,'% к предыдущему году','Глава 2, таблица 1. Фактический показатель за 2023 год.'),
('fixed_capital_investment_total_surgutsky','Инвестиции в основной капитал',2023,342365.1::numeric,'млн руб.','Глава 2, таблица 1. Фактический номинальный объём за 2023 год; включает добывающую отрасль, поэтому не сопоставим напрямую с инвестициями без добычи.'),
('housing_commissioned_area_surgutsky','Ввод в действие жилых домов',2023,110.4::numeric,'тыс. кв. м','Глава 2, таблица 1. Фактический показатель за 2023 год.'),
('real_cash_income_index_surgutsky','Индекс реальных денежных доходов населения',2023,101.2::numeric,'% к предыдущему году','Глава 2, таблица 1. Индекс реальных доходов, не уровень дохода в рублях.'),
('real_wage_index_surgutsky','Индекс реальной заработной платы',2023,102.2::numeric,'% к предыдущему году','Глава 2, таблица 1. Индекс реальной зарплаты, не номинальная заработная плата.'),
('retail_turnover_index_surgutsky','Индекс оборота розничной торговли',2023,105.2::numeric,'% к предыдущему году','Глава 2, таблица 1. Индекс в сопоставимых ценах.'),
('paid_services_index_surgutsky','Индекс объёма платных услуг населению',2023,101.4::numeric,'% к предыдущему году','Глава 2, таблица 1. Индекс в сопоставимых ценах.'),
('registered_unemployment_rate_surgutsky','Уровень регистрируемой безработицы на конец периода',2023,0.11::numeric,'%','Глава 2, таблица 1. Регистрируемая безработица, не общая безработица по методологии МОТ.'),
('birth_rate_surgutsky','Общий коэффициент рождаемости',2023,11.9::numeric,'на 1000 человек населения','Глава 2, оценка демографического положения; коэффициент за 2023 год.'),
('death_rate_surgutsky','Общий коэффициент смертности',2023,4.8::numeric,'на 1000 человек населения','Глава 2, оценка демографического положения; коэффициент за 2023 год.'),
('natural_increase_rate_surgutsky','Коэффициент естественного прироста населения',2023,7.1::numeric,'на 1000 человек населения','Глава 2, оценка демографического положения; коэффициент за 2023 год.')
)
insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,reference_period,value,unit,source_id,source_url,source_published_at,verification_status,notes,geographic_level,geographic_name)
select 'surgutsky',r.indicator_code,r.indicator_name,r.reference_year,'annual',r.value,r.unit,'surgutsky_ser_forecast_2025_2027',
'https://base.garant.ru/410589626/',date '2024-10-22','verified',r.notes,'municipality','Сургутский район'
from raw r
where not exists (
 select 1 from public.municipality_indicators m
 where m.municipality_id='surgutsky' and m.indicator_code=r.indicator_code
 and m.reference_year=r.reference_year and m.reference_period='annual'
);
