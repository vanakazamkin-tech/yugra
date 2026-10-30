update public.municipality_indicators
set source_published_at = null, updated_at = now()
where source_id = 'rosstat_city_population_2024';

insert into public.data_sources
  (id, name, category, url, description, format, coverage, update_frequency, import_status, notes, last_checked_at)
values
  ('megion_admin_territorial_population', 'Открытые данные Мегиона — население на 01.01.2025', 'demography',
   'https://opendata.admmegion.ru/datasets/departament-ekonomecheskoy-politiki/34830/',
   'Паспорт административно-территориального устройства: строка по городскому округу Мегион и населению города Мегион.',
   'CSV', 'Частичное покрытие: городской округ Мегион', 'Ежегодная',
   'partially_imported',
   'Импортировано значение 59 732 человека на 01.01.2025, напрямую опубликованное в поле населения административно-территориальной единицы. Не распространять на другие муниципалитеты.',
   now()),
  ('megion_investment_sites', 'Открытые данные Мегиона — инвестиционные площадки', 'investment_sites',
   'https://opendata.admmegion.ru/datasets/upravlenie-arkhitektury-i-gradostroitelstva/76774/',
   'Муниципальный набор CSV об инвестиционных площадках: предлагаемые земельные участки, тип, форма собственности/сделки, разрешённое использование и площадь.',
   'CSV', 'Частичное покрытие: городской округ Мегион', 'Ежегодная',
   'partially_imported',
   'Внесены две уникальные записи из отображённых строк официального каталога (записи 16 и 18 из 18 строк). Остальные строки требуют полного импорта CSV и дедупликации.',
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
  ('megion', 'population_municipality', 'Численность населения городского округа на 1 января', 2025, 59732, 'человек', 'megion_admin_territorial_population', 'https://opendata.admmegion.ru/datasets/departament-ekonomecheskoy-politiki/34830/', null, 'verified', 'Опубликовано на официальном портале открытых данных Мегиона: население административно-территориальной единицы, город Мегион — 59 732 человека по состоянию на 01.01.2025.')
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

insert into public.investment_sites
  (municipality_id, source_id, external_id, name, site_type, location_text, area_hectares, land_status, offer_type, permitted_use, source_url, verification_status, source_payload)
values
  ('megion', 'megion_investment_sites', '18',
   'Северо-восточная промзона — хранение автотранспорта',
   'Гринфилд', 'город Мегион, северо-восточная промзона города, кадастровое обозначение 86:19:0010304',
   0.03, 'Неразграниченная', 'Аренда через аукцион', 'Хранение автотранспорта',
   'https://opendata.admmegion.ru/datasets/upravlenie-arkhitektury-i-gradostroitelstva/76774/',
   'verified',
   '{"source_row":18,"municipality":"городской округ Мегион","land_plot":"город Мегион, северо-восточная промзона города 86:19:0010304","site_type":"Гринфилд","ownership":"Неразграниченная","deal":"Аренда через аукцион","permitted_use":"Хранение автотранспорта","free_area_hectares":0.03,"contact":"Чабин Владимир Анатольевич"}'::jsonb),
  ('megion', 'megion_investment_sites', '16',
   'Северо-восточная промзона — производственная деятельность',
   'Гринфилд', 'город Мегион, северо-восточная промзона города, кадастровое обозначение 86:19:0010304',
   0.13, 'Неразграниченная', 'Аренда через аукцион', 'Производственная деятельность',
   'https://opendata.admmegion.ru/datasets/upravlenie-arkhitektury-i-gradostroitelstva/76774/',
   'verified',
   '{"source_row":16,"municipality":"городской округ Мегион","land_plot":"город Мегион, северо-восточная промзона города 86:19:0010304","site_type":"Гринфилд","ownership":"Неразграниченная","deal":"Аренда через аукцион","permitted_use":"Производственная деятельность","free_area_hectares":0.13,"contact":"Чабин Владимир Анатольевич"}'::jsonb)
on conflict (source_id, external_id) do update set
  municipality_id = excluded.municipality_id,
  name = excluded.name,
  site_type = excluded.site_type,
  location_text = excluded.location_text,
  area_hectares = excluded.area_hectares,
  land_status = excluded.land_status,
  offer_type = excluded.offer_type,
  permitted_use = excluded.permitted_use,
  source_url = excluded.source_url,
  source_payload = excluded.source_payload,
  verification_status = excluded.verification_status,
  retrieved_at = now(),
  updated_at = now();
