-- Register the HMAO census table cross-tabulating ethnicity and native language.
-- Metadata only; the source is regional and must not be disaggregated to municipalities.
INSERT INTO public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,last_checked_at,notes)
VALUES
('rosstat_census2020_hmao_native_language_by_ethnicity_regional','Росстат — население наиболее многочисленных национальностей по родному языку ХМАО, ВПН-2020, том 5, таблица 8','demography','https://72.rosstat.gov.ru/perepis_nas2020','Распределение населения наиболее многочисленных национальностей по указанному родному языку. Источник позволяет сопоставить национальную принадлежность и самоопределённый родной язык на уровне ХМАО.','XLSX','ХМАО — Югра; региональный уровень, без муниципальной разбивки; переписная дата 01.10.2021','Перепись населения','identified',now(),'Официальный перечень Тюменьстата: XLSX 476,87 КБ, опубликован 05.06.2023. Не является муниципальной таблицей; не распределять значения на 22 муниципалитета. Проверить состав наиболее многочисленных национальностей, отдельное наличие ханты и манси, категории языка, пропуски и контрольные суммы.')
ON CONFLICT (id) DO UPDATE SET
 name=EXCLUDED.name,category=EXCLUDED.category,url=EXCLUDED.url,description=EXCLUDED.description,
 format=EXCLUDED.format,coverage=EXCLUDED.coverage,update_frequency=EXCLUDED.update_frequency,
 import_status=EXCLUDED.import_status,last_checked_at=now(),notes=EXCLUDED.notes,updated_at=now();
