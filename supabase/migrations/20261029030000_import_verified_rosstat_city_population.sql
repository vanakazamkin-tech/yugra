insert into public.data_sources
  (id, name, category, url, description, format, coverage, update_frequency, import_status, notes, last_checked_at)
values
  ('rosstat_city_population_2024', 'Росстат — города Югры: численность населения на 01.01.2024', 'demography',
   'https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf',
   'Официальная публикация «Регионы России. Основные социально-экономические показатели городов. 2024». Для ряда городов в ней отдельно указано население городского округа.',
   'PDF', 'Частичное покрытие: подтверждены 4 городских округа', 'Годовая',
   'partially_imported',
   'Импортированы только четыре значения, явно опубликованные как численность населения городского округа на 1 января 2024 г. Значения для населённых пунктов и районов не смешиваются с этим рядом.',
   now())
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  url = excluded.url,
  description = excluded.description,
  format = excluded.format,
  coverage = excluded.coverage,
  update_frequency = excluded.update_frequency,
  import_status = excluded.import_status,
  notes = excluded.notes,
  last_checked_at = now(),
  updated_at = now();

insert into public.municipality_indicators
  (municipality_id, indicator_code, indicator_name, reference_year, value, unit, source_id, source_url, source_published_at, verification_status, notes)
values
  ('khanty-mansiysk', 'population_municipality', 'Численность населения городского округа на 1 января', 2024, 111.8, 'тыс. человек', 'rosstat_city_population_2024', 'https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf', '2024-01-01', 'verified', 'Официальная оценка на 1 января 2024 г.; источник явно называет городской округ Ханты-Мансийск.'),
  ('nefteyugansk', 'population_municipality', 'Численность населения городского округа на 1 января', 2024, 126.7, 'тыс. человек', 'rosstat_city_population_2024', 'https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf', '2024-01-01', 'verified', 'Официальная оценка на 1 января 2024 г.; источник явно называет городской округ Нефтеюганск.'),
  ('nizhnevartovsk', 'population_municipality', 'Численность населения городского округа на 1 января', 2024, 290.5, 'тыс. человек', 'rosstat_city_population_2024', 'https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf', '2024-01-01', 'verified', 'Официальная оценка на 1 января 2024 г.; источник явно называет городской округ Нижневартовск.'),
  ('surgut', 'population_municipality', 'Численность населения городского округа на 1 января', 2024, 420.3, 'тыс. человек', 'rosstat_city_population_2024', 'https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf', '2024-01-01', 'verified', 'Официальная оценка на 1 января 2024 г.; источник явно называет городской округ Сургут.')
on conflict (municipality_id, indicator_code, reference_year, source_id) do update set
  indicator_name = excluded.indicator_name,
  value = excluded.value,
  unit = excluded.unit,
  source_url = excluded.source_url,
  source_published_at = excluded.source_published_at,
  retrieved_at = now(),
  verification_status = excluded.verification_status,
  notes = excluded.notes,
  updated_at = now();
