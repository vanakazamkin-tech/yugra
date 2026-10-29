create table if not exists public.municipal_program_execution (
  id uuid primary key default gen_random_uuid(),
  municipality_id text not null references public.municipalities(id) on delete cascade,
  source_id text not null references public.data_sources(id),
  program_code text not null,
  program_name text not null,
  report_date date not null,
  approved_budget_thousand numeric,
  revised_budget_thousand numeric,
  executed_budget_thousand numeric,
  execution_percent numeric generated always as (
    case when revised_budget_thousand > 0
      then round((executed_budget_thousand / revised_budget_thousand) * 100, 2)
      else null end
  ) stored,
  source_url text not null,
  source_published_at date,
  retrieved_at timestamptz not null default now(),
  verification_status text not null default 'needs_review'
    check (verification_status in ('verified', 'needs_review')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (municipality_id, source_id, program_code, report_date)
);

create index if not exists municipal_program_execution_report_date_idx
  on public.municipal_program_execution(report_date desc);

alter table public.municipal_program_execution enable row level security;
drop policy if exists "Public can read municipal program execution" on public.municipal_program_execution;
create policy "Public can read municipal program execution" on public.municipal_program_execution
  for select to anon, authenticated using (true);
revoke insert, update, delete on public.municipal_program_execution from anon, authenticated;
grant select on public.municipal_program_execution to anon, authenticated;

insert into public.data_sources
  (id, name, category, url, description, format, coverage, update_frequency, import_status, notes, last_checked_at)
values
  ('megion_program_accessibility', 'Мегион — исполнение программы «Доступная среда»', 'municipal_programs',
   'https://opendata.admmegion.ru/datasets/ispolnenie-munitsipalnykh-programm/310822/',
   'Исполнение муниципальной программы: утверждённые, уточнённые бюджетные ассигнования и исполнение в тысячах рублей.',
   'CSV', 'Городской округ Мегион', 'Ежеквартальная',
   'partially_imported', 'На странице набора показана отчётная дата 01.07.2026; паспорт обновлён 10.10.2026. Импортирован один отчётный срез из CSV.', now()),
  ('megion_program_property', 'Мегион — исполнение программы управления муниципальным имуществом', 'municipal_programs',
   'https://opendata.admmegion.ru/datasets/ispolnenie-munitsipalnykh-programm/310816/',
   'Исполнение муниципальной программы управления муниципальным имуществом.',
   'CSV', 'Городской округ Мегион', 'Ежеквартальная',
   'partially_imported', 'На странице набора виден отчётный срез 2026 года; импортирован один срез из CSV. Паспорт обновлён в 2026 году.', now()),
  ('megion_program_mse', 'Мегион — поддержка и развитие МСП', 'municipal_programs',
   'https://opendata.admmegion.ru/datasets/ispolnenie-munitsipalnykh-programm/310768/',
   'Муниципальная программа поддержки и развития малого и среднего предпринимательства.',
   'CSV', 'Городской округ Мегион', 'Ежеквартальная',
   'identified', 'Паспорт набора указывает периодичность ежеквартальную и обновление 16.10.2026; числовой файл пока требует отдельного разбора.', now())
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

insert into public.municipal_program_execution
  (municipality_id, source_id, program_code, program_name, report_date, approved_budget_thousand, revised_budget_thousand, executed_budget_thousand, source_url, verification_status, notes)
values
  ('megion', 'megion_program_accessibility', '16.0.00.00000',
   'Формирование доступной среды для инвалидов и других маломобильных групп населения на территории города Мегиона',
   '2026-07-01', 16208.90, 26749.52, 7466.56,
   'https://opendata.admmegion.ru/datasets/ispolnenie-munitsipalnykh-programm/310822/',
   'verified',
   'Официальный набор открытых данных: строка отчётной даты 01.07.2026. Суммы в тыс. руб.; исполнение / уточнённые ассигнования рассчитываются автоматически.')
on conflict (municipality_id, source_id, program_code, report_date) do update set
  program_name = excluded.program_name,
  approved_budget_thousand = excluded.approved_budget_thousand,
  revised_budget_thousand = excluded.revised_budget_thousand,
  executed_budget_thousand = excluded.executed_budget_thousand,
  source_url = excluded.source_url,
  retrieved_at = now(),
  verification_status = excluded.verification_status,
  notes = excluded.notes,
  updated_at = now();
