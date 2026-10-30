-- Import preliminary 2025 SME and refined investment indicators for Yugorsk.
-- Source: official investment message of the Head of Yugorsk.
-- All 2025 values below are explicitly preliminary; do not present as final annual statistics.

insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,last_checked_at,notes)
values
('ugorsk_investment_message_2025',
 'Администрация Югорска — инвестиционное послание главы города за 2025 год',
 'municipal_official_report',
 'https://admugorsk.ru/about/statistics/ekonomika/investitsionnaya-deyatelnost/investitsionnoe-poslanie-glavy-goroda-.php',
 'Официальное инвестиционное послание: предварительные итоги инвестиционной деятельности и показатели субъектов МСП за 2025 год.',
 'web_page',
 'Югорск, 2025',
 'annual',
 'partially_imported',
 now(),
 'Значения за 2025 год опубликованы как предварительные. Налоговые поступления 203,1 млн руб. относятся к налогам по совокупному доходу от субъектов МСП, а не ко всем налоговым доходам бюджета.')
on conflict (id) do update set
 name=excluded.name, url=excluded.url, description=excluded.description,
 import_status=excluded.import_status, last_checked_at=now(), notes=excluded.notes;

insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,value,unit,source_id,source_url,retrieved_at,verification_status,notes,geographic_level,geographic_name,reference_period)
select m.id, v.code, v.indicator_name, 2025, v.value, v.unit,
 'ugorsk_investment_message_2025',
 'https://admugorsk.ru/about/statistics/ekonomika/investitsionnaya-deyatelnost/investitsionnoe-poslanie-glavy-goroda-.php',
 now(), 'verified', v.notes, 'municipality', 'Югорск', 'annual'
from public.municipalities m
cross join (values
 ('sme_entities_count','Количество субъектов малого и среднего предпринимательства',1242::numeric,'ед.','На конец 2025 года.'),
 ('sme_entities_growth','Темп роста количества субъектов МСП',3.8::numeric,'%','Предварительный показатель за 2025 год.'),
 ('sme_tax_revenue_aggregate_income','Поступления налогов по совокупному доходу от субъектов МСП',203100000::numeric,'руб.','Только налоги по совокупному доходу от МСП; не все налоговые поступления бюджета.'),
 ('sme_tax_revenue_growth','Темп роста поступлений налогов по совокупному доходу от МСП',15.4::numeric,'%','Предварительный темп роста за 2025 год.')
) as v(code,indicator_name,value,unit,notes)
where m.name='Югорск'
and not exists (
 select 1 from public.municipality_indicators x
 where x.municipality_id=m.id and x.indicator_code=v.code
 and x.reference_year=2025 and coalesce(x.reference_period,'annual')='annual'
);

update public.municipality_indicators mi
set value=3899900000,
    source_id='ugorsk_investment_message_2025',
    source_url='https://admugorsk.ru/about/statistics/ekonomika/investitsionnaya-deyatelnost/investitsionnoe-poslanie-glavy-goroda-.php',
    retrieved_at=now(),
    notes=coalesce(mi.notes,'') || ' Уточнено по официальному инвестиционному посланию: 3 899,9 млн руб.; предварительный итог 2025 года. Ранее в отчёте главы приводилась округлённая оценка около 3 млрд руб.'
where mi.indicator_code='fixed_capital_investment_total_preliminary'
and mi.reference_year=2025
and mi.source_id='municipal_ser_ugorsk_2025'
and exists (select 1 from public.municipalities m where m.id=mi.municipality_id and m.name='Югорск');

update public.data_sources set import_status='partially_imported', last_checked_at=now()
where id='municipal_ser_ugorsk_2025';
