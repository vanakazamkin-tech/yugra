-- Import official Rosstat migration balance series for Surgut, 2021–2023.
-- Values are migration balances (net increase), not gross arrivals/departures.
-- Blank cells for 2024–2025 in the source are intentionally not converted to zero.

insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,last_checked_at,notes)
values
('rosstat_surgut_migration_2012_2023',
 'Росстат — муниципальный паспорт Сургута: миграционный прирост и его компоненты',
 'official_statistics',
 'https://rosstat.gov.ru/scripts/db_inet2/passport/table.aspx?opt=7187600020092010201120122013201420152016201720182019202020212022202320242025',
 'БД ПМО Росстата, муниципальный паспорт городского округа Сургут; раздел «Миграционный прирост», годовые значения миграционного баланса по направлениям.',
 'web_database',
 'Сургут, 2012–2023',
 'annual',
 'partially_imported',
 now(),
 'Импортированы только годовые муниципальные итоги и компоненты за 2021–2023 годы, доступные в опубликованной таблице. Это сальдо миграции, а не число прибывших или выбывших. В таблице за 2024–2025 годы значения пустые; пустые клетки не трактуются как нули.')
on conflict(id) do update set
 name=excluded.name,url=excluded.url,description=excluded.description,
 import_status='partially_imported',last_checked_at=now(),notes=excluded.notes;

insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,value,unit,source_id,source_url,retrieved_at,verification_status,notes,geographic_level,geographic_name,reference_period)
select m.id,v.code,v.name,v.year,v.value,'человек',
 'rosstat_surgut_migration_2012_2023',
 'https://rosstat.gov.ru/scripts/db_inet2/passport/table.aspx?opt=7187600020092010201120122013201420152016201720182019202020212022202320242025',
 now(),'verified',v.notes,'municipality','Сургут','annual'
from public.municipalities m
cross join (values
 ('migration_net_total','Миграционный прирост (сальдо), всего',2021,5915::numeric,'Сальдо миграции, человек; муниципальный паспорт Росстата.'),
 ('migration_net_total','Миграционный прирост (сальдо), всего',2022,5206::numeric,'Сальдо миграции, человек; муниципальный паспорт Росстата.'),
 ('migration_net_total','Миграционный прирост (сальдо), всего',2023,9997::numeric,'Сальдо миграции, человек; муниципальный паспорт Росстата.'),
 ('migration_net_domestic','Миграционный прирост в пределах России',2021,1922::numeric,'Внутрироссийское сальдо миграции, человек.'),
 ('migration_net_domestic','Миграционный прирост в пределах России',2022,1651::numeric,'Внутрироссийское сальдо миграции, человек.'),
 ('migration_net_domestic','Миграционный прирост в пределах России',2023,4144::numeric,'Внутрироссийское сальдо миграции, человек.'),
 ('migration_net_intraregional','Внутрирегиональный миграционный прирост',2021,1643::numeric,'Сальдо перемещений внутри ХМАО — Югры, человек.'),
 ('migration_net_intraregional','Внутрирегиональный миграционный прирост',2022,1259::numeric,'Сальдо перемещений внутри ХМАО — Югры, человек.'),
 ('migration_net_intraregional','Внутрирегиональный миграционный прирост',2023,1697::numeric,'Сальдо перемещений внутри ХМАО — Югры, человек.'),
 ('migration_net_interregional','Межрегиональный миграционный прирост',2021,279::numeric,'Сальдо перемещений между субъектами РФ, человек.'),
 ('migration_net_interregional','Межрегиональный миграционный прирост',2022,392::numeric,'Сальдо перемещений между субъектами РФ, человек.'),
 ('migration_net_interregional','Межрегиональный миграционный прирост',2023,2447::numeric,'Сальдо перемещений между субъектами РФ, человек.'),
 ('migration_net_international','Международный миграционный прирост',2021,3993::numeric,'Сальдо международной миграции, человек.'),
 ('migration_net_international','Международный миграционный прирост',2022,3555::numeric,'Сальдо международной миграции, человек.'),
 ('migration_net_international','Международный миграционный прирост',2023,5853::numeric,'Сальдо международной миграции, человек.')
) as v(code,name,year,value,notes)
where m.name='Сургут'
and not exists(select 1 from public.municipality_indicators x
 where x.municipality_id=m.id and x.indicator_code=v.code and x.reference_year=v.year
 and coalesce(x.reference_period,'annual')='annual');
