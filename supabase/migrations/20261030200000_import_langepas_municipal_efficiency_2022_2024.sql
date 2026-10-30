-- Langepas: official municipal efficiency report 2024, table 2.
insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,notes)
values
('ugra_municipal_efficiency_349rp_2024_langepas',
 'Сводный доклад Правительства Югры об эффективности муниципалитетов за 2024 год — Лангепас',
 'regional_official_report',
 'https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/',
 'Таблица 2 сводного доклада: показатели малого и среднего предпринимательства городского округа Лангепас за 2022–2024 годы; отдельно приведены планы на 2025–2027 годы.',
 'HTML','Городской округ Лангепас; импортированы два показателя за 2022–2024 годы.',
 'ежегодно','partially_imported',
 'Плановые значения 2025–2027 исключены. Использованы только три завершённых отчётных года из таблицы 2.')
on conflict (id) do nothing;

insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,reference_period,value,unit,source_id,source_url,verification_status,notes,geographic_level,geographic_name)
values
('langepas','langepas_sme_per_10k','Число субъектов малого и среднего предпринимательства на 10 тыс. человек населения',2022,'2022',224.6,'единиц','ugra_municipal_efficiency_349rp_2024_langepas','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 2 сводного доклада Правительства ХМАО — Югры за 2024 год; завершенный отчётный период.','municipality','Лангепас'),
('langepas','langepas_sme_per_10k','Число субъектов малого и среднего предпринимательства на 10 тыс. человек населения',2023,'2023',233.4,'единиц','ugra_municipal_efficiency_349rp_2024_langepas','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 2 сводного доклада Правительства ХМАО — Югры за 2024 год; завершенный отчётный период.','municipality','Лангепас'),
('langepas','langepas_sme_per_10k','Число субъектов малого и среднего предпринимательства на 10 тыс. человек населения',2024,'2024',231.1,'единиц','ugra_municipal_efficiency_349rp_2024_langepas','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Таблица 2 сводного доклада Правительства ХМАО — Югры за 2024 год; завершенный отчётный период.','municipality','Лангепас'),
('langepas','langepas_sme_employment_share','Доля среднесписочной численности работников малых и средних предприятий в среднесписочной численности работников всех предприятий и организаций',2022,'2022',11.5,'%','ugra_municipal_efficiency_349rp_2024_langepas','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Без внешних совместителей; таблица 2 сводного доклада Правительства ХМАО — Югры за 2024 год.','municipality','Лангепас'),
('langepas','langepas_sme_employment_share','Доля среднесписочной численности работников малых и средних предприятий в среднесписочной численности работников всех предприятий и организаций',2023,'2023',11.0,'%','ugra_municipal_efficiency_349rp_2024_langepas','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Без внешних совместителей; таблица 2 сводного доклада Правительства ХМАО — Югры за 2024 год.','municipality','Лангепас'),
('langepas','langepas_sme_employment_share','Доля среднесписочной численности работников малых и средних предприятий в среднесписочной численности работников всех предприятий и организаций',2024,'2024',11.2,'%','ugra_municipal_efficiency_349rp_2024_langepas','https://base.garant.ru/412531694/b89690251be5277812a78962f6302560/','verified','Без внешних совместителей; таблица 2 сводного доклада Правительства ХМАО — Югры за 2024 год.','municipality','Лангепас')
on conflict do nothing;