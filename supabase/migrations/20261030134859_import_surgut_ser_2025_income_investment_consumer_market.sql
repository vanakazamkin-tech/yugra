-- Import preliminary 2025 investment, income, wage and consumer-market indicators for Surgut.
-- Source: official 2025 municipal socio-economic report, City Duma PDF (report order dated 13.02.2026 No. 59; PDF copy in City Duma document portal).
-- Preserve scope, preliminary status and distinctions between all-enterprise and large/medium-only indicators.

update public.data_sources
set import_status='partially_imported',last_checked_at=now(),
 notes=coalesce(notes,'') || ' Частично импортированы показатели доходов, зарплаты, потребительского рынка и инвестиций; значения за 2025 год преимущественно предварительные.'
where id='municipal_ser_surgut_2025';

insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,value,unit,source_id,source_url,retrieved_at,verification_status,notes,geographic_level,geographic_name,reference_period)
select m.id,v.code,v.name,2025,v.value,v.unit,
 'municipal_ser_surgut_2025',
 'https://dumasurgut.ru/upload/iblock/80f/xzxknp8dh16e3mftqxj3zm870d0xc7ut/963-VII%20%D0%94%D0%93%20%D0%BE%D1%82%2003.03.2026.pdf',
 now(),'verified',v.notes,'municipality','Сургут','annual'
from public.municipalities m
cross join (values
 ('fixed_capital_investment_total_preliminary','Инвестиции в основной капитал за счёт всех источников финансирования по крупным и средним организациям',98400000000::numeric,'руб.','Предварительные данные за 2025 год; охват — крупные и средние организации, все источники финансирования. Не смешивать с инвестициями без добычи и с полным кругом предприятий.'),
 ('fixed_capital_investment_growth_preliminary','Индекс инвестиций в основной капитал крупных и средних организаций в сопоставимых ценах',105.6::numeric,'%','Предварительные данные: уровень 2025 года на 5,6% выше уровня 2024 года.'),
 ('per_capita_cash_income_monthly','Среднедушевые денежные доходы населения в месяц',86600::numeric,'руб./чел.','Предварительные итоги 2025 года; в отчёте значение округлено до 86,6 тыс. руб.'),
 ('real_disposable_income_index','Индекс реальных денежных доходов населения',101.6::numeric,'%','Предварительные итоги 2025 года; реальный рост к предыдущему году 1,6%.'),
 ('average_monthly_wage_large_medium','Среднемесячная заработная плата работников крупных и средних организаций',155100::numeric,'руб.','Предварительные итоги 2025 года; значение округлено до 155,1 тыс. руб.'),
 ('real_wage_index','Индекс реальной заработной платы работников крупных и средних организаций',102.4::numeric,'%','Предварительные итоги 2025 года; реальная заработная плата на 2,4% выше предыдущего года.'),
 ('consumer_market_volume','Объём потребительского рынка города',258600000000::numeric,'руб.','Оценка по итогам 2025 года; включает розничную торговлю, общественное питание и платные услуги.'),
 ('consumer_market_physical_index','Индекс физического объёма потребительского рынка',100.4::numeric,'%','Оценка по итогам 2025 года к уровню 2024 года.'),
 ('retail_turnover_share_consumer_market','Доля розничной торговли в потребительском рынке',76.3::numeric,'%','Структурная доля в общем объёме потребительского рынка за 2025 год. Не является темпом роста розничной торговли.'),
 ('public_catering_share_consumer_market','Доля общественного питания в потребительском рынке',4.2::numeric,'%','Структурная доля в общем объёме потребительского рынка за 2025 год.'),
 ('paid_services_share_consumer_market','Доля платных услуг населению в потребительском рынке',19.5::numeric,'%','Структурная доля в общем объёме потребительского рынка за 2025 год.'),
 ('retail_turnover_large_medium_growth_comparable','Изменение оборота розничной торговли крупных и средних организаций в сопоставимых ценах',-0.5::numeric,'%','Предварительные итоги 2025 года к 2024 году; показатель охватывает крупные и средние организации, а не весь оборот розничной торговли.'),
 ('paid_services_volume_growth_comparable','Изменение объёма платных услуг населению в сопоставимых ценах',4.6::numeric,'%','Предварительные итоги 2025 года к 2024 году.'),
 ('public_catering_turnover_growth_comparable','Изменение оборота общественного питания в сопоставимых ценах',0.3::numeric,'%','Предварительные итоги 2025 года к 2024 году.')
) as v(code,name,value,unit,notes)
where m.name='Сургут'
and not exists(select 1 from public.municipality_indicators x
 where x.municipality_id=m.id and x.indicator_code=v.code and x.reference_year=2025
 and coalesce(x.reference_period,'annual')='annual');
