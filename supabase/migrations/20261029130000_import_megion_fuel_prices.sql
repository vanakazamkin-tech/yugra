create table if not exists public.fuel_price_observations (
  id uuid primary key default gen_random_uuid(),
  municipality_id text not null references public.municipalities(id) on delete cascade,
  source_id text not null references public.data_sources(id),
  source_row integer not null,
  observed_at date not null,
  station_name text not null,
  company_name text,
  address text,
  latitude numeric,
  longitude numeric,
  gasoline_80 numeric,
  gasoline_92 numeric,
  gasoline_95 numeric,
  gasoline_98 numeric,
  gasoline_100 numeric,
  butane numeric,
  propane numeric,
  diesel numeric,
  methane numeric,
  value_unit text not null default 'не указана в паспорте источника',
  source_url text not null,
  source_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(source_payload)='object'),
  verification_status text not null default 'needs_review'
    check (verification_status in ('verified','needs_review')),
  retrieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, observed_at, source_row)
);
create index if not exists fuel_price_observations_date_idx
  on public.fuel_price_observations(observed_at desc);
create index if not exists fuel_price_observations_municipality_idx
  on public.fuel_price_observations(municipality_id, observed_at desc);
alter table public.fuel_price_observations enable row level security;
drop policy if exists "Public can read verified fuel prices" on public.fuel_price_observations;
create policy "Public can read verified fuel prices" on public.fuel_price_observations
  for select to anon, authenticated using (verification_status='verified');
revoke insert, update, delete on public.fuel_price_observations from anon, authenticated;
grant select on public.fuel_price_observations to anon, authenticated;

insert into public.data_sources
  (id,name,category,url,description,format,coverage,update_frequency,import_status,notes,last_checked_at)
values
  ('megion_fuel_prices','Мегион — цены на топливо по АЗС','fuel_prices',
   'https://opendata.admmegion.ru/datasets/svedeniya/87789/',
   'Еженедельный CSV по заправочным станциям: бензин различных марок, бутан, пропан, дизель и метан.',
   'CSV','Город Мегион и посёлок Высокий; станционный уровень','Еженедельно','partially_imported',
   'Импортирована версия, опубликованная 28.10.2026, 9 строк. Единица измерения в таблице явно не указана. Пусто/«-» хранится как NULL; исходные нулевые значения сохранены в source_payload, но исключены из аналитических чисел, так как не выглядят валидной розничной ценой.',
   now())
on conflict (id) do update set
 name=excluded.name,category=excluded.category,url=excluded.url,description=excluded.description,
 format=excluded.format,coverage=excluded.coverage,update_frequency=excluded.update_frequency,
 import_status=excluded.import_status,notes=excluded.notes,last_checked_at=now(),updated_at=now();

insert into public.fuel_price_observations
 (municipality_id,source_id,source_row,observed_at,station_name,company_name,address,
  gasoline_80,gasoline_92,gasoline_95,gasoline_98,gasoline_100,butane,propane,diesel,methane,
  source_url,source_payload,verification_status)
values
 ('megion','megion_fuel_prices',1,'2026-10-28','АЗС 117','ООО "Логрус"','г. Мегион, ул. Транспортная, 22а',
  null,109.00,112.00,null,null,null,null,124.00,null,
  'https://opendata.admmegion.ru/datasets/svedeniya/87789/',
  '{"row":1,"version_date":"2026-10-28","gasoline_80":"","gasoline_92":"109,00","gasoline_95":"112,00","gasoline_98":"-","gasoline_100":"-","butane":"-","propane":"-","diesel":"124,00","methane":"-","unit":"not_explicitly_stated"}'::jsonb,'verified'),
 ('megion','megion_fuel_prices',2,'2026-10-28','АЗС','ООО «МегионСибирьСервис»','п. Высокий, ул. Ленина, 15, корпус 2',
  null,null,null,null,null,null,null,null,null,
  'https://opendata.admmegion.ru/datasets/svedeniya/87789/',
  '{"row":2,"version_date":"2026-10-28","gasoline_80":"","gasoline_92":"-","gasoline_95":"-","gasoline_98":"-","gasoline_100":"-","butane":"-","propane":"-","diesel":"-","methane":"-","unit":"not_explicitly_stated"}'::jsonb,'verified'),
 ('megion','megion_fuel_prices',3,'2026-10-28','АЗС №6','ИП Поляков А.Г.','г. Мегион, ул. Транспортная, 15, стр. 2',
  null,78.70,82.50,null,null,null,null,null,null,
  'https://opendata.admmegion.ru/datasets/svedeniya/87789/',
  '{"row":3,"version_date":"2026-10-28","gasoline_80":"","gasoline_92":"78,70","gasoline_95":"82,50","gasoline_98":"-","gasoline_100":"-","butane":"-","propane":"-","diesel":"0,00","methane":"-","note":"zero diesel value retained as raw source payload, normalized price left NULL","unit":"not_explicitly_stated"}'::jsonb,'verified'),
 ('megion','megion_fuel_prices',4,'2026-10-28','АЗС №1','ООО "Логрус"','г. Мегион, ул. Западная, 6/1',
  null,109.00,112.00,null,null,null,null,124.00,null,
  'https://opendata.admmegion.ru/datasets/svedeniya/87789/',
  '{"row":4,"version_date":"2026-10-28","gasoline_80":"","gasoline_92":"109,00","gasoline_95":"112,00","gasoline_98":"-","gasoline_100":"-","butane":"-","propane":"-","diesel":"124,00","methane":"-","unit":"not_explicitly_stated"}'::jsonb,'verified'),
 ('megion','megion_fuel_prices',5,'2026-10-28','АЗС №2','ООО "Логрус"','г. Мегион, ул. Новая, 9',
  null,109.00,112.00,null,null,null,null,124.00,null,
  'https://opendata.admmegion.ru/datasets/svedeniya/87789/',
  '{"row":5,"version_date":"2026-10-28","gasoline_80":"","gasoline_92":"109,00","gasoline_95":"112,00","gasoline_98":"-","gasoline_100":"-","butane":"-","propane":"-","diesel":"124,00","methane":"-","unit":"not_explicitly_stated"}'::jsonb,'verified'),
 ('megion','megion_fuel_prices',6,'2026-10-28','АГЗС №1','АО «Мегионгазсервис»','Северная зона',
  null,null,null,null,null,null,39.50,null,null,
  'https://opendata.admmegion.ru/datasets/svedeniya/87789/',
  '{"row":6,"version_date":"2026-10-28","gasoline_80":"","gasoline_92":"-","gasoline_95":"-","gasoline_98":"-","gasoline_100":"-","butane":"-","propane":"39,50","diesel":"-","methane":"-","unit":"not_explicitly_stated"}'::jsonb,'verified'),
 ('megion','megion_fuel_prices',7,'2026-10-28','АГЗС №2','АО «Мегионгазсервис»','г. Мегион, ул. Александра Жагрина, 1',
  null,null,null,null,null,null,39.50,null,null,
  'https://opendata.admmegion.ru/datasets/svedeniya/87789/',
  '{"row":7,"version_date":"2026-10-28","gasoline_80":"","gasoline_92":"-","gasoline_95":"-","gasoline_98":"-","gasoline_100":"-","butane":"-","propane":"39,50","diesel":"-","methane":"-","unit":"not_explicitly_stated"}'::jsonb,'verified'),
 ('megion','megion_fuel_prices',8,'2026-10-28','АЗС','ООО «Промнефтепродукт»','г. Мегион, ул. Новая, 37',
  null,69.50,79.00,98.00,null,null,null,null,null,
  'https://opendata.admmegion.ru/datasets/svedeniya/87789/',
  '{"row":8,"version_date":"2026-10-28","gasoline_80":"","gasoline_92":"69,50","gasoline_95":"79,00","gasoline_98":"98,00","gasoline_100":"-","butane":"-","propane":"-","diesel":"0,00","methane":"-","note":"zero diesel value retained as raw source payload, normalized price left NULL","unit":"not_explicitly_stated"}'::jsonb,'verified'),
 ('megion','megion_fuel_prices',9,'2026-10-28','АЗС №16','ООО "Петролстарт"','г. Мегион, Северная промзона',
  null,83.70,109.20,null,null,null,null,98.20,null,
  'https://opendata.admmegion.ru/datasets/svedeniya/87789/',
  '{"row":9,"version_date":"2026-10-28","gasoline_80":"","gasoline_92":"83,70","gasoline_95":"109,2","gasoline_98":"-","gasoline_100":"-","butane":"-","propane":"-","diesel":"98,20","methane":"-","unit":"not_explicitly_stated"}'::jsonb,'verified')
on conflict (source_id,observed_at,source_row) do update set
 station_name=excluded.station_name,company_name=excluded.company_name,address=excluded.address,
 gasoline_80=excluded.gasoline_80,gasoline_92=excluded.gasoline_92,gasoline_95=excluded.gasoline_95,
 gasoline_98=excluded.gasoline_98,gasoline_100=excluded.gasoline_100,butane=excluded.butane,
 propane=excluded.propane,diesel=excluded.diesel,methane=excluded.methane,
 source_url=excluded.source_url,source_payload=excluded.source_payload,
 verification_status=excluded.verification_status,retrieved_at=now(),updated_at=now();
