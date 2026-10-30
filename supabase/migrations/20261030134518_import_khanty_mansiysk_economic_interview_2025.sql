-- Import rounded / estimated 2025 indicators from an interview with the Head of Economic Development and Investment of Khanty-Mansiysk.
-- Source is the municipal City Information Center, not a primary statistical bulletin; limitations are explicit in notes.

insert into public.data_sources
(id,name,category,url,description,format,coverage,update_frequency,import_status,last_checked_at,notes)
values
('khanty_mansiysk_economic_interview_2025',
 'Городской информационный центр Ханты-Мансийска — интервью об экономических итогах 2025 года',
 'municipal_information_center',
 'https://news-hm.ru/rubrics/gorod/dostizheniya-podderzhka-plany-ekonomicheskoe-razvitie-khanty-mansiyska/',
 'Интервью с начальником управления экономического развития и инвестиций администрации Ханты-Мансийска об итогах 2025 года; опубликовано 03.02.2026.',
 'web_page',
 'Ханты-Мансийск, 2025',
 'annual',
 'partially_imported',
 now(),
 'В публикации приведены оценки и округлённые данные. Источник — муниципальное бюджетное учреждение «Городской информационный центр», передающее интервью должностного лица администрации. Не подменяет первичную статистическую отчётность.')
on conflict(id) do update set
 name=excluded.name,url=excluded.url,description=excluded.description,
 import_status='partially_imported',last_checked_at=now(),notes=excluded.notes;

insert into public.municipality_indicators
(municipality_id,indicator_code,indicator_name,reference_year,value,unit,source_id,source_url,retrieved_at,verification_status,notes,geographic_level,geographic_name,reference_period)
select m.id,v.code,v.name,2025,v.value,v.unit,
 'khanty_mansiysk_economic_interview_2025',
 'https://news-hm.ru/rubrics/gorod/dostizheniya-podderzhka-plany-ekonomicheskoe-razvitie-khanty-mansiyska/',
 now(),'verified',v.notes,'municipality','Ханты-Мансийск',v.period
from public.municipalities m
cross join (values
 ('population_estimate_end_year','Оценочная численность постоянного населения на конец года',115200::numeric,'человек','Оценка, приведённая начальником управления экономического развития и инвестиций; 115,2 тыс. человек. Отличается от официальной численности Росстата на 01.01.2025, так как относится к оценке на конец 2025 года.','year_end_estimate'),
 ('population_growth_estimated','Оценочный рост постоянного населения к предыдущему году',1.3::numeric,'%','В источнике указано 101,3% к уровню 2024 года; производная величина +1,3 п.п. к базовому уровню, не официальный статистический индекс.','year_end_estimate'),
 ('investment_projects_realized_count','Количество реализованных инвестиционных проектов',67::numeric,'проектов','По итогам 2025 года; большая часть проектов, по словам представителя администрации, относится к малому и среднему бизнесу.','annual'),
 ('registered_unemployment_rate','Уровень зарегистрированной безработицы',0.09::numeric,'%','В муниципальном информационном центре сообщается о снижении за год до 0,09%; методология и точная дата среза в интервью не раскрыты. Не сравнивать напрямую с безработицей по методологии МОТ.','year_end_estimate')
) as v(code,name,value,unit,notes,period)
where m.name='Ханты-Мансийск'
and not exists(select 1 from public.municipality_indicators x
 where x.municipality_id=m.id and x.indicator_code=v.code and x.reference_year=2025
 and coalesce(x.reference_period,'annual')=v.period);
