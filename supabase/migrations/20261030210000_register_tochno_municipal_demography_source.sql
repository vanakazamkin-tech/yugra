-- Register a separate processed municipal-demography dataset.
-- It is not the same as the current Rosstat BDMO section-31 export and uses
-- harmonized boundaries plus a recalculated population series.
insert into public.data_sources
  (id,name,category,url,description,format,coverage,update_frequency,import_status,notes)
values
  ('tochno_mun_demography_2026',
   'Демографические показатели муниципальных образований России — Росстат, обработка «Если быть точным»',
   'processed_official_statistics',
   'https://tochno.st/datasets/mun_demography',
   'Численность населения, рождаемость, смертность, миграционный прирост и коэффициенты демографического движения по муниципальным образованиям верхнего уровня.',
   'CSV; XLSX',
   '2284 муниципальных района, городских и муниципальных округов из 78 регионов России; заявленный период 2010–2023. Наличие ХМАО — Югры и соответствие 22 муниципалитетам проекта требуют проверки по файлу.',
   'не обновляется; версия страницы от 03.08.2026',
   'identified',
   'Обработанная копия данных Росстата, лицензия Creative Commons BY 4.0. Сетка муниципальных образований гармонизирована для временной сопоставимости; численность населения пересчитана методом демографического баланса от переписи 2010 года. Не смешивать с прямыми рядами БД ПМО без проверки методики. CSV UTF-8, разделитель «;». До загрузки файла и сверки кодов/ОКТМО значения не импортировать.')
on conflict (id) do update set
  name=excluded.name,category=excluded.category,url=excluded.url,description=excluded.description,
  format=excluded.format,coverage=excluded.coverage,update_frequency=excluded.update_frequency,
  notes=excluded.notes;
