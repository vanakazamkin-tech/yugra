-- Import verified factual SME density values for Soviet municipal district
-- from table 20 of the Khanty-Mansi Autonomous Okrug report approved by
-- Government Order No. 349-rp dated 2025-07-29. Forecast values excluded.
insert into public.data_sources
  (id, name, category, url, description, format, coverage, update_frequency, import_status, notes)
values
  ('ugra_municipal_efficiency_349rp_2024_sovetsky',
   'Сводный доклад Правительства Югры об эффективности муниципалитетов за 2024 год — Советский район',
   'regional_official_report',
   'https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/',
   'Таблица 20: число субъектов малого и среднего предпринимательства на 10 тыс. жителей за 2022–2024 годы.',
   'HTML',
   'Советский муниципальный район',
   'ежегодно',
   'partially_imported',
   'Импортированы только фактические значения 2022–2024; плановые значения 2025–2027 исключены.')
on conflict (id) do nothing;

insert into public.municipality_indicators
  (municipality_id, indicator_code, indicator_name, reference_year, reference_period, value, unit,
   source_id, source_url, verification_status, notes, geographic_level, geographic_name)
select
  'sovetsky-raion',
  'sme_per_10k',
  'Число субъектов малого и среднего предпринимательства в расчёте на 10 тыс. человек населения',
  v.reference_year,
  'annual',
  v.value,
  'единиц',
  'ugra_municipal_efficiency_349rp_2024_sovetsky',
  'https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/',
  'verified',
  'Таблица 20 сводного доклада по распоряжению Правительства ХМАО — Югры от 29.07.2025 № 349-рп. Фактическое значение; плановые годы исключены.',
  'municipality',
  'Советский муниципальный район'
from (values (2022,302.9::numeric),(2023,321.9::numeric),(2024,318.3::numeric)) as v(reference_year,value)
where not exists (
  select 1 from public.municipality_indicators m
  where m.municipality_id='sovetsky-raion'
    and m.indicator_code='sme_per_10k'
    and m.reference_year=v.reference_year
    and m.source_id='ugra_municipal_efficiency_349rp_2024_sovetsky'
);
