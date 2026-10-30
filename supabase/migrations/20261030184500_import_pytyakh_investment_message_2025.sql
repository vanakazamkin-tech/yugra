-- Import published industrial output, retail turnover and registered unemployment figures for Pyty-Yakh.
-- Source: official city investment portal / Head's investment message.
-- The 6.5bn RUB investment figure on the page is a forecast and is intentionally not imported as an actual observation.
-- The stated retail growth rate (16.2%) conflicts with the listed absolute values (6.8bn -> 7.5bn); do not import that growth rate.

insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,last_checked_at,notes)
values
('pytyakh_investment_message_2025',
 'Инвестиционный портал Пыть-Яха — инвестиционное послание главы города с итогами 2025 года',
 'municipal_official_report',
 'https://invest.py86.ru/investitsionnaya-politika/investitsionnoe-poslanie-glavy-goroda-pyt-yakha/',
 'Официальная страница инвестиционного послания главы города Пыть-Яха с опубликованными показателями промышленного производства, розничной торговли и зарегистрированной безработицы.',
 'web_page',
 'Пыть-Ях, 2024–2025',
 'annual',
 'partially_imported',
 now(),
 'Страница также приводит прогноз инвестиций в основной капитал на уровне 6,5 млрд руб.; он не импортирован как факт. В тексте указано увеличение розничной торговли на 16,2%, однако опубликованные абсолютные значения 6,8 и 7,5 млрд руб. не подтверждают такой темп; процент роста не импортирован.')
on conflict(id) do update set
 name=excluded.name,url=excluded.url,description=excluded.description,
 import_status='partially_imported',last_checked_at=now(),notes=excluded.notes;

insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,value,unit,source_id,source_url,retrieved_at,verification_status,notes,geographic_level,geographic_name,reference_period)
select m.id,v.code,v.name,v.year,v.value,v.unit,
 'pytyakh_investment_message_2025',
 'https://invest.py86.ru/investitsionnaya-politika/investitsionnoe-poslanie-glavy-goroda-pyt-yakha/',
 now(),'verified',v.notes,'municipality','Пыть-Ях','annual'
from public.municipalities m
cross join (values
 ('industrial_output_large_medium','Объём промышленного производства крупных и средних предприятий',2024,45700000000::numeric,'руб.','Значение за 2024 год приведено в официальном инвестиционном послании как база сравнения.'),
 ('industrial_output_large_medium','Объём промышленного производства крупных и средних предприятий',2025,51200000000::numeric,'руб.','Значение за 2025 год приведено в официальном инвестиционном послании; источник заявляет рост на 12%.'),
 ('retail_turnover','Оборот розничной торговли',2024,6800000000::numeric,'руб.','Значение за 2024 год приведено в официальном инвестиционном послании как база сравнения.'),
 ('retail_turnover','Оборот розничной торговли',2025,7500000000::numeric,'руб.','Значение за 2025 год приведено в официальном инвестиционном послании. Заявленный там темп роста 16,2% не импортирован: абсолютные значения 6,8 и 7,5 млрд руб. арифметически дают иной темп.'),
 ('registered_unemployment_rate','Уровень зарегистрированной безработицы',2024,0.10::numeric,'%','Значение за 2024 год по официальному инвестиционному посланию.'),
 ('registered_unemployment_rate','Уровень зарегистрированной безработицы',2025,0.07::numeric,'%','Значение за 2025 год по официальному инвестиционному посланию; снижение примерно на 30%.')
) as v(code,name,year,value,unit,notes)
where m.name='Пыть-Ях'
and not exists(select 1 from public.municipality_indicators x
 where x.municipality_id=m.id and x.indicator_code=v.code and x.reference_year=v.year
 and coalesce(x.reference_period,'annual')='annual');
