-- Reproducible, idempotent import of Appendix 1.
-- Values are cumulative January–September amounts, in thousand rubles.
-- Source: https://www.dumahmao.ru/povest/0750_1/17/23.pdf

INSERT INTO public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,last_checked_at,notes)
VALUES (
'duma_hmao_municipal_budget_9m_2025',
'Дума Югры — исполнение бюджетов муниципальных образований за 9 месяцев 2025 года, приложение 1',
'municipal_budget',
'https://www.dumahmao.ru/povest/0750_1/17/23.pdf',
'Сопоставимые показатели исполнения местных бюджетов за январь–сентябрь 2024 и 2025 годов по 22 муниципальным образованиям.',
'PDF','22 муниципальных образования ХМАО — Югры; 9 месяцев 2024 и 2025 годов','ежеквартально','partially_imported',now(),
'176 наблюдений; 4 показателя; тыс. руб.; 9-месячные значения не являются годовыми итогами.'
)
ON CONFLICT (id) DO UPDATE SET
name=EXCLUDED.name,category=EXCLUDED.category,url=EXCLUDED.url,description=EXCLUDED.description,
format=EXCLUDED.format,coverage=EXCLUDED.coverage,update_frequency=EXCLUDED.update_frequency,
import_status=EXCLUDED.import_status,last_checked_at=EXCLUDED.last_checked_at,notes=EXCLUDED.notes,updated_at=now();

WITH raw(municipality_id,geographic_name,rev24,rev25,rev_ex24,rev_ex25,tax24,tax25,exp24,exp25) AS (
VALUES
('nefteyugansk','Нефтеюганск',9168021.3,9432101.5,5057435.2,4754735,4660639.9,4376846.2,8159564.8,9189493.7),
('surgut','Сургут',30544576.9,31915488.9,14465579,15713386.6,14471642.6,15939624.9,27272172,30873054.6),
('khanty-mansiysk','Ханты-Мансийск',9670152.5,12633777,4212242.9,5118488.1,4266466.3,5099228.6,9593124.7,12345465.8),
('nizhnevartovsk','Нижневартовск',19838449.8,20169321.5,9008093.1,9848272.1,8695154.6,9597266.6,17654801.9,20051479.6),
('megion','Мегион',4560421.2,5749138.9,1535867.9,1823016.4,1529923.8,1774485.8,4421870.3,5690738.3),
('uray','Урай',4367040.3,3884224.2,1296339.9,1566553.6,1050436.4,1552418.8,4146724.1,3901627.5),
('kogalym','Когалым',4852230.8,8202085.2,2604434.1,4571737.7,2538077,3534567.1,4326369.2,7335445),
('raduzhny','Радужный',2756949.6,3160339.7,836001.6,977065.3,804584.2,942748.1,2595495,3132563.2),
('langepas','Лангепас',3223583.2,3441624.4,925498,1535146.3,817270,1466459.3,3167734.8,3506103.9),
('nyagan-city','Нягань',4876620.4,6971510.4,2392068.6,2378251.9,2262634.8,2292913,4470544.6,6940512.8),
('pyt-yah','Пыть-Ях',3496146.4,4046246,1661938.6,1841738.5,1622319.4,1698382.1,3071088.4,3897628.9),
('pokachi','Покачи',1534461,1523095.6,756381.7,748357.8,682895.4,702905.3,1607233.2,1592903.4),
('ugorsk','Югорск',3358469.6,5519542.9,1611341.6,1691344.7,1610244.7,1691116.7,3181943.4,5538535.9),
('beloyarsky-raion','Белоярский район',3534205.1,3663608.7,1020004.6,1629948.4,969080.9,1593630.4,3736016.7,3855805.5),
('berezovsky-raion','Берёзовский район',3854744.3,5463213.2,556600.5,659412.3,554777,654658.4,3763655.4,5318624.2),
('kondinsky-raion','Кондинский район',3850003.6,4445134.5,1042750,1833237.1,901725,1728110.1,3686536.5,4283563.2),
('october-raion','Октябрьский район',4362045.8,5314373.8,1634056.6,2060255.6,1581839.6,1983192.3,3894230,5126814),
('surgutsky','Сургутский район',14549860.8,17426244.1,6770163.6,7917028.5,6577474.2,7517301.3,14583988.7,17089047.5),
('sovetsky-raion','Советский район',4101839.9,6228067.3,1074528.5,1295027.5,1068788.6,1220841.3,3978417.1,6252142.9),
('khanty-mansiysky-raion','Ханты-Мансийский район',4014842.3,4392857.9,2003866.2,2269945.3,1868521.7,2039098.7,3898790,4210673.9),
('nizhnevartovsky-raion','Нижневартовский район',4900253.8,5066975.8,3088700.9,3013535.9,2985419.9,2862120,4372559.9,5054135.2),
('nefteyugansky-raion','Нефтеюганский район',5095912.8,7743245.3,2992474.4,4376304.7,2793661.1,4182030.3,4996178.2,6209705.2)
),
obs AS (
 SELECT municipality_id,geographic_name,x.indicator_code,x.indicator_name,x.reference_year,x.value
 FROM raw
 CROSS JOIN LATERAL (VALUES
 ('budget_total_revenue','Доходы бюджета — всего',2024,rev24),
 ('budget_total_revenue','Доходы бюджета — всего',2025,rev25),
 ('budget_revenue_excluding_grants','Доходы бюджета без безвозмездных поступлений',2024,rev_ex24),
 ('budget_revenue_excluding_grants','Доходы бюджета без безвозмездных поступлений',2025,rev_ex25),
 ('budget_tax_non_tax_revenue','Налоговые и неналоговые доходы бюджета',2024,tax24),
 ('budget_tax_non_tax_revenue','Налоговые и неналоговые доходы бюджета',2025,tax25),
 ('budget_total_expenditure','Расходы бюджета — всего',2024,exp24),
 ('budget_total_expenditure','Расходы бюджета — всего',2025,exp25)
 ) AS x(indicator_code,indicator_name,reference_year,value)
)
INSERT INTO public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,value,unit,source_id,source_url,retrieved_at,verification_status,notes,geographic_level,geographic_name,reference_period)
SELECT municipality_id,indicator_code,indicator_name,reference_year,value,'тыс. руб.',
'duma_hmao_municipal_budget_9m_2025','https://www.dumahmao.ru/povest/0750_1/17/23.pdf',
now(),'verified',
'Приложение 1; период январь–сентябрь. Сопоставление 9 месяцев 2024 и 2025 годов. Единица — тыс. рублей; не годовой итог.',
'municipality',geographic_name,reference_year::text || '-Q3'
FROM obs
WHERE NOT EXISTS (
 SELECT 1 FROM public.municipality_indicators i
 WHERE i.municipality_id=obs.municipality_id AND i.indicator_code=obs.indicator_code
 AND i.reference_year=obs.reference_year AND i.source_id='duma_hmao_municipal_budget_9m_2025'
 AND i.reference_period=obs.reference_year::text || '-Q3'
);
