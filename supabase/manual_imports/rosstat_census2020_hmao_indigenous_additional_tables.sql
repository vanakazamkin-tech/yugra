-- Register additional official census tables on Indigenous peoples in Khanty-Mansi Autonomous Area.
-- Metadata only; no numerical observations are imported by this script.
-- Source page: https://72.rosstat.gov.ru/perepis_nas2020
-- Reference date: 2021-10-01. Census conducted in 2021.
-- These four tables are regional (okrug-level), not municipal.

INSERT INTO public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,last_checked_at,notes)
VALUES
('rosstat_census2020_hmao_indigenous_language_possession_regional','Росстат — владение языками коренных малочисленных народов ХМАО, ВПН-2020, таблица 18','demography','https://72.rosstat.gov.ru/perepis_nas2020','Владение языками представителями коренных малочисленных народов по итогам переписи.','XLSX','ХМАО — Югра; региональный уровень; переписная дата 01.10.2021','Перепись населения','identified',now(),'Официальная страница Росстата указывает таблицу 18 «Владение языками коренных малочисленных народов», XLSX 16,09 КБ, опубликован 26.06.2023. Прямой URL файла и листы ещё не извлечены; наблюдения не импортированы.')
,('rosstat_census2020_hmao_indigenous_workforce_regional','Росстат — коренные малочисленные народы по возрасту и статусу участия в составе рабочей силы ХМАО, ВПН-2020, таблица 25','demography','https://72.rosstat.gov.ru/perepis_nas2020','Статус участия представителей коренных малочисленных народов в составе рабочей силы по возрастным группам.','XLSX','ХМАО — Югра; региональный уровень; переписная дата 01.10.2021','Перепись населения','identified',now(),'Официальная страница Росстата указывает таблицу 25, XLSX 29,49 КБ, опубликован 26.06.2023. Прямой URL и структура ещё не извлечены; наблюдения не импортированы.')
,('rosstat_census2020_hmao_indigenous_employment_regional','Росстат — коренные малочисленные народы по возрасту и статусу занятости ХМАО, ВПН-2020, таблица 26','demography','https://72.rosstat.gov.ru/perepis_nas2020','Статус занятости представителей коренных малочисленных народов по возрастным группам.','XLSX','ХМАО — Югра; региональный уровень; переписная дата 01.10.2021','Перепись населения','identified',now(),'Официальная страница Росстата указывает таблицу 26, XLSX 29,6 КБ, опубликован 26.06.2023. Прямой URL и структура ещё не извлечены; наблюдения не импортированы.')
,('rosstat_census2020_hmao_indigenous_women_children_regional','Росстат — женщины, указавшие принадлежность к коренным малочисленным народам, по возрасту и числу рожденных детей ХМАО, ВПН-2020, таблица 27','demography','https://72.rosstat.gov.ru/perepis_nas2020','Число рождённых детей у женщин, указавших принадлежность к коренным малочисленным народам, в возрастных группах.','XLSX','ХМАО — Югра; региональный уровень; переписная дата 01.10.2021','Перепись населения','identified',now(),'Официальная страница Росстата указывает таблицу 27, XLSX 16,12 КБ, опубликован 26.06.2023. Прямой URL и структура ещё не извлечены; наблюдения не импортированы.')
ON CONFLICT (id) DO UPDATE SET
 name=EXCLUDED.name,category=EXCLUDED.category,url=EXCLUDED.url,description=EXCLUDED.description,
 format=EXCLUDED.format,coverage=EXCLUDED.coverage,update_frequency=EXCLUDED.update_frequency,
 import_status=EXCLUDED.import_status,last_checked_at=now(),notes=EXCLUDED.notes,updated_at=now();
