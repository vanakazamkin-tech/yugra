-- Import official municipal socio-economic report for Surgut, 2022–2023.
-- Source: Administration of Surgut, Order No. 4003 dated 2023-12-29, Appendix, Table 1.
-- Values retain the source's units and coverage. Nominal monetary values are not inflation-adjusted.
-- The 2023 employment values are marked preliminary in the source narrative.

insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,last_checked_at,notes)
values
('municipal_ser_surgut_2023','Администрация Сургута — итоги социально-экономического развития за 2023 год','official_statistics','https://dumasurgut.ru/upload/iblock/b30/3ht4elkklu779wnbwnzgwp4volo4054i/RAG_231229_4003.pdf','Официальный годовой отчёт администрации городского округа Сургут. Таблица 1 содержит сопоставимые показатели за 2022 и 2023 годы; отдельные показатели в тексте отчёта обозначены как предварительные или оценочные.','PDF','Городской округ Сургут; годовые показатели за 2022–2023 годы','annual','partially_imported',now(),'Импортирована часть количественных показателей из таблицы 1. Значения сохранены с исходными единицами и определениями. Для рядов, обозначенных в отчёте как предварительные/оценочные, это отражено в notes наблюдений.')
on conflict (id) do update set
 name=excluded.name,category=excluded.category,url=excluded.url,
 description=excluded.description,format=excluded.format,coverage=excluded.coverage,
 update_frequency=excluded.update_frequency,import_status=excluded.import_status,
 last_checked_at=excluded.last_checked_at,notes=excluded.notes;

with raw(indicator_code,indicator_name,reference_year,value,unit,notes) as (values
('migration_growth_municipal_report','Миграционный прирост населения',2022,5.2::numeric,'тыс. человек','Таблица 1, раздел 1.2.'),
('migration_growth_municipal_report','Миграционный прирост населения',2023,9.3::numeric,'тыс. человек','Таблица 1, раздел 1.2.'),
('average_per_capita_cash_income_municipal_report','Среднедушевые денежные доходы населения в месяц',2022,67066::numeric,'руб./мес.','Таблица 1, раздел 2.1.'),
('average_per_capita_cash_income_municipal_report','Среднедушевые денежные доходы населения в месяц',2023,71121::numeric,'руб./мес.','Таблица 1, раздел 2.1; общий объём денежных доходов за 2023 год отдельно указан в тексте как оценочный.'),
('average_per_capita_disposable_income_municipal_report','Среднедушевые располагаемые денежные доходы населения в месяц',2022,58549::numeric,'руб./мес.','Таблица 1, раздел 2.2.'),
('average_per_capita_disposable_income_municipal_report','Среднедушевые располагаемые денежные доходы населения в месяц',2023,62088::numeric,'руб./мес.','Таблица 1, раздел 2.2.'),
('average_monthly_salary_large_medium_municipal_report','Среднемесячная номинальная начисленная заработная плата работников крупных и средних организаций',2022,116396::numeric,'руб./мес.','Таблица 1, раздел 2.3; только крупные и средние организации.'),
('average_monthly_salary_large_medium_municipal_report','Среднемесячная номинальная начисленная заработная плата работников крупных и средних организаций',2023,125660::numeric,'руб./мес.','Таблица 1, раздел 2.3; только крупные и средние организации.'),
('registered_unemployment_rate_municipal_report','Уровень зарегистрированной безработицы на конец года',2022,0.23::numeric,'%','Таблица 1, раздел 3.5; это зарегистрированная безработица, не показатель МОТ.'),
('registered_unemployment_rate_municipal_report','Уровень зарегистрированной безработицы на конец года',2023,0.14::numeric,'%','Таблица 1, раздел 3.5; это зарегистрированная безработица, не показатель МОТ.'),
('employed_in_economy_municipal_report','Среднегодовая численность занятых в экономике на территории муниципального образования',2022,184.9::numeric,'тыс. человек','Таблица 1, раздел 3.2; значение 2023 года в отчёте предварительное.'),
('employed_in_economy_municipal_report','Среднегодовая численность занятых в экономике на территории муниципального образования',2023,192.6::numeric,'тыс. человек','Таблица 1, раздел 3.2; предварительные данные отчёта.'),
('small_business_employment_municipal_report','Численность занятых в малом бизнесе',2022,70.9::numeric,'тыс. человек','Таблица 1, раздел 5.2.'),
('small_business_employment_municipal_report','Численность занятых в малом бизнесе',2023,78.6::numeric,'тыс. человек','Таблица 1, раздел 5.2.'),
('small_business_employment_share_municipal_report','Доля занятых в малом бизнесе в общей численности занятых в экономике',2022,38.4::numeric,'%','Таблица 1, раздел 5.3.'),
('small_business_employment_share_municipal_report','Доля занятых в малом бизнесе в общей численности занятых в экономике',2023,40.8::numeric,'%','Таблица 1, раздел 5.3.'),
('small_business_turnover_municipal_report','Оборот малого бизнеса в ценах соответствующих лет',2022,201773.0::numeric,'млн руб.','Таблица 1, раздел 5.1; номинальный оборот, без поправки на инфляцию.'),
('small_business_turnover_municipal_report','Оборот малого бизнеса в ценах соответствующих лет',2023,236918.2::numeric,'млн руб.','Таблица 1, раздел 5.1; номинальный оборот, без поправки на инфляцию.'),
('investment_large_medium_municipal_report','Инвестиции в основной капитал по крупным и средним организациям, все источники финансирования',2022,42084.8::numeric,'млн руб.','Таблица 1, раздел 7.1; не объединять с инвестициями без добычи или только за счёт местного бюджета.'),
('investment_large_medium_municipal_report','Инвестиции в основной капитал по крупным и средним организациям, все источники финансирования',2023,49223.1::numeric,'млн руб.','Таблица 1, раздел 7.1; не объединять с инвестициями без добычи или только за счёт местного бюджета.'),
('retail_turnover_large_medium_municipal_report','Оборот розничной торговли по крупным и средним организациям',2022,90191.7::numeric,'млн руб.','Таблица 1, раздел 6.1; только крупные и средние организации.'),
('retail_turnover_large_medium_municipal_report','Оборот розничной торговли по крупным и средним организациям',2023,94543.6::numeric,'млн руб.','Таблица 1, раздел 6.1; только крупные и средние организации.'),
('paid_services_large_medium_municipal_report','Объём платных услуг населению по крупным и средним организациям',2022,27428.9::numeric,'млн руб.','Таблица 1, раздел 6.3; только крупные и средние организации.'),
('paid_services_large_medium_municipal_report','Объём платных услуг населению по крупным и средним организациям',2023,30350.0::numeric,'млн руб.','Таблица 1, раздел 6.3; только крупные и средние организации.'),
('housing_construction_municipal_report','Объём жилищного строительства',2022,284.7::numeric,'тыс. м²','Таблица 1, раздел 7.2.'),
('housing_construction_municipal_report','Объём жилищного строительства',2023,162.3::numeric,'тыс. м²','Таблица 1, раздел 7.2.')
)
insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,reference_period,value,unit,source_id,source_url,source_published_at,verification_status,notes,geographic_level,geographic_name)
select 'surgut',r.indicator_code,r.indicator_name,r.reference_year,'annual',r.value,r.unit,'municipal_ser_surgut_2023',
'https://dumasurgut.ru/upload/iblock/b30/3ht4elkklu779wnbwnzgwp4volo4054i/RAG_231229_4003.pdf',
date '2023-12-29','verified',r.notes,'municipality','Сургут'
from raw r
where not exists (
 select 1 from public.municipality_indicators m
 where m.municipality_id='surgut' and m.indicator_code=r.indicator_code
 and m.reference_year=r.reference_year and m.reference_period='annual'
);
