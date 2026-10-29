insert into public.data_sources
 (id,name,category,url,description,format,coverage,update_frequency,import_status,notes,last_checked_at)
values
 ('rosstat_surgut_total_capital_investment','Росстат — инвестиции в основной капитал организаций Сургута без субъектов малого предпринимательства',
  'official_statistics','https://rosstat.gov.ru/scripts/db_inet2/passport/table.aspx?opt=71876000202420252026',
  'Общий объём инвестиций в основной капитал организаций, находящихся на территории муниципального образования, без субъектов малого предпринимательства.',
  'HTML, база показателей муниципальных образований','Городской округ Сургут; 2024–2025 годы','Годовая','partially_imported',
  'Учитываются организации без субъектов малого предпринимательства. Показатель не включает население и не тождественен показателю инвестиций на душу населения. Значения за 2026 год в просмотренной таблице отсутствуют.',
  now())
on conflict (id) do update set
 name=excluded.name,category=excluded.category,url=excluded.url,description=excluded.description,
 format=excluded.format,coverage=excluded.coverage,update_frequency=excluded.update_frequency,
 import_status=excluded.import_status,notes=excluded.notes,last_checked_at=now(),updated_at=now();

insert into public.municipality_indicators
 (municipality_id,indicator_code,indicator_name,reference_year,reference_period,value,unit,source_id,source_url,verification_status,notes,geographic_level,geographic_name)
values
 ('surgut','fixed_capital_investment_enterprises_non_sme','Инвестиции в основной капитал организаций на территории муниципалитета, без субъектов малого предпринимательства',2024,'annual',85552652,'тыс. руб.','rosstat_surgut_total_capital_investment','https://rosstat.gov.ru/scripts/db_inet2/passport/table.aspx?opt=71876000202420252026','verified','Общий объём вложений по организациям, находящимся на территории Сургута, без субъектов малого предпринимательства. Не путать с местным бюджетом и инвестициями на душу населения.','municipality','Сургут'),
 ('surgut','fixed_capital_investment_enterprises_non_sme','Инвестиции в основной капитал организаций на территории муниципалитета, без субъектов малого предпринимательства',2025,'annual',108433026,'тыс. руб.','rosstat_surgut_total_capital_investment','https://rosstat.gov.ru/scripts/db_inet2/passport/table.aspx?opt=71876000202420252026','verified','Общий объём вложений по организациям, находящимся на территории Сургута, без субъектов малого предпринимательства. Не путать с местным бюджетом и инвестициями на душу населения.','municipality','Сургут')
on conflict (municipality_id,indicator_code,reference_year,reference_period,source_id) do update set
 indicator_name=excluded.indicator_name,value=excluded.value,unit=excluded.unit,source_url=excluded.source_url,
 retrieved_at=now(),verification_status=excluded.verification_status,notes=excluded.notes,
 geographic_level=excluded.geographic_level,geographic_name=excluded.geographic_name,updated_at=now();