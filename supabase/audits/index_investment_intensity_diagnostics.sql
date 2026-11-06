-- Yugra18 investment intensity, distribution and source-name audit.
-- READ ONLY: this script does not create, update or delete database objects.
-- Per-capita values use average population = (population at 1 Jan Y +
-- population at 1 Jan Y+1) / 2. If either endpoint is absent, no ratio is made.
-- Do not add these series together: the codes classify investments by different
-- dimensions (activity scope, enterprise size, and funding source).

-- 1. Cohort summary by exact source indicator name, year and unit.
with population as (
  select municipality_id, reference_year, max(value::numeric) as population_jan1
  from public.municipality_indicators
  where indicator_code = 'population_municipality'
    and verification_status = 'verified'
    and geographic_level = 'municipality'
    and reference_period = reference_year::text || '-01-01'
  group by municipality_id, reference_year
),
investment as (
  select
    municipality_id, indicator_code, indicator_name, reference_year, unit,
    max(value::numeric) as amount,
    count(*) filter (where source_published_at is null) as missing_publication_date_rows
  from public.municipality_indicators
  where verification_status = 'verified'
    and geographic_level = 'municipality'
    and reference_period = 'annual'
    and indicator_code in (
      'fixed_capital_investment_non_mining',
      'fixed_capital_investment_enterprises_non_sme',
      'fixed_capital_investment_local_budget'
    )
  group by municipality_id, indicator_code, indicator_name, reference_year, unit
),
per_capita as (
  select
    i.*,
    (p0.population_jan1 + p1.population_jan1) / 2.0 as average_population,
    case
      when p0.population_jan1 is null or p1.population_jan1 is null then null
      when i.unit in ('тыс. руб.', 'тыс. рублей') then i.amount * 1000
      when i.unit in ('руб.', 'рублей') then i.amount
      else null
    end / nullif((p0.population_jan1 + p1.population_jan1) / 2.0, 0) as rubles_per_person
  from investment i
  left join population p0
    on p0.municipality_id = i.municipality_id
   and p0.reference_year = i.reference_year
  left join population p1
    on p1.municipality_id = i.municipality_id
   and p1.reference_year = i.reference_year + 1
),
p90s as (
  select indicator_code, indicator_name, reference_year, unit,
    percentile_cont(0.9) within group (order by rubles_per_person) as p90
  from per_capita
  where rubles_per_person is not null
  group by indicator_code, indicator_name, reference_year, unit
),
top_shares as (
  select
    pc.indicator_code, pc.indicator_name, pc.reference_year, pc.unit,
    sum(pc.amount) filter (where pc.rubles_per_person >= p.p90)
      / nullif(sum(pc.amount), 0) * 100 as top_decile_share_percent
  from per_capita pc
  join p90s p using (indicator_code, indicator_name, reference_year, unit)
  where pc.rubles_per_person is not null
  group by pc.indicator_code, pc.indicator_name, pc.reference_year, pc.unit
)
select
  pc.indicator_code,
  pc.indicator_name,
  pc.reference_year,
  pc.unit,
  count(*) as municipality_rows,
  count(*) filter (where pc.rubles_per_person is not null) as per_capita_rows,
  count(*) filter (where pc.missing_publication_date_rows > 0) as rows_missing_publication_date,
  round(avg(pc.rubles_per_person)::numeric, 2) as mean_rubles_per_person,
  round(percentile_cont(0.5) within group (order by pc.rubles_per_person)::numeric, 2) as median_rubles_per_person,
  round(percentile_cont(0.9) within group (order by pc.rubles_per_person)::numeric, 2) as p90_rubles_per_person,
  round(min(pc.rubles_per_person)::numeric, 2) as min_rubles_per_person,
  round(max(pc.rubles_per_person)::numeric, 2) as max_rubles_per_person,
  round((max(pc.rubles_per_person) / nullif(min(pc.rubles_per_person), 0))::numeric, 2) as max_min_ratio,
  round(corr(pc.amount, pc.average_population)::numeric, 4) as absolute_amount_population_correlation,
  round(corr(pc.rubles_per_person, pc.average_population)::numeric, 4) as per_capita_population_correlation,
  round(ts.top_decile_share_percent::numeric, 2) as top_decile_share_percent
from per_capita pc
left join top_shares ts using (indicator_code, indicator_name, reference_year, unit)
group by pc.indicator_code, pc.indicator_name, pc.reference_year, pc.unit, ts.top_decile_share_percent
order by pc.indicator_code, pc.reference_year, pc.indicator_name;

-- 2. Municipality-level values for inspection of source-name variants,
-- extreme values and missing average-population denominators.
with population as (
  select municipality_id, reference_year, max(value::numeric) as population_jan1
  from public.municipality_indicators
  where indicator_code = 'population_municipality'
    and verification_status = 'verified'
    and geographic_level = 'municipality'
    and reference_period = reference_year::text || '-01-01'
  group by municipality_id, reference_year
),
investment as (
  select
    municipality_id, indicator_code, indicator_name, reference_year, unit,
    max(value::numeric) as amount,
    count(distinct source_id) as source_count,
    count(*) filter (where source_published_at is null) as missing_publication_date_rows
  from public.municipality_indicators
  where verification_status = 'verified'
    and geographic_level = 'municipality'
    and reference_period = 'annual'
    and indicator_code in (
      'fixed_capital_investment_non_mining',
      'fixed_capital_investment_enterprises_non_sme',
      'fixed_capital_investment_local_budget'
    )
  group by municipality_id, indicator_code, indicator_name, reference_year, unit
),
per_capita as (
  select
    i.*,
    (p0.population_jan1 + p1.population_jan1) / 2.0 as average_population,
    case
      when p0.population_jan1 is null or p1.population_jan1 is null then null
      when i.unit in ('тыс. руб.', 'тыс. рублей') then i.amount * 1000
      when i.unit in ('руб.', 'рублей') then i.amount
      else null
    end / nullif((p0.population_jan1 + p1.population_jan1) / 2.0, 0) as rubles_per_person
  from investment i
  left join population p0
    on p0.municipality_id = i.municipality_id
   and p0.reference_year = i.reference_year
  left join population p1
    on p1.municipality_id = i.municipality_id
   and p1.reference_year = i.reference_year + 1
)
select
  m.name as municipality,
  pc.indicator_code,
  pc.indicator_name,
  pc.reference_year,
  pc.amount,
  pc.unit,
  round(pc.average_population::numeric, 0) as average_population,
  round(pc.rubles_per_person::numeric, 2) as rubles_per_person,
  pc.source_count,
  pc.missing_publication_date_rows
from per_capita pc
join public.municipalities m on m.id = pc.municipality_id
order by pc.indicator_code, pc.reference_year, pc.indicator_name, pc.rubles_per_person desc nulls last;
