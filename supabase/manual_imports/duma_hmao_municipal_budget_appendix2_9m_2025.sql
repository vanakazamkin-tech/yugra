-- Idempotent import of Appendix 2, actual execution for January–September 2025.
-- Source: https://www.dumahmao.ru/povest/0750_1/17/24.pdf
INSERT INTO public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,last_checked_at,notes)
VALUES ('duma_hmao_municipal_budget_appendix2_9m_2025','Дума Югры — исполнение муниципальных бюджетов за 9 месяцев 2025 года, приложение 2','municipal_budget','https://www.dumahmao.ru/povest/0750_1/17/24.pdf','Фактические безвозмездные поступления и фонд оплаты труда с социальными взносами по 22 муниципальным образованиям.','PDF','22 муниципальных образования ХМАО — Югры; 9 месяцев 2025 года','ежеквартально','partially_imported',now(),'Импортированы два фактических показателя; единица — тыс. руб.; не годовой итог.')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,category=EXCLUDED.category,url=EXCLUDED.url,description=EXCLUDED.description,format=EXCLUDED.format,coverage=EXCLUDED.coverage,update_frequency=EXCLUDED.update_frequency,import_status=EXCLUDED.import_status,last_checked_at=now(),notes=EXCLUDED.notes,updated_at=now();

WITH v(municipality_id,geographic_name,transfers,payroll) AS (VALUES
('nefteyugansk','Нефтеюганск',4677366.5,4948258.9),
('surgut','Сургут',16202102.3,16269341.5),
('khanty-mansiysk','Ханты-Мансийск',7515288.9,6060732.1),
('nizhnevartovsk','Нижневартовск',10321049.4,11969608.1),
('megion','Мегион',3926122.5,3017130.9),
('uray','Урай',2317670.6,2033280),
('kogalym','Когалым',3630347.5,2983579.4),
('raduzhny','Радужный',2183274.4,1945058.7),
('langepas','Лангепас',1906478.1,2340893.4),
('nyagan-city','Нягань',4593258.5,2825786.4),
('pyt-yah','Пыть-Ях',2204507.5,2429104.5),
('pokachi','Покачи',774737.8,1128451.7),
('ugorsk','Югорск',3828198.2,2117053.3),
('beloyarsky-raion','Белоярский район',2033660.3,2137918.8),
('berezovsky-raion','Берёзовский район',4803800.9,2372438.9),
('kondinsky-raion','Кондинский район',2611897.4,2437744.4),
('october-raion','Октябрьский район',3254118.2,2347769.1),
('surgutsky','Сургутский район',9509215.6,7608697.2),
('sovetsky-raion','Советский район',4933039.8,2985346.7),
('khanty-mansiysky-raion','Ханты-Мансийский район',2122912.6,2212819.9),
('nizhnevartovsky-raion','Нижневартовский район',2053439.9,3005075.8),
('nefteyugansky-raion','Нефтеюганский район',3366940.6,2765716.7)
), obs AS (
 SELECT municipality_id,geographic_name,'budget_intergovernmental_transfers'::text code,'Безвозмездные поступления от других бюджетов бюджетной системы РФ'::text label,transfers::numeric value FROM v
 UNION ALL
 SELECT municipality_id,geographic_name,'budget_payroll_fund','Фонд оплаты труда и взносы по обязательному социальному страхованию',payroll::numeric FROM v
)
INSERT INTO public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,value,unit,source_id,source_url,retrieved_at,verification_status,notes,geographic_level,geographic_name,reference_period)
SELECT municipality_id,code,label,2025,value,'тыс. руб.','duma_hmao_municipal_budget_appendix2_9m_2025','https://www.dumahmao.ru/povest/0750_1/17/24.pdf',now(),'verified','Приложение 2; фактическое исполнение за январь–сентябрь 2025 года. Не годовой итог.','municipality',geographic_name,'2025-Q3'
FROM obs WHERE NOT EXISTS (SELECT 1 FROM public.municipality_indicators i WHERE i.municipality_id=obs.municipality_id AND i.indicator_code=obs.code AND i.reference_year=2025 AND i.source_id='duma_hmao_municipal_budget_appendix2_9m_2025' AND i.reference_period='2025-Q3');
