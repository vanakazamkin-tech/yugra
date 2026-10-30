insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,notes)
values
('municipal_investment_message_sovetsky_2025',
 'Администрация Советского района — инвестиционное послание главы на 2025 год',
 'municipal_official_report',
 'https://adm.sovrnhmao.ru/upload/iblock/01b/sjwr2ds0yqjgvs7k1u0j87e9ypm4hrtx/ras302_2024.pdf',
 'Официальное инвестиционное послание с основными показателями экономического развития Советского района за 2024 год.',
 'PDF',
 'Советский район; импортированы показатели рынка труда, инвестиций, жилья, дорог и инженерной инфраструктуры.',
 'ежегодно',
 'partially_imported',
 'Часть показателей в документе прямо обозначена как оценка или план на конец 2024 года. Они не должны интерпретироваться как окончательные фактические итоги.')
on conflict (id) do update set
 name=excluded.name,category=excluded.category,url=excluded.url,description=excluded.description,
 format=excluded.format,coverage=excluded.coverage,update_frequency=excluded.update_frequency,
 import_status=excluded.import_status,notes=excluded.notes,updated_at=now();

with source as (select id from public.data_sources where id='municipal_investment_message_sovetsky_2025'),
rows(indicator_code,indicator_name,reference_year,reference_period,value,unit,notes) as (
 values
 ('sovetsky_investment_fixed_capital_estimate','Инвестиции в основной капитал',2023,'2023',12586.2::numeric,'млн руб.','Сравнительное значение 2023 года, приведённое в инвестиционном послании; методический статус следует читать вместе с оценкой 2024 года.'),
 ('sovetsky_investment_fixed_capital_estimate','Инвестиции в основной капитал',2024,'2024',12287.4::numeric,'млн руб.','Оценка администрации на конец 2024 года, не окончательный статистический итог.'),
 ('sovetsky_registered_unemployment_rate','Уровень регистрируемой безработицы',2023,'2023',1.45::numeric,'%','Сравнительное значение 2023 года, приведённое в инвестиционном послании.'),
 ('sovetsky_registered_unemployment_rate','Уровень регистрируемой безработицы',2024,'2024',0.96::numeric,'%','Оценка по итогам 2024 года, как прямо указано в документе.'),
 ('sovetsky_housing_commissioning_plan','Ввод жилья в поселениях района',2024,'2024',28.0::numeric,'тыс. кв. м','Планируемый к вводу объём по итогам 2024 года; документ формулирует показатель как план.'),
 ('sovetsky_local_road_repair','Ремонт автомобильных дорог местного значения',2024,'2024',4.872::numeric,'км','Объём выполненных в 2024 году работ по ремонту дорог общего пользования местного значения.'),
 ('sovetsky_noncompliant_roads_share','Доля местных дорог, не отвечающих нормативным требованиям',2023,'2023',24.62::numeric,'%','Сравнительный показатель, приведённый в инвестиционном послании.'),
 ('sovetsky_noncompliant_roads_share','Доля местных дорог, не отвечающих нормативным требованиям',2024,'2024',23.08::numeric,'%','Значение за 2024 год по данным инвестиционного послания.'),
 ('sovetsky_engineering_network_repair','Капитальный ремонт инженерных сетей',2024,'2024',10.7::numeric,'км','Общая протяжённость отремонтированных сетей тепло-, водоснабжения и горячего водоснабжения в 2024 году.')
)
insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,reference_period,value,unit,source_id,source_url,verification_status,notes,geographic_level,geographic_name)
select 'sovetsky-raion',r.indicator_code,r.indicator_name,r.reference_year,r.reference_period,r.value,r.unit,s.id,
 'https://adm.sovrnhmao.ru/upload/iblock/01b/sjwr2ds0yqjgvs7k1u0j87e9ypm4hrtx/ras302_2024.pdf',
 'verified',r.notes,'municipality','Советский район'
from rows r cross join source s
where not exists (
 select 1 from public.municipality_indicators x
 where x.municipality_id='sovetsky-raion' and x.indicator_code=r.indicator_code
 and x.reference_year=r.reference_year and x.reference_period=r.reference_period
 and x.source_id=s.id
);