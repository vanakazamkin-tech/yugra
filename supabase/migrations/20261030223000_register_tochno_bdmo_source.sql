-- Register the updated Rosstat municipal statistics dataset for controlled extraction.
insert into public.data_sources (id,name,category,url,description,format,coverage,update_frequency,import_status,notes)
values ('tochno_bdmo_2026','Муниципальная статистика России с 2005 года — обработка данных БД ПМО Росстата','official_statistics','https://tochno.st/datasets/bdmo','603 показателя по муниципальным образованиям за 2005–2025 годы; данные из БД ПМО Росстата, плоский формат, лицензия CC BY.','XLSX/CSV/PARQUET','Муниципальные образования России, включая ХМАО — Югру; уровень МО верхнего уровня.','обновляется','identified','Перед импортом необходимы выборка и сверка кодов ОКТМО, методологии и разрезов; не считать данные уже загруженными.')
on conflict (id) do nothing;
