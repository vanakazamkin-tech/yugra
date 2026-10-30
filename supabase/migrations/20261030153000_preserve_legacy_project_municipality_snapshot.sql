-- Preserve the original pre-Supabase project dataset as an immutable, explicitly unverified snapshot.
insert into public.data_sources
  (id, name, category, url, description, format, coverage, import_status, notes)
values
  ('legacy_project_municipalities_json',
   'Исходный набор сайта — data/municipalities-detailed.json',
   'legacy_project_data',
   'https://github.com/vanakazamkin-tech/yugra/blob/feature/municipal-data-coverage-matrix/data/municipalities-detailed.json',
   'Архивный снимок исходных карточек муниципалитетов до интеграции онлайн-базы. Содержит рейтинг, баллы, инвестиции, количество субъектов МСП и оценку.',
   'JSON', '22 муниципальных образования Югры', 'identified',
   'Происхождение отдельных значений и дата статистического среза в исходном файле не указаны. Не считать официальной статистикой и не смешивать с проверенными наблюдениями. Git blob SHA: 7bbe10dbef9290abe2691b6a6a35f696cb29624d.')
on conflict (id) do update set
  name=excluded.name, category=excluded.category, url=excluded.url,
  description=excluded.description, format=excluded.format,
  coverage=excluded.coverage, notes=excluded.notes, updated_at=now();

create table if not exists public.municipality_legacy_snapshots (
  id uuid primary key default gen_random_uuid(),
  municipality_id text not null references public.municipalities(id),
  source_id text not null references public.data_sources(id),
  snapshot_key text not null,
  group_2024 text,
  rank_2024 integer,
  score integer,
  investments_volume_billion numeric,
  investments_growth_percent numeric,
  sme_count integer,
  assessment_score numeric,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified','verified','rejected')),
  notes text not null default 'Значение сохранено из исходного JSON проекта; дата и методика расчёта в файле не указаны.',
  created_at timestamptz not null default now(),
  unique (municipality_id, source_id, snapshot_key)
);
alter table public.municipality_legacy_snapshots enable row level security;
revoke all on public.municipality_legacy_snapshots from anon, authenticated;

insert into public.municipality_legacy_snapshots
  (municipality_id,source_id,snapshot_key,group_2024,rank_2024,score,investments_volume_billion,investments_growth_percent,sme_count,assessment_score)
values
('surgutsky','legacy_project_municipalities_json','pre_supabase_json','A',1,385,145.2,112,18400,4.85),
('khanty-mansiysk','legacy_project_municipalities_json','pre_supabase_json','A',2,372,98.4,108,14200,4.78),
('beloyarsky-raion','legacy_project_municipalities_json','pre_supabase_json','A',3,350,42.1,105,3500,4.70),
('nizhnevartovsky-raion','legacy_project_municipalities_json','pre_supabase_json','B',4,340,110.5,103,5100,4.65),
('uray','legacy_project_municipalities_json','pre_supabase_json','B',5,330,25.0,104,4200,4.60),
('nizhnevartovsk','legacy_project_municipalities_json','pre_supabase_json','B',6,325,65.3,102,15800,4.55),
('kondinsky-raion','legacy_project_municipalities_json','pre_supabase_json','B',7,315,18.2,101,2100,4.50),
('langepas','legacy_project_municipalities_json','pre_supabase_json','B',8,310,15.6,104,3100,4.48),
('october-raion','legacy_project_municipalities_json','pre_supabase_json','B',9,305,20.4,100,2800,4.45),
('berezovsky-raion','legacy_project_municipalities_json','pre_supabase_json','B',10,298,12.1,99,1900,4.40),
('pyt-yah','legacy_project_municipalities_json','pre_supabase_json','B',11,292,19.8,102,3400,4.38),
('raduzhny','legacy_project_municipalities_json','pre_supabase_json','B',12,288,14.2,101,3200,4.35),
('megion','legacy_project_municipalities_json','pre_supabase_json','B',13,285,22.4,100,4100,4.30),
('pokachi','legacy_project_municipalities_json','pre_supabase_json','B',14,280,11.5,103,1800,4.28),
('ugorsk','legacy_project_municipalities_json','pre_supabase_json','B',15,275,24.1,105,4500,4.25),
('surgut','legacy_project_municipalities_json','pre_supabase_json','B',16,270,185.0,110,32000,4.20),
('nefteyugansk','legacy_project_municipalities_json','pre_supabase_json','B',17,265,54.2,102,9800,4.15),
('kogalym','legacy_project_municipalities_json','pre_supabase_json','B',18,260,48.6,104,5400,4.10),
('nefteyugansky-raion','legacy_project_municipalities_json','pre_supabase_json','B',19,255,75.4,101,4600,4.05),
('nyagan-city','legacy_project_municipalities_json','pre_supabase_json','B',20,250,31.2,106,5100,4.00),
('khanty-mansiysky-raion','legacy_project_municipalities_json','pre_supabase_json','B',21,245,16.8,98,2200,3.95),
('sovetsky-raion','legacy_project_municipalities_json','pre_supabase_json','B',22,240,21.0,100,3900,3.90)
on conflict (municipality_id,source_id,snapshot_key) do update set
  group_2024=excluded.group_2024, rank_2024=excluded.rank_2024,
  score=excluded.score, investments_volume_billion=excluded.investments_volume_billion,
  investments_growth_percent=excluded.investments_growth_percent,
  sme_count=excluded.sme_count, assessment_score=excluded.assessment_score,
  notes=excluded.notes;
