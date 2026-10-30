-- Import official preliminary 2025 socio-economic indicators for Nizhnevartovsk.
-- Source: City Administration / Department of Economic Development, published 21 April 2026.
-- The source explicitly presents preliminary results and estimates. Notes preserve rounding and methodology caveats.

insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,last_checked_at,notes)
values
('municipal_ser_nizhnevartovsk_2025',
 'Администрация Нижневартовска — краткий обзор итогов социально-экономического развития за 2025 год',
 'municipal_official_report',
 'https://www.n-vartovsk.ru/upload/iblock/951/dkc98weg2wsfvex0hlzkkqu0rv51zm3l/1tzdcj6454vglzd7wf1g5yvb76qobymp.pdf',
 'Официальный краткий обзор Департамента экономического развития администрации города Нижневартовска, опубликован 21.04.2026.',
 'pdf',
 'Нижневартовск, 2025',
 'annual',
 'partially_imported',
 now(),
 'Документ содержит предварительные итоги и оценки за 2025 год. Все значения сохраняются с явной оговоркой о предварительном характере; не считать окончательными годовыми данными.')
on conflict (id) do update set
 name=excluded.name,url=excluded.url,description=excluded.description,
 import_status=excluded.import_status,last_checked_at=now(),notes=excluded.notes;

insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,value,unit,source_id,source_url,retrieved_at,verification_status,notes,geographic_level,geographic_name,reference_period)
select m.id,v.code,v.indicator_name,2025,v.value,v.unit,
 'municipal_ser_nizhnevartovsk_2025',
 'https://www.n-vartovsk.ru/upload/iblock/951/dkc98weg2wsfvex0hlzkkqu0rv51zm3l/1tzdcj6454vglzd7wf1g5yvb76qobymp.pdf',
 now(),'verified',v.notes,'municipality','Нижневартовск','annual'
from public.municipalities m
cross join (values
 ('industrial_shipment_large_medium','Отгружено товаров собственного производства, работ и услуг крупными и средними предприятиями',107600000000::numeric,'руб.','Официальная предварительная итоговая оценка за 2025 год; 95,4% к 2024 году в сопоставимых ценах.'),
 ('industrial_shipment_index_comparable','Индекс объёма отгруженной промышленной продукции в сопоставимых ценах',95.4::numeric,'%','К уровню 2024 года; предварительный итог 2025 года.'),
 ('sme_entities_count','Количество субъектов малого и среднего предпринимательства',4000::numeric,'ед.','Округлено в источнике до 4,0 тыс. единиц; данные реестра МСП.'),
 ('sme_employment_count','Среднесписочная численность работников субъектов МСП',29200::numeric,'человек','Округлено в источнике до 29,2 тыс. человек.'),
 ('sme_turnover','Оборот малых и средних предприятий',205300000000::numeric,'руб.','Оценка оборота за 2025 год; 99% к уровню 2024 года в сопоставимых ценах.'),
 ('sme_turnover_real_index','Индекс оборота МСП в сопоставимых ценах',99::numeric,'%','К уровню 2024 года; оценка за 2025 год.'),
 ('fixed_capital_investment_total_preliminary','Инвестиции в основной капитал, всего',44500000000::numeric,'руб.','Предварительный итог 2025 года; общий объём инвестиций, не подменять серией инвестиций без добычи.'),
 ('fixed_capital_investment_growth_preliminary','Индекс инвестиций в основной капитал в сопоставимых ценах',66.5::numeric,'%','К уровню предыдущего года; предварительный итог 2025 года.'),
 ('housing_commissioned_reported','Введено в действие жилых домов',75800::numeric,'кв. м','Предварительный итог за 2025 год.'),
 ('construction_works_volume','Объём работ по виду деятельности «Строительство»',19800000000::numeric,'руб.','Официальная оценка за 2025 год; 58,4% к уровню предыдущего года в сопоставимых ценах.'),
 ('retail_turnover','Оборот розничной торговли',154900000000::numeric,'руб.','Оценка за 2025 год; 98,5% к сопоставимому периоду предыдущего года.'),
 ('per_capita_cash_income_monthly','Среднемесячные денежные доходы на душу населения',60877.9::numeric,'руб./чел.','Оценка за 2025 год; рост на 7,7% к предыдущему году.'),
 ('per_capita_cash_income_growth_nominal','Рост среднемесячных денежных доходов на душу населения',7.7::numeric,'%','Номинальный рост к предыдущему году; оценка за 2025 год.'),
 ('real_disposable_income_index','Индекс реальных располагаемых денежных доходов',100::numeric,'%','Оценка за 2025 год к предыдущему году.'),
 ('average_monthly_wage_large_medium','Среднемесячная начисленная заработная плата на крупных и средних предприятиях',128615.4::numeric,'руб.','Оценка за 2025 год.'),
 ('real_wage_index','Индекс реальной заработной платы',100.2::numeric,'%','Оценка за 2025 год к предыдущему году с учётом инфляции.'),
 ('registered_unemployed_count','Численность безработных с официальным статусом',194::numeric,'человек','На 1 января 2026 года; показатель относится к состоянию на конец 2025 года.'),
 ('registered_unemployment_rate','Уровень зарегистрированной безработицы',0.12::numeric,'%','На 1 января 2026 года; не является уровнем безработицы по методологии МОТ.')
) as v(code,indicator_name,value,unit,notes)
where m.name='Нижневартовск'
and not exists (
 select 1 from public.municipality_indicators x
 where x.municipality_id=m.id and x.indicator_code=v.code
 and x.reference_year=2025 and coalesce(x.reference_period,'annual')='annual'
);
