-- Import official HMRN migration balance for 2023-2024 from the administration's demographic summary.
-- Values are net migration balance, not gross arrivals/departures.

insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,last_checked_at,notes)
values
('hmrn_demography_population_2023_2024',
 'Администрация Ханты-Мансийского района — демографические итоги 2023–2024 годов',
 'demography',
 'https://hmrn.ru/raion/',
 'Официальная страница администрации района с численностью населения и итогами естественного и миграционного движения населения за 2023–2024 годы.',
 'web_page',
 'Ханты-Мансийский район, 2023–2024',
 'annual',
 'partially_imported',
 now(),
 'На официальной странице приведено сальдо миграции: 152 человека за 2023 год и 170 человек за 2024 год. Это не число прибывших или выбывших.')
on conflict(id) do update set
 name=excluded.name,url=excluded.url,description=excluded.description,
 import_status='partially_imported',last_checked_at=now(),notes=excluded.notes;

insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,value,unit,source_id,source_url,retrieved_at,verification_status,notes,geographic_level,geographic_name,reference_period)
select m.id,'migration_net_total','Миграционный прирост (сальдо), всего',v.year,v.value,'человек',
 'hmrn_demography_population_2023_2024',
 'https://hmrn.ru/raion/',
 now(),'verified',v.notes,'municipality','Ханты-Мансийский район','annual'
from public.municipalities m
cross join (values
 (2023,152::numeric,'Сальдо миграции за 2023 год по официальной странице администрации района.'),
 (2024,170::numeric,'Сальдо миграции за 2024 год по официальной странице администрации района.')
) as v(year,value,notes)
where m.name='Ханты-Мансийский район'
and not exists(select 1 from public.municipality_indicators x
 where x.municipality_id=m.id and x.indicator_code='migration_net_total'
 and x.reference_year=v.year and coalesce(x.reference_period,'annual')='annual');
