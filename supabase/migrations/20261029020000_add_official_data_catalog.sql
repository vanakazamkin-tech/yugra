-- Registry for official sources and normalized municipality-level indicators.
-- Existing dashboard values are not auto-marked as official.
create table if not exists public.data_sources (
  id text primary key,
  name text not null,
  category text not null,
  url text not null,
  description text not null,
  format text,
  coverage text,
  update_frequency text,
  import_status text not null default 'identified'
    check (import_status in ('identified', 'ready_for_import', 'partially_imported', 'imported', 'access_issue')),
  last_checked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.municipality_indicators (
  id uuid primary key default gen_random_uuid(),
  municipality_id text not null references public.municipalities(id) on delete cascade,
  indicator_code text not null,
  indicator_name text not null,
  reference_year integer not null check (reference_year between 1900 and 2200),
  value numeric not null,
  unit text not null,
  source_id text not null references public.data_sources(id),
  source_url text not null,
  source_published_at date,
  retrieved_at timestamptz not null default now(),
  verification_status text not null default 'needs_review'
    check (verification_status in ('verified', 'needs_review', 'demonstration')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (municipality_id, indicator_code, reference_year, source_id)
);

create index if not exists municipality_indicators_muni_year_idx
  on public.municipality_indicators (municipality_id, reference_year desc);
create index if not exists municipality_indicators_code_year_idx
  on public.municipality_indicators (indicator_code, reference_year desc);
create index if not exists data_sources_category_idx on public.data_sources (category);

create table if not exists public.investment_sites (
  id uuid primary key default gen_random_uuid(),
  municipality_id text not null references public.municipalities(id) on delete cascade,
  source_id text not null references public.data_sources(id),
  external_id text,
  name text not null,
  site_type text,
  location_text text,
  area_hectares numeric,
  land_status text,
  offer_type text,
  permitted_use text,
  source_url text not null,
  source_updated_at date,
  source_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(source_payload) = 'object'),
  verification_status text not null default 'needs_review'
    check (verification_status in ('verified', 'needs_review')),
  retrieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, external_id)
);

create index if not exists investment_sites_municipality_idx
  on public.investment_sites (municipality_id);

alter table public.data_sources enable row level security;
alter table public.municipality_indicators enable row level security;
alter table public.investment_sites enable row level security;

drop policy if exists "Public can read data sources" on public.data_sources;
create policy "Public can read data sources" on public.data_sources
  for select to anon, authenticated using (true);

drop policy if exists "Public can read municipality indicators" on public.municipality_indicators;
create policy "Public can read municipality indicators" on public.municipality_indicators
  for select to anon, authenticated using (true);

drop policy if exists "Public can read investment sites" on public.investment_sites;
create policy "Public can read investment sites" on public.investment_sites
  for select to anon, authenticated using (true);

revoke insert, update, delete on public.data_sources from anon, authenticated;
revoke insert, update, delete on public.municipality_indicators from anon, authenticated;
revoke insert, update, delete on public.investment_sites from anon, authenticated;
grant select on public.data_sources to anon, authenticated;
grant select on public.municipality_indicators to anon, authenticated;
grant select on public.investment_sites to anon, authenticated;

insert into public.data_sources
  (id, name, category, url, description, format, coverage, update_frequency, import_status, notes)
values
  ('rosstat_municipal', 'Росстат — База данных показателей муниципальных образований', 'official_statistics',
   'https://www.rosstat.gov.ru/storage/mediabank/MUNST.htm',
   'Официальная статистика по муниципальным образованиям: социально-экономические показатели и бюджетные данные.',
   'HTML / XLSX', 'Российская Федерация; охват конкретных показателей проверяется отдельно', 'По графику Росстата',
   'identified', 'Проверять справочник и границы муниципальных образований каждого года.'),
  ('rosstat_population_2025', 'Росстат — численность населения по муниципальным образованиям на 01.01.2025', 'demography',
   'https://rosstat.gov.ru/folder/12781',
   'Официальная таблица численности постоянного населения по муниципальным образованиям на 1 января 2025 года.',
   'XLSX', 'Российская Федерация; необходимо сопоставить названия и территориальные границы', 'Годовая',
   'ready_for_import', 'Официальная страница содержит XLSX; значения должны быть извлечены из файла до публикации.'),
  ('emiss', 'Росстат — ЕМИСС', 'official_statistics',
   'https://rosstat.gov.ru/emiss',
   'Единая межведомственная информационно-статистическая система: реестр официальных статистических показателей.',
   'Веб-портал', 'Зависит от конкретного показателя', 'По показателю',
   'identified', 'Использовать только показатели с муниципальной детализацией и совместимой методикой.'),
  ('rosstat_sme', 'Росстат — статистика малого и среднего предпринимательства', 'business',
   'https://www.rosstat.gov.ru/folder/210/document/13223',
   'Федеральные и региональные материалы по малому и среднему предпринимательству.',
   'Публикации / XLSX', 'Проверить детализацию; региональный показатель не считать муниципальным', 'Годовая',
   'identified', 'Вносить муниципальные значения только при наличии отдельного муниципального ряда.'),
  ('investugra_portal', 'Инвестиционный портал Югры', 'investments',
   'https://investugra.ru/',
   'Инвестиционные предложения, проекты, инфраструктура и меры поддержки.',
   'Веб-портал', 'Регион и муниципалитеты по карточкам отдельных проектов', 'По обновлению портала',
   'identified', 'Извлекать только опубликованные с привязкой к территории проекты и площадки; это не статистика фактических инвестиций.'),
  ('investugra_map', 'Инвестиционная карта Югры', 'investment_sites',
   'https://map.investugra.ru/',
   'Географические инвестиционные площадки и инфраструктурные предложения.',
   'Веб-карта', 'По объектам карты', 'По обновлению карты',
   'identified', 'Сохранять страницу объекта и дату получения; отдельно помечать предлагаемые и действующие площадки.'),
  ('megion_investment_sites', 'Открытые данные Мегиона — инвестиционные площадки', 'investment_sites',
   'https://opendata.admmegion.ru/datasets/upravlenie-arkhitektury-i-gradostroitelstva/76774/',
   'Муниципальный набор CSV о площадках: земельные участки, тип площадки, форма предложения и разрешённое использование.',
   'CSV', 'Город Мегион; частичное покрытие одного муниципалитета', 'Ежегодная',
   'ready_for_import', 'Не экстраполировать число площадок на другие муниципалитеты. Сохранить исходную CSV-версию и дату обновления.'),
  ('megion_open_data', 'Портал открытых данных Мегиона', 'municipal_open_data',
   'https://opendata.admmegion.ru/datasets/',
   'Каталог муниципальных наборов: бюджет, исполнение программ, недвижимость, строительство, предприятия, образование, транспорт и демография.',
   'CSV / наборы портала', 'Город Мегион; частичное покрытие одного муниципалитета', 'Различается по набору',
   'identified', 'Каждый набор заносить отдельно с собственным URL, периодом и правилами актуализации.'),
  ('megion_sme_program', 'Мегион — программа поддержки и развития МСП', 'business',
   'https://opendata.admmegion.ru/datasets/',
   'Муниципальный открытый набор об исполнении программы поддержки и развития предпринимательства.',
   'CSV / набор портала', 'Город Мегион; частичное покрытие одного муниципалитета', 'По паспорту набора',
   'identified', 'Не является эквивалентом общего числа субъектов МСП.')
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  url = excluded.url,
  description = excluded.description,
  format = excluded.format,
  coverage = excluded.coverage,
  update_frequency = excluded.update_frequency,
  notes = excluded.notes,
  updated_at = now();
