insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,notes)
values
('hmrn_head_report_2025',
 'Администрация Ханты-Мансийского района — отчёт главы об итогах деятельности за 2025 год',
 'municipal_official_report',
 'https://hmrn.ru/about/info/news/102648/',
 'Официальная публикация о представлении главой района отчёта за 2025 год на заседании Думы 19.02.2026; опубликована 20.02.2026.',
 'HTML',
 'Ханты-Мансийский район; отдельные годовые показатели за 2025 год',
 'annual',
 'partially_imported',
 'Импортированы только показатели, прямо приведённые в официальной публикации: созданные рабочие места, регистрируемая безработица и ввод жилья. Значения не расширяются на сельские поселения отдельно.'
)
on conflict (id) do update set
 name=excluded.name,category=excluded.category,url=excluded.url,
 description=excluded.description,format=excluded.format,coverage=excluded.coverage,
 update_frequency=excluded.update_frequency,import_status=excluded.import_status,
 notes=excluded.notes,updated_at=now();

with src as (select id from public.data_sources where id='hmrn_head_report_2025'),
mo as (select id from public.municipalities where id='khanty-mansiysky-raion'),
rows(indicator_code,indicator_name,value,unit,notes) as (
 values
 ('jobs_created_permanent','Создано постоянных рабочих мест',494::numeric,'ед.','За 2025 год; число новых постоянных рабочих мест по отчёту главы района.'),
 ('jobs_created_temporary','Создано временных рабочих мест',237::numeric,'ед.','За 2025 год; число новых временных рабочих мест по отчёту главы района.'),
 ('registered_unemployment_rate_municipal_report','Уровень регистрируемой безработицы',0.22::numeric,'%','За 2025 год; в официальном отчёте указан уровень 0,22%, в сравнении с 0,29% за 2024 год.'),
 ('housing_commissioned_reported','Ввод жилья',19300::numeric,'кв. м','За 2025 год; в официальном отчёте указано 19,3 тыс. кв. м.')
)
insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,value,unit,source_id,source_url,source_published_at,retrieved_at,verification_status,notes,geographic_level,geographic_name,reference_period)
select mo.id,rows.indicator_code,rows.indicator_name,2025,rows.value,rows.unit,src.id,
'https://hmrn.ru/about/info/news/102648/',date '2026-02-20',now(),'verified',rows.notes,
'municipality','Ханты-Мансийский район','annual'
from rows cross join src cross join mo
where not exists (
 select 1 from public.municipality_indicators old
 where old.municipality_id=mo.id and old.indicator_code=rows.indicator_code
 and old.reference_year=2025 and coalesce(old.reference_period,'annual')='annual'
);
