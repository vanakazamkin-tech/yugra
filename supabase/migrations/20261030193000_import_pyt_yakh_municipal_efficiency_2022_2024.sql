-- Pyt-Yakh: official municipal efficiency indicators, factual years only (2022-2024).
insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,notes)
values
('ugra_municipal_efficiency_349rp_2024_pyt_yah',
 'Сводный доклад Правительства Югры об эффективности муниципалитетов за 2024 год — Пыть-Ях',
 'regional_official_report',
 'https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/',
 'Таблица 8 с показателями эффективности деятельности органов местного самоуправления Пыть-Яха за 2022–2024 годы и плановыми значениями на 2025–2027 годы.',
 'HTML','Город Пыть-Ях; импортированы два фактических показателя за 2022–2024 годы.',
 'ежегодно','partially_imported',
 'Импортируются только завершённые фактические периоды 2022–2024. Плановые значения 2025–2027 не импортируются как фактические.')
on conflict (id) do nothing;

insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,reference_period,value,unit,source_id,source_url,verification_status,notes,geographic_level,geographic_name)
values
('pyt-yah','pyt_yah_sme_per_10k','Число субъектов МСП на 10 тыс. человек населения',2022,'2022',357.8,'единиц','ugra_municipal_efficiency_349rp_2024_pyt_yah','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 8 сводного доклада Правительства ХМАО — Югры за 2024 год; фактическое значение.','municipality','Пыть-Ях'),
('pyt-yah','pyt_yah_sme_per_10k','Число субъектов МСП на 10 тыс. человек населения',2023,'2023',380.8,'единиц','ugra_municipal_efficiency_349rp_2024_pyt_yah','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 8 сводного доклада Правительства ХМАО — Югры за 2024 год; фактическое значение.','municipality','Пыть-Ях'),
('pyt-yah','pyt_yah_sme_per_10k','Число субъектов МСП на 10 тыс. человек населения',2024,'2024',387.6,'единиц','ugra_municipal_efficiency_349rp_2024_pyt_yah','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 8 сводного доклада Правительства ХМАО — Югры за 2024 год; фактическое значение.','municipality','Пыть-Ях'),
('pyt-yah','pyt_yah_sme_employment_share','Доля работников МСП в среднесписочной численности работников всех организаций',2022,'2022',13.7,'%','ugra_municipal_efficiency_349rp_2024_pyt_yah','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Без внешних совместителей; таблица 8 сводного доклада Правительства ХМАО — Югры за 2024 год; фактическое значение.','municipality','Пыть-Ях'),
('pyt-yah','pyt_yah_sme_employment_share','Доля работников МСП в среднесписочной численности работников всех организаций',2023,'2023',12.9,'%','ugra_municipal_efficiency_349rp_2024_pyt_yah','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Без внешних совместителей; таблица 8 сводного доклада Правительства ХМАО — Югры за 2024 год; фактическое значение.','municipality','Пыть-Ях'),
('pyt-yah','pyt_yah_sme_employment_share','Доля работников МСП в среднесписочной численности работников всех организаций',2024,'2024',12.7,'%','ugra_municipal_efficiency_349rp_2024_pyt_yah','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Без внешних совместителей; таблица 8 сводного доклада Правительства ХМАО — Югры за 2024 год; фактическое значение.','municipality','Пыть-Ях')
on conflict do nothing;