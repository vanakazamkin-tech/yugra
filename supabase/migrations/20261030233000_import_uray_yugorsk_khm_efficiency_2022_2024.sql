-- Register and import factual municipal efficiency indicators from tables 11–13
-- of the Khanty-Mansi Autonomous Okrug consolidated report, order 349-rp (2024).
insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,notes)
values
('ugra_municipal_efficiency_349rp_2024_uray_yugorsk_khm',
 'Сводный доклад Правительства Югры об эффективности муниципалитетов за 2024 год — Урай, Югорск и Ханты-Мансийск',
 'regional_official_report',
 'https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/',
 'Таблицы 11–13: фактические показатели за 2022–2024 годы.',
 'HTML',
 'Урай, Югорск и Ханты-Мансийск; показатели МСП.',
 'ежегодно',
 'partially_imported',
 'Импортированы только фактические значения 2022–2024; планы 2025–2027 исключены.')
on conflict (id) do nothing;

insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,reference_period,value,unit,source_id,source_url,verification_status,notes,geographic_level,geographic_name)
values
('uray','sme_per_10k','Число субъектов МСП на 10 тыс. человек населения',2022,'annual',297.6,'единиц','ugra_municipal_efficiency_349rp_2024_uray_yugorsk_khm','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 11; фактическое значение. Плановые значения исключены. Сводный доклад Правительства Югры №349-рп.','municipality','Урай'),
('uray','sme_per_10k','Число субъектов МСП на 10 тыс. человек населения',2023,'annual',298.4,'единиц','ugra_municipal_efficiency_349rp_2024_uray_yugorsk_khm','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 11; фактическое значение. Плановые значения исключены. Сводный доклад Правительства Югры №349-рп.','municipality','Урай'),
('uray','sme_per_10k','Число субъектов МСП на 10 тыс. человек населения',2024,'annual',298.5,'единиц','ugra_municipal_efficiency_349rp_2024_uray_yugorsk_khm','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 11; фактическое значение. Плановые значения исключены. Сводный доклад Правительства Югры №349-рп.','municipality','Урай'),
('uray','sme_employment_share','Доля работников МСП в среднесписочной численности работников всех организаций',2022,'annual',10.2,'%','ugra_municipal_efficiency_349rp_2024_uray_yugorsk_khm','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 11; без внешних совместителей. Сводный доклад Правительства Югры №349-рп.','municipality','Урай'),
('uray','sme_employment_share','Доля работников МСП в среднесписочной численности работников всех организаций',2023,'annual',9.8,'%','ugra_municipal_efficiency_349rp_2024_uray_yugorsk_khm','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 11; без внешних совместителей. Сводный доклад Правительства Югры №349-рп.','municipality','Урай'),
('uray','sme_employment_share','Доля работников МСП в среднесписочной численности работников всех организаций',2024,'annual',10.0,'%','ugra_municipal_efficiency_349rp_2024_uray_yugorsk_khm','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 11; без внешних совместителей. Сводный доклад Правительства Югры №349-рп.','municipality','Урай'),
('khanty-mansiysk','sme_per_10k','Число субъектов МСП на 10 тыс. человек населения',2022,'annual',348.6,'единиц','ugra_municipal_efficiency_349rp_2024_uray_yugorsk_khm','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 12; фактическое значение. Сводный доклад Правительства Югры №349-рп.','municipality','Ханты-Мансийск'),
('khanty-mansiysk','sme_per_10k','Число субъектов МСП на 10 тыс. человек населения',2023,'annual',369.8,'единиц','ugra_municipal_efficiency_349rp_2024_uray_yugorsk_khm','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 12; фактическое значение. Сводный доклад Правительства Югры №349-рп.','municipality','Ханты-Мансийск'),
('khanty-mansiysk','sme_per_10k','Число субъектов МСП на 10 тыс. человек населения',2024,'annual',369.9,'единиц','ugra_municipal_efficiency_349rp_2024_uray_yugorsk_khm','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 12; фактическое значение. Сводный доклад Правительства Югры №349-рп.','municipality','Ханты-Мансийск'),
('ugorsk','sme_per_10k','Число субъектов МСП на 10 тыс. человек населения',2022,'annual',306.8,'единиц','ugra_municipal_efficiency_349rp_2024_uray_yugorsk_khm','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 13; фактическое значение. Сводный доклад Правительства Югры №349-рп.','municipality','Югорск'),
('ugorsk','sme_per_10k','Число субъектов МСП на 10 тыс. человек населения',2023,'annual',311.1,'единиц','ugra_municipal_efficiency_349rp_2024_uray_yugorsk_khm','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 13; фактическое значение. Сводный доклад Правительства Югры №349-рп.','municipality','Югорск'),
('ugorsk','sme_per_10k','Число субъектов МСП на 10 тыс. человек населения',2024,'annual',303.8,'единиц','ugra_municipal_efficiency_349rp_2024_uray_yugorsk_khm','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 13; фактическое значение. Сводный доклад Правительства Югры №349-рп.','municipality','Югорск'),
('ugorsk','sme_employment_share','Доля работников МСП в среднесписочной численности работников всех организаций',2022,'annual',9.5,'%','ugra_municipal_efficiency_349rp_2024_uray_yugorsk_khm','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 13; без внешних совместителей. Сводный доклад Правительства Югры №349-рп.','municipality','Югорск'),
('ugorsk','sme_employment_share','Доля работников МСП в среднесписочной численности работников всех организаций',2023,'annual',8.5,'%','ugra_municipal_efficiency_349rp_2024_uray_yugorsk_khm','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 13; без внешних совместителей. Сводный доклад Правительства Югры №349-рп.','municipality','Югорск'),
('ugorsk','sme_employment_share','Доля работников МСП в среднесписочной численности работников всех организаций',2024,'annual',8.4,'%','ugra_municipal_efficiency_349rp_2024_uray_yugorsk_khm','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 13; без внешних совместителей. Сводный доклад Правительства Югры №349-рп.','municipality','Югорск');
