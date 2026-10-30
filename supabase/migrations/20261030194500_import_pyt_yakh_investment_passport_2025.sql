-- Additional factual values from Pyt-Yakh 2025 investment passport.
insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,notes)
values
('pyt_yah_investment_passport_2025','Инвестиционный паспорт города Пыть-Яха, 2025','municipal_official_report',
 'https://invest.py86.ru/files/docs/investpasport-2024.pdf',
 'Инвестиционный паспорт администрации города с итоговыми данными по промышленности, жилищному строительству, населению и МСП.',
 'PDF','Город Пыть-Ях; отдельные показатели за 2024 год и население на 01.01.2025.',
 'ежегодно','partially_imported',
 'Внесены только явно обозначенные фактические значения; показатели, являющиеся планом, проектной мощностью или прогнозом, не импортируются.')
on conflict (id) do nothing;

insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,reference_period,value,unit,source_id,source_url,verification_status,notes,geographic_level,geographic_name)
values
('pyt-yah','industrial_output_mln_rub','Объем промышленного производства',2024,'2024',59608.1,'млн руб.','pyt_yah_investment_passport_2025','https://invest.py86.ru/files/docs/investpasport-2024.pdf','verified','Инвестиционный паспорт города Пыть-Яха, 2025; фактическое значение за 2024 год, стр. 11.','municipality','Пыть-Ях'),
('pyt-yah','housing_commissioned_thousand_sqm','Ввод жилья',2024,'2024',3.12,'тыс. м²','pyt_yah_investment_passport_2025','https://invest.py86.ru/files/docs/investpasport-2024.pdf','verified','Инвестиционный паспорт города Пыть-Яха, 2025; факт за 2024 год, стр. 12.','municipality','Пыть-Ях'),
('pyt-yah','population_jan1','Численность населения на 1 января',2025,'01.01.2025',40608,'человек','pyt_yah_investment_passport_2025','https://invest.py86.ru/files/docs/investpasport-2024.pdf','verified','Инвестиционный паспорт города Пыть-Яха, 2025; значение на 01.01.2025, стр. 4.','municipality','Пыть-Ях'),
('pyt-yah','sme_entities_total','Количество субъектов малого и среднего предпринимательства',2024,'2024',1597,'единиц','pyt_yah_investment_passport_2025','https://invest.py86.ru/files/docs/investpasport-2024.pdf','verified','Инвестиционный паспорт города Пыть-Яха, 2025; указано в разделе поддержки МСП, стр. 18.','municipality','Пыть-Ях')
on conflict do nothing;