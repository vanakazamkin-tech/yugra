-- Import verified factual SME density values for Nyagan from table 6
-- of the Khanty-Mansi Autonomous Okrug consolidated municipal-efficiency report
-- approved by Government Order No. 349-rp dated 2025-07-29.
-- Forecast values for 2025-2027 are intentionally excluded.
-- SME employment-share values are intentionally omitted because they conflict
-- with an earlier independent source already loaded for Nyagan and require reconciliation.

insert into data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,notes)
values
('ugra_municipal_efficiency_349rp_2024_nyagan',
 'Сводный доклад Правительства Югры об эффективности муниципалитетов за 2024 год — Нягань',
 'regional_official_report',
 'https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/',
 'Таблица 6: фактические значения показателя числа субъектов МСП на 10 тыс. жителей за 2022–2024 годы.',
 'HTML','Нягань','ежегодно','partially_imported',
 'Импортированы только значения МСП на 10 тыс. жителей. Доля занятых в МСП не импортирована: значения доклада (21,8%; 22,3%; 22,4%) расходятся с ранее загруженным источником (32%; 31% за 2022–2023) и требуют сверки.')
on conflict (id) do nothing;

insert into municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,reference_period,value,unit,source_id,source_url,verification_status,notes,geographic_level,geographic_name)
values
('nyagan-city','sme_per_10k','Число субъектов малого и среднего предпринимательства в расчёте на 10 тыс. человек населения',2022,'annual',386.3,'единиц','ugra_municipal_efficiency_349rp_2024_nyagan','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 6 сводного доклада по распоряжению Правительства ХМАО — Югры от 29.07.2025 № 349-рп. Фактическое значение; плановые годы исключены.','municipality','Нягань'),
('nyagan-city','sme_per_10k','Число субъектов малого и среднего предпринимательства в расчёте на 10 тыс. человек населения',2023,'annual',391.9,'единиц','ugra_municipal_efficiency_349rp_2024_nyagan','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 6 сводного доклада по распоряжению Правительства ХМАО — Югры от 29.07.2025 № 349-рп. Фактическое значение; плановые годы исключены.','municipality','Нягань'),
('nyagan-city','sme_per_10k','Число субъектов малого и среднего предпринимательства в расчёте на 10 тыс. человек населения',2024,'annual',390.1,'единиц','ugra_municipal_efficiency_349rp_2024_nyagan','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 6 сводного доклада по распоряжению Правительства ХМАО — Югры от 29.07.2025 № 349-рп. Фактическое значение; плановые годы исключены.','municipality','Нягань')
on conflict do nothing;
