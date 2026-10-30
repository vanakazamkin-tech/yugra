-- Register official 2020 census municipal-level source files for Khanty-Mansi Autonomous Area.
-- This script registers source metadata only. It does NOT import any numerical observations.
-- Landing page: https://72.rosstat.gov.ru/perepis_nas2020
-- Census reference date: 2021-10-01 (the census was conducted in 2021).

INSERT INTO public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,last_checked_at,notes)
VALUES
('rosstat_census2020_hmao_ethnic_municipal','Росстат — национальный состав населения муниципальных образований ХМАО по ВПН-2020, таблица 2','demography','https://72.rosstat.gov.ru/perepis_nas2020','Численность населения муниципальных образований ХМАО — Югры по национальной принадлежности по итогам Всероссийской переписи населения 2020 года (фактически проведена в 2021 году).','XLSX','ХМАО — Югра; муниципальные образования; переписная дата 01.10.2021','Перепись населения','identified',now(),'На странице Росстата указан XLSX размером 116,27 КБ, опубликованный 26.06.2023. Прямой URL файла и структура листа ещё не извлечены; числовые значения не импортированы.')
,('rosstat_census2020_hmao_ethnic_language_municipal','Росстат — национальность и владение русским языком в муниципальных образованиях ХМАО, ВПН-2020, таблица 3.1','demography','https://72.rosstat.gov.ru/perepis_nas2020','Численность населения по национальной принадлежности, владению русским языком и его использованию в муниципальных образованиях ХМАО — Югры.','XLSX','ХМАО — Югра; муниципальные образования; переписная дата 01.10.2021','Перепись населения','identified',now(),'На странице Росстата указан XLSX размером 86,76 КБ, опубликованный 21.08.2023. Прямой URL и структура ещё не извлечены; числовые значения не импортированы.')
,('rosstat_census2020_hmao_native_language_municipal','Росстат — родной язык населения по муниципальным образованиям ХМАО, ВПН-2020, таблица 7.1','demography','https://72.rosstat.gov.ru/perepis_nas2020','Распределение населения муниципальных образований ХМАО — Югры по родному языку по итогам Всероссийской переписи населения 2020 года.','XLSX','ХМАО — Югра; муниципальные образования; переписная дата 01.10.2021','Перепись населения','identified',now(),'На странице Росстата указан XLSX размером 48,52 КБ, опубликованный 21.08.2023. Прямой URL и структура ещё не извлечены; числовые значения не импортированы.')
ON CONFLICT (id) DO UPDATE SET
 name=EXCLUDED.name,category=EXCLUDED.category,url=EXCLUDED.url,description=EXCLUDED.description,
 format=EXCLUDED.format,coverage=EXCLUDED.coverage,update_frequency=EXCLUDED.update_frequency,
 import_status=EXCLUDED.import_status,last_checked_at=now(),notes=EXCLUDED.notes,updated_at=now();
