-- ============================================================
-- Таблица муниципалитетов Югры
-- ============================================================

create table if not exists public.municipalities (
  id                          text primary key,
  name                        text not null,
  group_2024                  text,              -- 'A' / 'B'
  rank_2024                   integer,
  score                       integer,           -- агрегированный балл рейтинга
  investments_volume_billion  numeric(10,2),     -- объём инвестиций, млрд ₽
  investments_growth_percent  numeric(6,2),      -- рост инвестиций, %
  sme_count                   integer,           -- кол-во субъектов МСП
  assessment_score            numeric(4,2),      -- интегральная оценка (0–5)
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now()
);

-- ============================================================
-- RLS: публичное чтение, запись только для service_role
-- ============================================================

alter table public.municipalities enable row level security;

create policy "Municipalities are publicly readable"
  on public.municipalities
  for select
  using ( true );

-- Обновление updated_at при апдейте
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_municipalities_updated_at on public.municipalities;
create trigger trg_municipalities_updated_at
  before update on public.municipalities
  for each row execute function public.set_updated_at();

-- ============================================================
-- Начальные данные (22 муниципалитета)
-- ============================================================

insert into public.municipalities
  (id, name, group_2024, rank_2024, score,
   investments_volume_billion, investments_growth_percent, sme_count, assessment_score)
values
  ('surgutsky',            'Сургутский район',         'A',  1, 385, 145.20, 112, 18400, 4.85),
  ('khanty-mansiysk',      'Ханты-Мансийск',           'A',  2, 372,  98.40, 108, 14200, 4.78),
  ('beloyarsky-raion',     'Белоярский район',         'A',  3, 350,  42.10, 105,  3500, 4.70),
  ('nizhnevartovsky-raion','Нижневартовский район',    'B',  4, 340, 110.50, 103,  5100, 4.65),
  ('uray',                 'Урай',                      'B',  5, 330,  25.00, 104,  4200, 4.60),
  ('nizhnevartovsk',       'Нижневартовск',            'B',  6, 325,  65.30, 102, 15800, 4.55),
  ('kondinsky-raion',      'Кондинский район',         'B',  7, 315,  18.20, 101,  2100, 4.50),
  ('langepas',             'Лангепас',                  'B',  8, 310,  15.60, 104,  3100, 4.48),
  ('october-raion',        'Октябрьский район',        'B',  9, 305,  20.40, 100,  2800, 4.45),
  ('berezovsky-raion',     'Берёзовский район',        'B', 10, 298,  12.10,  99,  1900, 4.40),
  ('pyt-yah',              'Пыть-Ях',                   'B', 11, 292,  19.80, 102,  3400, 4.38),
  ('raduzhny',             'Радужный',                  'B', 12, 288,  14.20, 101,  3200, 4.35),
  ('megion',               'Мегион',                    'B', 13, 285,  22.40, 100,  4100, 4.30),
  ('pokachi',              'Покачи',                    'B', 14, 280,  11.50, 103,  1800, 4.28),
  ('ugorsk',               'Югорск',                    'B', 15, 275,  24.10, 105,  4500, 4.25),
  ('surgut',               'Сургут',                    'B', 16, 270, 185.00, 110, 32000, 4.20),
  ('nefteyugansk',         'Нефтеюганск',              'B', 17, 265,  54.20, 102,  9800, 4.15),
  ('kogalym',              'Когалым',                   'B', 18, 260,  48.60, 104,  5400, 4.10),
  ('nefteyugansky-raion',  'Нефтеюганский район',      'B', 19, 255,  75.40, 101,  4600, 4.05),
  ('nyagan-city',          'Нягань',                    'B', 20, 250,  31.20, 106,  5100, 4.00),
  ('khanty-mansiysky-raion','Ханты-Мансийский район',  'B', 21, 245,  16.80,  98,  2200, 3.95),
  ('sovetsky-raion',       'Советский район',          'B', 22, 240,   null, null,  null, 3.90)
on conflict (id) do update set
  name                       = excluded.name,
  group_2024                 = excluded.group_2024,
  rank_2024                  = excluded.rank_2024,
  score                      = excluded.score,
  investments_volume_billion = excluded.investments_volume_billion,
  investments_growth_percent = excluded.investments_growth_percent,
  sme_count                  = excluded.sme_count,
  assessment_score           = excluded.assessment_score;

-- Индексы для типичных фильтров/сортировок
create index if not exists idx_municipalities_group  on public.municipalities(group_2024);
create index if not exists idx_municipalities_rank   on public.municipalities(rank_2024);
create index if not exists idx_municipalities_score  on public.municipalities(score desc);