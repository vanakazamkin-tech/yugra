-- Import municipal 2025 economic indicators from the official HMRN investment message for 2026.
-- Estimates and approximate values are explicitly identified in notes.

insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,last_checked_at,notes)
values
('hmrn_investment_message_2026',
 'Администрация Ханты-Мансийского района — инвестиционное послание главы на 2026 год',
 'municipal_official_report',
 'https://hmrn.ru/raion/ekonomika/investitsionnaya-deyatelnost/investitsionnaya-politika/investitsionnoe-poslanie-glavy-administratsii-khanty-mansiyskogo-rayona.php',
 'Официальное инвестиционное послание главы Ханты-Мансийского района на 2026 год с краткими итогами экономической деятельности за 2025 год.',
 'web_page',
 'Ханты-Мансийский район, 2025',
 'annual',
 'partially_imported',
 now(),
 'Часть значений обозначена как оценка или приблизительная величина. Округления и статус оценки сохранены в notes; не считать их окончательной статистикой.')
on conflict(id) do update set
 name=excluded.name,url=excluded.url,description=excluded.description,
 import_status='partially_imported',last_checked_at=now(),notes=excluded.notes;

insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,value,unit,source_id,source_url,retrieved_at,verification_status,notes,geographic_level,geographic_name,reference_period)
select m.id,v.code,v.name,2025,v.value,v.unit,
 'hmrn_investment_message_2026',
 'https://hmrn.ru/raion/ekonomika/investitsionnaya-deyatelnost/investitsionnaya-politika/investitsionnoe-poslanie-glavy-administratsii-khanty-mansiyskogo-rayona.php',
 now(),'verified',v.notes,'municipality','Ханты-Мансийский район','annual'
from public.municipalities m
cross join (values
 ('industrial_shipment_total','Объём отгруженной промышленной продукции',946000000000::numeric,'руб.','Оценка по итогам 2025 года; источник указывает рост на 13% к 2024 году. Значение оценочное.'),
 ('industrial_shipment_growth_preliminary','Рост объёма отгруженной промышленной продукции',13::numeric,'%','Оценка роста по итогам 2025 года к 2024 году; опубликована в инвестиционном послании.'),
 ('construction_works_volume','Объём работ по виду деятельности «Строительство»',7100000000::numeric,'руб.','По итогам 2025 года; опубликовано в инвестиционном послании главы района.'),
 ('sme_turnover','Оборот малого и среднего бизнеса',2590000000::numeric,'руб.','По итогам 2025 года; опубликован рост 7,4%. Значение приведено с округлением до 0,01 млрд руб.'),
 ('sme_turnover_growth','Рост оборота малого и среднего бизнеса',7.4::numeric,'%','По итогам 2025 года к 2024 году.'),
 ('small_business_employment_approx','Численность занятых в малом бизнесе',1950::numeric,'человек','Приблизительная оценка: в источнике указано «порядка 1 950 человек»; не отождествлять с полной занятостью во всех субъектах МСП.')
) as v(code,name,value,unit,notes)
where m.name='Ханты-Мансийский район'
and not exists(select 1 from public.municipality_indicators x
 where x.municipality_id=m.id and x.indicator_code=v.code and x.reference_year=2025
 and coalesce(x.reference_period,'annual')='annual');
