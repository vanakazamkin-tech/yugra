insert into public.data_sources
(id, name, category, url, description, format, coverage, update_frequency, import_status, notes)
values (
  'municipal_ser_ugorsk_2025',
  'Администрация Югорска — отчёт главы города об итогах социально-экономического развития за 2025 год',
  'municipal_official_report',
  'https://adm.ugorsk.ru/about/info/171959/',
  'Официальный отчёт главы города Югорска перед населением об итогах 2025 года, опубликован 20.02.2026.',
  'html',
  'городской округ Югорск',
  'annual',
  'partially_imported',
  'Импортированы только показатели, прямо приведённые в тексте отчёта. Инвестиции и реальные доходы обозначены в отчёте как предварительная оценка/изменение; денежные значения бюджета округлены до млн рублей. Не использовать эти записи как детализированную бухгалтерскую отчётность. Число занятых и доля МСП в тексте даны округлённо/неполно и не импортированы.'
)
on conflict (id) do update set
 name=excluded.name, category=excluded.category, url=excluded.url,
 description=excluded.description, format=excluded.format,
 coverage=excluded.coverage, update_frequency=excluded.update_frequency,
 import_status=excluded.import_status, notes=excluded.notes, updated_at=now();

with municipality as (
  select id from public.municipalities where name = 'Югорск' limit 1
),
observations(indicator_code, indicator_name, value, unit, notes) as (
  values
  ('local_budget_revenue_reported', 'Доходы бюджета городского округа по итогам 2025 года', 7985000000::numeric, 'руб.',
   'В отчёте главы города указано 7 млрд 985 млн руб.; значение приведено с округлением до млн руб.'),
  ('local_budget_expenditure_reported', 'Расходы бюджета городского округа по итогам 2025 года', 8216000000::numeric, 'руб.',
   'В отчёте главы города указано 8 млрд 216 млн руб.; значение приведено с округлением до млн руб.'),
  ('local_budget_deficit_reported', 'Дефицит бюджета городского округа по итогам 2025 года', 230000000::numeric, 'руб.',
   'В отчёте главы города указано 230 млн руб.; значение округлено. Знак дефицита отражён в названии показателя, значение положительное.'),
  ('housing_commissioned_reported', 'Ввод жилья за 2025 год', 29000::numeric, 'кв. м',
   'В отчёте главы города: введено 29 тыс. кв. м; значение округлено до тысячи кв. м.'),
  ('real_per_capita_income_growth_preliminary', 'Изменение реальных среднедушевых денежных доходов населения за 2025 год', 3::numeric, '%',
   'Предварительная оценка, приведённая в публичном отчёте главы города: рост на 3%; показатель с учётом инфляции. Не является точным неокруглённым значением.'),
  ('fixed_capital_investment_total_preliminary', 'Инвестиции в основной капитал за 2025 год, предварительная оценка', 3000000000::numeric, 'руб.',
   'Предварительная оценка в отчёте главы города: около 3 млрд руб.; основная доля связана с градообразующим предприятием. Общий объём, не сопоставлять с серией инвестиций без добычи.'),
  ('fixed_capital_investment_growth_preliminary', 'Изменение инвестиций в основной капитал за 2025 год, предварительная оценка', 12::numeric, '%',
   'Предварительная оценка в отчёте главы города: +12% к предыдущему году. Сопоставлять только с тем же определением общего объёма инвестиций.')
)
insert into public.municipality_indicators
(municipality_id, indicator_code, indicator_name, reference_year, value, unit, source_id, source_url, source_published_at, verification_status, notes, geographic_level, geographic_name, reference_period)
select m.id, o.indicator_code, o.indicator_name, 2025, o.value, o.unit,
       'municipal_ser_ugorsk_2025', 'https://adm.ugorsk.ru/about/info/171959/',
       '2026-02-20'::date, 'verified', o.notes, 'municipality', 'Югорск', 'annual'
from municipality m cross join observations o
where not exists (
  select 1 from public.municipality_indicators x
  where x.municipality_id=m.id
    and x.indicator_code=o.indicator_code
    and x.reference_year=2025
    and x.reference_period='annual'
);
