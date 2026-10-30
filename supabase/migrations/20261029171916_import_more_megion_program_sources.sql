insert into public.municipal_program_execution
  (municipality_id, source_id, program_code, program_name, report_date, approved_budget_thousand, revised_budget_thousand, executed_budget_thousand, source_url, verification_status, notes)
values
  ('megion', 'megion_program_property', '10.4.00.00000',
   'Управление муниципальным имуществом города Мегиона',
   '2026-07-01', 26367.3, 24410.0, 13349.8,
   'https://opendata.admmegion.ru/datasets/ispolnenie-munitsipalnykh-programm/310816/',
   'verified',
   'Официальный набор открытых данных: отображённая строка отчётного среза 2026 года. Суммы в тыс. руб.; исполнение / уточнённые ассигнования рассчитываются автоматически.')
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

insert into public.data_sources
  (id, name, category, url, description, format, coverage, update_frequency, import_status, notes, last_checked_at)
values
  ('megion_program_housing', 'Мегион — исполнение программы развития жилищной сферы', 'municipal_programs',
   'https://opendata.admmegion.ru/datasets/ispolnenie-munitsipalnykh-programm/310786/',
   'Квартальный отчёт об исполнении муниципальной программы развития жилищной сферы.',
   'CSV', 'Городской округ Мегион', 'Ежеквартальная',
   'identified', 'Добавлено в каталог источников; показатели требуют извлечения из полного CSV.', now()),
  ('megion_program_transport', 'Мегион — исполнение программы развития транспортной системы', 'municipal_programs',
   'https://opendata.admmegion.ru/datasets/ispolnenie-munitsipalnykh-programm/310804/',
   'Квартальный отчёт об исполнении муниципальной программы развития транспортной системы города.',
   'CSV', 'Городской округ Мегион', 'Ежеквартальная',
   'identified', 'Добавлено в каталог источников; показатели требуют извлечения из полного CSV.', now()),
  ('megion_program_urban_environment', 'Мегион — комфортная городская среда', 'municipal_programs',
   'https://opendata.admmegion.ru/datasets/ispolnenie-munitsipalnykh-programm/310825/',
   'Квартальный отчёт об исполнении программы формирования комфортной городской среды.',
   'CSV', 'Городской округ Мегион', 'Ежеквартальная',
   'identified', 'Добавлено в каталог источников; показатели требуют извлечения из полного CSV.', now()),
  ('megion_program_housing_utilities', 'Мегион — развитие ЖКК и энергоэффективность', 'municipal_programs',
   'https://opendata.admmegion.ru/datasets/ispolnenie-munitsipalnykh-programm/310783/',
   'Муниципальная программа развития жилищно-коммунального комплекса и повышения энергетической эффективности.',
   'CSV', 'Городской округ Мегион', 'Ежеквартальная',
   'identified', 'Добавлено в каталог источников; паспорт указывает CSV, конкретные строки требуют извлечения.', now()),
  ('megion_budget_income', 'Мегион — отчёт об исполнении бюджета: доходы', 'municipal_budget',
   'https://opendata.admmegion.ru/datasets/byudzhet/47190/',
   'Помесячный CSV с исполнением доходов бюджета городского округа; доступна история версий.',
   'CSV', 'Городской округ Мегион', 'Ежемесячная',
   'identified', 'Паспорт страницы показывает 235 строк и историю обновлений. До публикации агрегатов необходимо определить отчётный период и не суммировать вложенные коды строк.', now()),
  ('megion_budget_expenditure', 'Мегион — отчёт об исполнении бюджета: расходы', 'municipal_budget',
   'https://opendata.admmegion.ru/datasets/byudzhet/47196/',
   'Отчёт об исполнении расходов бюджета городского округа.',
   'CSV', 'Городской округ Мегион', 'Ежемесячная',
   'identified', 'Добавлено в реестр; требуется нормализация строк бюджета и периодов.', now())
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
