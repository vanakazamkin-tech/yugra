insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,notes)
values
('municipal_ser_nefteyugansk_2025',
 'Администрация Нефтеюганска — итоги социально-экономического развития за 2025 год (постановление № 490-п)',
 'official_statistics',
 'https://www.admugansk.ru/category/6',
 'Утверждённые постановлением администрации города Нефтеюганска от 27.05.2026 № 490-п итоги социально-экономического развития за 2025 год. Числовые значения извлечены из приложения к постановлению.',
 'HTML/PDF',
 'Город Нефтеюганск; годовые показатели 2023–2025, импортирован срез за 2025 год',
 'annual',
 'partially_imported',
 'Для инвестиций в основной капитал в документе указана предварительная оценка. Среднедушевые доходы и зарплата номинальные. Население указано как среднегодовая численность. Опубликованный текст приложения: https://base.garant.ru/414301420/1b93c134b90c6071b4dc3f495464b753/; постановление от 27.05.2026 № 490-п.'
)
on conflict (id) do update set
 name=excluded.name, category=excluded.category, url=excluded.url,
 description=excluded.description, format=excluded.format,
 coverage=excluded.coverage, update_frequency=excluded.update_frequency,
 import_status=excluded.import_status, notes=excluded.notes, updated_at=now();

with src as (
 select id from public.data_sources where id='municipal_ser_nefteyugansk_2025'
), mo as (
 select id from public.municipalities where id='nefteyugansk'
), rows(indicator_code,indicator_name,value,unit,notes) as (
 values
 ('population_municipality','Среднегодовая численность постоянного населения',127320::numeric,'человек','За 2025 год; среднегодовая численность, по постановлению № 490-п.'),
 ('natural_population_increase_municipal_report','Естественный прирост населения',540::numeric,'человек','За 2025 год; абсолютное число.'),
 ('migration_net_total','Миграционный прирост (сальдо), всего',700::numeric,'человек','За 2025 год; абсолютное число.'),
 ('employment_average_headcount_municipal_report','Среднесписочная численность работников всех предприятий и организаций без внешних совместителей',55250::numeric,'человек','В исходном документе 55,25 тыс. человек; пересчитано в человек.'),
 ('fixed_capital_investment_total_preliminary','Инвестиции в основной капитал за счёт всех источников финансирования',31747020000::numeric,'руб.','Предварительная оценка за 2025 год: 31 747,02 млн руб.; не окончательный статистический итог.'),
 ('fixed_capital_investment_growth_preliminary','Индекс физического объёма инвестиций в основной капитал',73.71::numeric,'%','Предварительная оценка; индекс физического объёма к предыдущему году в сопоставимых ценах.'),
 ('housing_commissioned_reported','Ввод жилья',68410::numeric,'кв. м','68,41 тыс. кв. м за 2025 год; сумма многоквартирного и индивидуального жилья.'),
 ('retail_turnover','Оборот розничной торговли',36182960000::numeric,'руб.','36 182,96 млн руб. за 2025 год; номинальный объём.'),
 ('retail_turnover_index_municipal_report','Индекс физического объёма оборота розничной торговли',101.85::numeric,'%','За 2025 год, в сопоставимых ценах.'),
 ('paid_services_volume_municipal_report','Объём реализации платных услуг населению',11417760000::numeric,'руб.','11 417,76 млн руб. за 2025 год; номинальный объём.'),
 ('paid_services_index_municipal_report','Индекс физического объёма платных услуг населению',99.11::numeric,'%','За 2025 год, в сопоставимых ценах к предыдущему году.'),
 ('sme_entities_count','Количество субъектов малого и среднего предпринимательства',4559::numeric,'ед.','По данным Единого реестра субъектов МСП на 01.01.2026; включает юридические лица и ИП.'),
 ('average_per_capita_cash_income_municipal_report','Среднедушевые денежные доходы населения в месяц',78099.05::numeric,'руб./мес.','За 2025 год; номинальные среднедушевые денежные доходы.'),
 ('average_monthly_wage_large_medium','Среднемесячная номинальная начисленная заработная плата работников крупных и средних предприятий',142278.90::numeric,'руб./мес.','За 2025 год; без корректировки на инфляцию.')
)
insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,value,unit,source_id,source_url,source_published_at,retrieved_at,verification_status,notes,geographic_level,geographic_name,reference_period)
select mo.id, rows.indicator_code, rows.indicator_name, 2025, rows.value, rows.unit,
 src.id, 'https://base.garant.ru/414301420/1b93c134b90c6071b4dc3f495464b753/',
 date '2026-05-27', now(), 'verified', rows.notes,
 'municipality', 'Нефтеюганск', 'annual'
from rows cross join src cross join mo
where not exists (
 select 1 from public.municipality_indicators old
 where old.municipality_id=mo.id
 and old.indicator_code=rows.indicator_code
 and old.reference_year=2025
 and coalesce(old.reference_period,'annual')='annual'
);
