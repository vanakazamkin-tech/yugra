insert into public.municipality_indicators
  (municipality_id, indicator_code, indicator_name, reference_year, value, unit, source_id, source_url, verification_status, notes, geographic_level, geographic_name)
values
  ('khanty-mansiysk','population_male_settlement','Численность мужчин населённого пункта на 1 января',2024,53.2,'тыс. человек','rosstat_city_population_2024','https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf','verified','Оценка численности мужчин в городе Ханты-Мансийск на 01.01.2024. В источнике значения представлены с округлением до 0,1 тыс. человек.','settlement','Ханты-Мансийск'),
  ('khanty-mansiysk','population_female_settlement','Численность женщин населённого пункта на 1 января',2024,58.6,'тыс. человек','rosstat_city_population_2024','https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf','verified','Оценка численности женщин в городе Ханты-Мансийск на 01.01.2024. В источнике значения представлены с округлением до 0,1 тыс. человек.','settlement','Ханты-Мансийск'),
  ('khanty-mansiysk','population_density_settlement','Плотность населения на 1 января',2024,372.7,'человек/км²','rosstat_city_population_2024','https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf','verified','Опубликованная Росстатом плотность населения города Ханты-Мансийск на 01.01.2024.','settlement','Ханты-Мансийск'),
  ('nefteyugansk','population_male_settlement','Численность мужчин населённого пункта на 1 января',2024,59.2,'тыс. человек','rosstat_city_population_2024','https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf','verified','Оценка численности мужчин в городе Нефтеюганск на 01.01.2024. В источнике значения представлены с округлением до 0,1 тыс. человек.','settlement','Нефтеюганск'),
  ('nefteyugansk','population_female_settlement','Численность женщин населённого пункта на 1 января',2024,67.5,'тыс. человек','rosstat_city_population_2024','https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf','verified','Оценка численности женщин в городе Нефтеюганск на 01.01.2024. В источнике значения представлены с округлением до 0,1 тыс. человек.','settlement','Нефтеюганск'),
  ('nefteyugansk','population_density_settlement','Плотность населения на 1 января',2024,633.5,'человек/км²','rosstat_city_population_2024','https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf','verified','Опубликованная Росстатом плотность населения города Нефтеюганск на 01.01.2024.','settlement','Нефтеюганск'),
  ('nizhnevartovsk','population_male_settlement','Численность мужчин населённого пункта на 1 января',2024,142.8,'тыс. человек','rosstat_city_population_2024','https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf','verified','Оценка численности мужчин в городе Нижневартовск на 01.01.2024. В источнике значения представлены с округлением до 0,1 тыс. человек.','settlement','Нижневартовск'),
  ('nizhnevartovsk','population_female_settlement','Численность женщин населённого пункта на 1 января',2024,147.8,'тыс. человек','rosstat_city_population_2024','https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf','verified','Оценка численности женщин в городе Нижневартовск на 01.01.2024. В источнике значения представлены с округлением до 0,1 тыс. человек; сумма мужчин и женщин может отличаться от округлённого общего населения на 0,1 тыс. человек.','settlement','Нижневартовск'),
  ('nizhnevartovsk','population_density_settlement','Плотность населения на 1 января',2024,968.3,'человек/км²','rosstat_city_population_2024','https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf','verified','Опубликованная Росстатом плотность населения города Нижневартовск на 01.01.2024.','settlement','Нижневартовск'),
  ('surgut','population_male_settlement','Численность мужчин населённого пункта на 1 января',2024,198.7,'тыс. человек','rosstat_city_population_2024','https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf','verified','Оценка численности мужчин в городе Сургут на 01.01.2024. В источнике значения представлены с округлением до 0,1 тыс. человек.','settlement','Сургут'),
  ('surgut','population_female_settlement','Численность женщин населённого пункта на 1 января',2024,221.6,'тыс. человек','rosstat_city_population_2024','https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf','verified','Оценка численности женщин в городе Сургут на 01.01.2024. В источнике значения представлены с округлением до 0,1 тыс. человек.','settlement','Сургут'),
  ('surgut','population_density_settlement','Плотность населения на 1 января',2024,2101.5,'человек/км²','rosstat_city_population_2024','https://www.rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf','verified','Опубликованная Росстатом плотность населения города Сургут на 01.01.2024.','settlement','Сургут')
on conflict (municipality_id, indicator_code, reference_year, source_id) do update set
  indicator_name = excluded.indicator_name,
  value = excluded.value,
  unit = excluded.unit,
  source_url = excluded.source_url,
  retrieved_at = now(),
  verification_status = excluded.verification_status,
  notes = excluded.notes,
  geographic_level = excluded.geographic_level,
  geographic_name = excluded.geographic_name,
  updated_at = now();

update public.data_sources
set description = 'Официальная публикация «Регионы России. Основные социально-экономические показатели городов. 2024». Импортированы численность населения, распределение по полу и плотность для выбранных городов, а также население 12 городов/населённых пунктов.',
    coverage = 'Частичное покрытие: 4 городских округа и 12 населённых пунктов; часть показателей доступна только для 4 крупнейших городов',
    updated_at = now()
where id = 'rosstat_city_population_2024';
