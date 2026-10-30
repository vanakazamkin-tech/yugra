insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,notes)
values
('municipal_ser_beloyarsky_2024',
 'Администрация Белоярского района — предварительные итоги социально-экономического развития за 2024 год',
 'municipal_official_report',
 'https://star.admbel.ru/area/common/',
 'Официальная публикация администрации Белоярского района с предварительными итогами за 2024 год и срезами на 01.01.2025.',
 'HTML',
 'Белоярский район; импортированы районные показатели за 2024 год и отдельные моментные значения на 01.01.2025.',
 'ежегодно',
 'partially_imported',
 'Значения доходов, занятости и промышленного производства обозначены источником как предварительные или оценочные. Среднемесячная зарплата относится к крупным и средним предприятиям. Население, безработица и МСП — моментные срезы на 01.01.2025. Город Белоярский не смешивается с районом.')
on conflict (id) do update set
 name=excluded.name, category=excluded.category, url=excluded.url, description=excluded.description,
 format=excluded.format, coverage=excluded.coverage, update_frequency=excluded.update_frequency,
 import_status=excluded.import_status, notes=excluded.notes, updated_at=now();

with source as (select id from public.data_sources where id='municipal_ser_beloyarsky_2024'),
rows(indicator_code,indicator_name,reference_year,reference_period,value,unit,notes) as (
 values
 ('beloyarsky_population','Численность населения Белоярского района',2025,'2025-01-01',28285::numeric,'человек','Предварительная численность населения на 01.01.2025 по данным администрации района.'),
 ('beloyarsky_employment_average','Среднесписочная численность работающих по полному кругу предприятий',2024,'2024',14.276::numeric,'тыс. человек','Оценочное значение администрации за 2024 год; полный круг предприятий.'),
 ('beloyarsky_per_capita_income','Среднедушевые денежные доходы населения',2024,'2024',74274::numeric,'руб./мес.','Предварительное значение за 2024 год; администрация указывает рост на 10,0% к 2023 году.'),
 ('beloyarsky_average_salary_large_medium','Среднемесячная заработная плата работников крупных и средних предприятий',2024,'2024',146470.7::numeric,'руб./мес.','Предварительное значение за 2024 год; охват ограничен крупными и средними предприятиями.'),
 ('beloyarsky_unemployment_rate','Уровень зарегистрированной безработицы',2025,'2025-01-01',0.42::numeric,'%','Срез на 01.01.2025 относительно численности экономически активного населения.'),
 ('beloyarsky_registered_unemployed','Численность зарегистрированных безработных',2025,'2025-01-01',69::numeric,'человек','Срез на 01.01.2025 по данным администрации района.'),
 ('beloyarsky_industrial_output','Объём промышленного производства крупных и средних предприятий',2024,'2024',44202.8::numeric,'млн руб.','Оценка администрации за 2024 год; крупные и средние предприятия.'),
 ('beloyarsky_industrial_production_index','Индекс промышленного производства',2024,'2024',76.7::numeric,'% к предыдущему году','Значение за 2024 год в сопоставимых ценах.'),
 ('beloyarsky_oil_industry_shipments','Отгрузка товаров, работ и услуг нефтедобывающей отрасли',2024,'2024',42005.4::numeric,'млн руб.','Крупные и средние предприятия; номинальный объём за 2024 год.'),
 ('beloyarsky_oil_extraction','Добыча нефти',2024,'2024',883.2::numeric,'тыс. тонн','Объём добычи на территории района за 2024 год; источник указывает 69,2% к 2023 году.'),
 ('beloyarsky_investment_fixed_capital','Объём инвестиций в развитие Белоярского района',2024,'2024',10083::numeric,'млн руб.','Общий объём инвестиций за 2024 год по данным администрации.'),
 ('beloyarsky_investment_per_capita','Инвестиции на одного жителя',2024,'2024',355.3::numeric,'тыс. руб./чел.','Значение за 2024 год, приведённое администрацией.'),
 ('beloyarsky_sme_count','Количество субъектов малого и среднего предпринимательства',2025,'2025-01-01',577::numeric,'единиц','Срез Единого реестра субъектов МСП ФНС России на 01.01.2025: 502 ИП и 75 юридических лиц.'),
 ('beloyarsky_self_employed_count','Количество зарегистрированных самозанятых',2024,'2024',1844::numeric,'человек','Количество плательщиков налога на профессиональный доход, зарегистрированных в 2024 году.'),
 ('beloyarsky_consolidated_budget_revenue','Доходы консолидированного бюджета района',2024,'2024',6336::numeric,'млн руб.','Исполнение консолидированного бюджета за 2024 год.'),
 ('beloyarsky_consolidated_budget_expenditure','Расходы консолидированного бюджета района',2024,'2024',6476::numeric,'млн руб.','Исполнение консолидированного бюджета за 2024 год.')
)
insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,reference_period,value,unit,source_id,source_url,verification_status,notes,geographic_level,geographic_name)
select 'beloyarsky-raion',r.indicator_code,r.indicator_name,r.reference_year,r.reference_period,r.value,r.unit,s.id,
 'https://star.admbel.ru/area/common/',
 'verified',r.notes,'municipality','Белоярский район'
from rows r cross join source s
where not exists (
 select 1 from public.municipality_indicators x
 where x.municipality_id='beloyarsky-raion' and x.indicator_code=r.indicator_code
 and x.reference_year=r.reference_year and x.reference_period=r.reference_period
 and x.source_id=s.id
);