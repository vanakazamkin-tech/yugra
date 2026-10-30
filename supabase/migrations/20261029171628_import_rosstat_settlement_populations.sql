alter table public.municipality_indicators
  add column if not exists geographic_level text not null default 'municipality'
    check (geographic_level in ('municipality', 'settlement', 'region', 'other'));
alter table public.municipality_indicators
  add column if not exists geographic_name text;

update public.municipality_indicators mi
set geographic_name = m.name
from public.municipalities m
where mi.municipality_id = m.id and mi.geographic_name is null;

update public.data_sources
set description = 'Официальная публикация «Регионы России. Основные социально-экономические показатели городов. 2024». Содержит численность населения отдельных городских округов и городов/населённых пунктов на 1 января 2024 года.',
    coverage = 'Частичное покрытие: 4 городских округа и 12 населённых пунктов',
    import_status = 'partially_imported',
    notes = 'Значения разделены по географическому уровню: городские округа хранятся как municipality, города и населённые пункты — как settlement. Не смешивать муниципальную территорию и населённый пункт.',
    last_checked_at = now(),
    updated_at = now()
where id = 'rosstat_city_population_2024';

insert into public.municipality_indicators
  (municipality_id, indicator_code, indicator_name, reference_year, value, unit, source_id, source_url, source_published_at, verification_status, notes, geographic_level, geographic_name)
values
  ('kogalym', 'population_settlement', 'Численность населения населённого пункта на 1 января', 2024, 63.5, 'тыс. человек', 'rosstat_city_population_2024', 'https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf', null, 'verified', 'Оценка численности города Когалым на 01.01.2024; значение в источнике приведено для города, не отдельного района.', 'settlement', 'Когалым'),
  ('nyagan-city', 'population_settlement', 'Численность населения населённого пункта на 1 января', 2024, 63.5, 'тыс. человек', 'rosstat_city_population_2024', 'https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf', null, 'verified', 'Оценка численности города Нягань на 01.01.2024.', 'settlement', 'Нягань'),
  ('megion', 'population_settlement', 'Численность населения населённого пункта на 1 января', 2024, 53.1, 'тыс. человек', 'rosstat_city_population_2024', 'https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf', null, 'verified', 'Оценка численности города Мегион на 01.01.2024. Отдельно от населения всего городского округа, опубликованного в другом источнике за 2025 год.', 'settlement', 'Мегион'),
  ('langepas', 'population_settlement', 'Численность населения населённого пункта на 1 января', 2024, 44.2, 'тыс. человек', 'rosstat_city_population_2024', 'https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf', null, 'verified', 'Оценка численности города Лангепас на 01.01.2024.', 'settlement', 'Лангепас'),
  ('raduzhny', 'population_settlement', 'Численность населения населённого пункта на 1 января', 2024, 45.6, 'тыс. человек', 'rosstat_city_population_2024', 'https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf', null, 'verified', 'Оценка численности города Радужный на 01.01.2024.', 'settlement', 'Радужный'),
  ('pyt-yah', 'population_settlement', 'Численность населения населённого пункта на 1 января', 2024, 40.5, 'тыс. человек', 'rosstat_city_population_2024', 'https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf', null, 'verified', 'Оценка численности города Пыть-Ях на 01.01.2024.', 'settlement', 'Пыть-Ях'),
  ('surgutsky', 'population_settlement', 'Численность населения населённого пункта на 1 января', 2024, 42.3, 'тыс. человек', 'rosstat_city_population_2024', 'https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf', null, 'verified', 'Оценка численности города Лянтор на 01.01.2024. Лянтор находится в Сургутском районе; это значение только для населённого пункта.', 'settlement', 'Лянтор'),
  ('uray', 'population_settlement', 'Численность населения населённого пункта на 1 января', 2024, 41.4, 'тыс. человек', 'rosstat_city_population_2024', 'https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf', null, 'verified', 'Оценка численности города Урай на 01.01.2024.', 'settlement', 'Урай'),
  ('ugorsk', 'population_settlement', 'Численность населения населённого пункта на 1 января', 2024, 39.2, 'тыс. человек', 'rosstat_city_population_2024', 'https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf', null, 'verified', 'Оценка численности города Югорск на 01.01.2024.', 'settlement', 'Югорск'),
  ('sovetsky-raion', 'population_settlement', 'Численность населения населённого пункта на 1 января', 2024, 31.3, 'тыс. человек', 'rosstat_city_population_2024', 'https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf', null, 'verified', 'Оценка численности города Советский на 01.01.2024. Не представляет всё население Советского района.', 'settlement', 'Советский'),
  ('beloyarsky-raion', 'population_settlement', 'Численность населения населённого пункта на 1 января', 2024, 19.9, 'тыс. человек', 'rosstat_city_population_2024', 'https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf', null, 'verified', 'Оценка численности города Белоярский на 01.01.2024. Не представляет всё население Белоярского района.', 'settlement', 'Белоярский'),
  ('pokachi', 'population_settlement', 'Численность населения населённого пункта на 1 января', 2024, 16.6, 'тыс. человек', 'rosstat_city_population_2024', 'https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf', null, 'verified', 'Оценка численности города Покачи на 01.01.2024.', 'settlement', 'Покачи')
on conflict (municipality_id, indicator_code, reference_year, source_id) do update set
  indicator_name = excluded.indicator_name,
  value = excluded.value,
  unit = excluded.unit,
  source_url = excluded.source_url,
  source_published_at = excluded.source_published_at,
  retrieved_at = now(),
  verification_status = excluded.verification_status,
  notes = excluded.notes,
  geographic_level = excluded.geographic_level,
  geographic_name = excluded.geographic_name,
  updated_at = now();
