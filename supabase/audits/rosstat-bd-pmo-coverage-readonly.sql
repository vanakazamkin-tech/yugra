-- Yugra18: read-only coverage check for selected 2026 Rosstat BD PMO candidates.
-- Run against production only as SELECT statements. This file does not mutate data.
-- Coverage is presence by municipality_id at municipality geography; it does not
-- certify definition, source equivalence, completeness, or comparability.

with targets(indicator_code,priority,rosstat_db_pmo_number,rosstat_2026_indicator_code,expected_period,description) as (
  values
    ('population_municipality','P0','8112027','2311000010003','annual / 1 January','Population estimate, all municipal types'),
    ('population_urban_municipality','P1','8112015','2311000010003','annual / 1 January','Urban population by sex and age'),
    ('population_rural_municipality','P1','8112016','2311000010003','annual / 1 January','Rural population by sex and age'),
    ('average_employees_q1','P0','8423005','1121100010003','quarterly, cumulative','Average headcount excluding small businesses'),
    ('average_monthly_salary_q1','P0','8423007','2211110020001','quarterly, cumulative','Average monthly nominal salary excluding small businesses'),
    ('average_employees_municipal_form','P1','8423015','1121100010003','January–December','Average headcount in municipally owned organizations'),
    ('payroll_fund_municipal_form','P1','8423016','2152320020022','January–December','Payroll fund in municipally owned organizations'),
    ('average_monthly_salary_municipal_form','P1','8423017','2211110020001','January–December','Average monthly salary in municipally owned organizations'),
    ('fixed_capital_investment_enterprises_non_sme','P0','8109001','1141100020001','annual','Fixed-capital investment by organizations excluding SMEs'),
    ('fixed_capital_investment_local_budget','P1','8009001','1141100020001','annual','Fixed-capital investment financed by local budgets'),
    ('housing_commissioned_reported','P0','8010001','2231000010002','annual','Commissioned residential buildings')
),
coverage as (
  select t.*,
    count(distinct i.municipality_id) filter(where i.geographic_level='municipality') as municipalities_covered,
    count(distinct i.reference_year) filter(where i.geographic_level='municipality') as years_covered,
    min(i.reference_year) filter(where i.geographic_level='municipality') as first_year,
    max(i.reference_year) filter(where i.geographic_level='municipality') as last_year,
    count(i.id) filter(where i.geographic_level='municipality' and i.verification_status='verified') as verified_rows,
    count(i.id) filter(where i.geographic_level='municipality' and i.verification_status <> 'verified') as nonverified_rows
  from targets t
  left join public.municipality_indicators i
    on i.indicator_code=t.indicator_code
  group by t.indicator_code,t.priority,t.rosstat_db_pmo_number,
    t.rosstat_2026_indicator_code,t.expected_period,t.description
)
select c.indicator_code,c.priority,c.rosstat_db_pmo_number,
  c.rosstat_2026_indicator_code,c.expected_period,c.description,
  c.municipalities_covered,c.years_covered,c.first_year,c.last_year,
  c.verified_rows,c.nonverified_rows,
  string_agg(m.name,', ' order by m.name) filter(where not exists (
    select 1 from public.municipality_indicators i
    where i.municipality_id=m.id
      and i.indicator_code=c.indicator_code
      and i.geographic_level='municipality'
  )) as missing_municipalities
from coverage c
cross join public.municipalities m
group by c.indicator_code,c.priority,c.rosstat_db_pmo_number,
  c.rosstat_2026_indicator_code,c.expected_period,c.description,
  c.municipalities_covered,c.years_covered,c.first_year,c.last_year,
  c.verified_rows,c.nonverified_rows
order by c.priority,c.indicator_code;

-- Full coverage counts by existing code and unit. This intentionally shows
-- source conflicts and verification status separately; 22/22 does not equal
-- "safe for the index".
select i.indicator_code,max(i.indicator_name) as indicator_name,i.unit,
  count(distinct i.municipality_id) as municipalities_covered,
  count(distinct i.reference_year) as years_covered,
  min(i.reference_year) as first_year,max(i.reference_year) as last_year,
  count(*) filter(where i.verification_status='verified') as verified_rows,
  count(*) filter(where i.verification_status <> 'verified') as nonverified_rows,
  count(distinct i.source_id) as source_count,
  array_agg(distinct i.reference_period order by i.reference_period) as periods
from public.municipality_indicators i
where i.geographic_level='municipality'
group by i.indicator_code,i.unit
having count(distinct i.municipality_id)=22
order by i.indicator_code,i.unit;

-- Missing municipality list for labour, salary, investment and housing priorities.
with targets(indicator_code) as (
  values ('average_employees_q1'),('average_employees_annual'),
    ('average_employees_h1'),('average_monthly_salary_annual'),
    ('average_monthly_salary_h1'),('average_monthly_salary_q1'),
    ('fixed_capital_investment_enterprises_non_sme'),
    ('fixed_capital_investment_local_budget'),('housing_commissioned_reported')
)
select t.indicator_code,
  count(i.id) filter(where i.geographic_level='municipality') as observation_rows,
  count(distinct i.municipality_id) filter(where i.geographic_level='municipality') as municipalities_covered,
  string_agg(m.name,', ' order by m.name) filter(where not exists (
    select 1 from public.municipality_indicators x
    where x.municipality_id=m.id and x.indicator_code=t.indicator_code
      and x.geographic_level='municipality'
  )) as missing_municipalities
from targets t
cross join public.municipalities m
left join public.municipality_indicators i
  on i.municipality_id=m.id and i.indicator_code=t.indicator_code
group by t.indicator_code
order by municipalities_covered desc,t.indicator_code;


-- Source readiness is a separate dimension from indicator coverage.
-- Identified sources are candidates only; they do not imply extracted observations.
select id,name,import_status,last_checked_at,notes
from public.data_sources
where id in (
  'rosstat_hmao_municipal_monitoring_2023_2025',
  'rosstat_oktmo_open_data_2026_10',
  'rosstat_oktmo_codingtable_2026_10',
  'rosstat_bdmo_indicator_list_2026'
)
order by id;
