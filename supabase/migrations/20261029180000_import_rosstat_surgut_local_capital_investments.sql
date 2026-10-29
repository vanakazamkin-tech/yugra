insert into public.data_sources
 (id,name,category,url,description,format,coverage,update_frequency,import_status,notes,last_checked_at)
values
 ('rosstat_surgut_capital_investments','Росстат — инвестиции в основной капитал за счёт местного бюджета, Сургут','official_statistics',
  'https://rosstat.gov.ru/scripts/db_inet2/passport/table.aspx?opt=71876000202420252026',
  'Показатель инвестиций в основной капитал за счёт средств местных бюджетов в муниципальном паспорте города Сургута.',
  'HTML, база показателей муниципальных образований','Городской округ Сургут; 2024–2025 годы','Годовая','partially_imported',
  'Значения отражают средства местного бюджета и не являются общим объёмом всех инвестиций в основной капитал; не объединять с показателем инвестиций на душу населения без бюджетных средств.',
  now())
on conflict (id) do update set
 name=excluded.name,category=excluded.category,url=excluded.url,description=excluded.description,
 format=excluded.format,coverage=excluded.coverage,update_frequency=excluded.update_frequency,
 import_status=excluded.import_status,notes=excluded.notes,last_checked_at=now(),updated_at=now();

insert into public.municipality_indicators
 (municipality_id,indicator_code,indicator_name,reference_year,reference_period,value,unit,source_id,source_url,verification_status,notes,geographic_level,geographic_name)
values
 ('surgut','fixed_capital_investment_local_budget', 'Инвестиции в основной капитал за счёт средств местных бюджетов',2024,'annual',532783,'тыс. руб.','rosstat_surgut_capital_investments','https://rosstat.gov.ru/scripts/db_inet2/passport/table.aspx?opt=71876000202420252026','verified','Официальный муниципальный паспорт Сургута. Показатель относится к средствам местного бюджета и не представляет общий объём всех инвестиций.','municipality','Сургут'),
 ('surgut','fixed_capital_investment_local_budget', 'Инвестиции в основной капитал за счёт средств местных бюджетов',2025,'annual',1935684,'тыс. руб.','rosstat_surgut_capital_investments','https://rosstat.gov.ru/scripts/db_inet2/passport/table.aspx?opt=71876000202420252026','verified','Официальный муниципальный паспорт Сургута. Показатель относится к средствам местного бюджета и не представляет общий объём всех инвестиций.','municipality','Сургут')
on conflict (municipality_id,indicator_code,reference_year,reference_period,source_id) do update set
 indicator_name=excluded.indicator_name,value=excluded.value,unit=excluded.unit,source_url=excluded.source_url,
 retrieved_at=now(),verification_status=excluded.verification_status,notes=excluded.notes,
 geographic_level=excluded.geographic_level,geographic_name=excluded.geographic_name,updated_at=now();
