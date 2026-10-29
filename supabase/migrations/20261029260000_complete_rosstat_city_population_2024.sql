insert into public.municipality_indicators
 (municipality_id,indicator_code,indicator_name,reference_year,reference_period,value,unit,source_id,source_url,verification_status,notes,geographic_level,geographic_name)
values
 ('khanty-mansiysk','population_settlement','Численность населения города на 1 января',2024,'annual',111.8,'тыс. человек','rosstat_city_population_2024','https://rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf','verified','Росстат, сборник «Регионы России. Основные социально-экономические показатели городов», оценка на 01.01.2024. Значение относится к городу Ханты-Мансийску; географический уровень — населённый пункт.','settlement','Ханты-Мансийск'),
 ('surgut','population_settlement','Численность населения города на 1 января',2024,'annual',420.3,'тыс. человек','rosstat_city_population_2024','https://rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf','verified','Росстат, сборник «Регионы России. Основные социально-экономические показатели городов», оценка на 01.01.2024. Значение относится к городу Сургуту; географический уровень — населённый пункт.','settlement','Сургут'),
 ('nizhnevartovsk','population_settlement','Численность населения города на 1 января',2024,'annual',290.5,'тыс. человек','rosstat_city_population_2024','https://rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf','verified','Росстат, сборник «Регионы России. Основные социально-экономические показатели городов», оценка на 01.01.2024. Значение относится к городу Нижневартовску; географический уровень — населённый пункт.','settlement','Нижневартовск'),
 ('nefteyugansk','population_settlement','Численность населения города на 1 января',2024,'annual',126.7,'тыс. человек','rosstat_city_population_2024','https://rosstat.gov.ru/storage/mediabank/Region_Goroda_2024.pdf','verified','Росстат, сборник «Регионы России. Основные социально-экономические показатели городов», оценка на 01.01.2024. Значение относится к городу Нефтеюганску; географический уровень — населённый пункт.','settlement','Нефтеюганск')
on conflict (municipality_id,indicator_code,reference_year,reference_period,source_id) do update set
 indicator_name=excluded.indicator_name,value=excluded.value,unit=excluded.unit,source_url=excluded.source_url,
 retrieved_at=now(),verification_status=excluded.verification_status,notes=excluded.notes,
 geographic_level=excluded.geographic_level,geographic_name=excluded.geographic_name,updated_at=now();

update public.data_sources
set coverage='16 городов Югры; данные за 2024 год для городов и муниципальных округов, где география совпадает; уровень населённого пункта маркируется отдельно',
    notes='Численность населения на 1 января 2024 года. Значения городов не распространяются автоматически на прилегающий район; уровень географии задаётся для каждой записи отдельно.',
    import_status='imported',
    last_checked_at=now(),
    updated_at=now()
where id='rosstat_city_population_2024';
