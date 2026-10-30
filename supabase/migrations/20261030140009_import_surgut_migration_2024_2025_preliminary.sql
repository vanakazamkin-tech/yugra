-- Import 2024 and preliminary 2025 migration balance for Surgut from the official annual SER report.
-- 2025 is explicitly an estimate and remains marked as preliminary in notes.

insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,value,unit,source_id,source_url,retrieved_at,verification_status,notes,geographic_level,geographic_name,reference_period)
select m.id,v.code,v.name,v.year,v.value,v.unit,
 'municipal_ser_surgut_2025',
 'https://dumasurgut.ru/upload/iblock/80f/xzxknp8dh16e3mftqxj3zm870d0xc7ut/963-VII%20%D0%94%D0%93%20%D0%BE%D1%82%2003.03.2026.pdf',
 now(),'verified',v.notes,'municipality','Сургут','annual'
from public.municipalities m
cross join (values
 ('migration_net_total','Миграционный прирост (сальдо), всего',2024,9000::numeric,'человек','Значение за 2024 год приведено в официальном отчёте за 2025 год округлённо до 9,0 тыс. человек.'),
 ('migration_net_total','Миграционный прирост (сальдо), всего',2025,5200::numeric,'человек','Предварительная оценка миграционного прироста за 2025 год, округлённая до 5,2 тыс. человек; не окончательная статистика.'),
 ('migration_rate_per_1000','Коэффициент миграционного прироста',2024,21.2::numeric,'‰','Значение за 2024 год по официальному отчёту; на 1 000 жителей.'),
 ('migration_rate_per_1000','Коэффициент миграционного прироста',2025,12::numeric,'‰','Предварительная оценка за 2025 год; на 1 000 жителей.')
) as v(code,name,year,value,unit,notes)
where m.name='Сургут'
and not exists(select 1 from public.municipality_indicators x
 where x.municipality_id=m.id and x.indicator_code=v.code and x.reference_year=v.year
 and coalesce(x.reference_period,'annual')='annual');
