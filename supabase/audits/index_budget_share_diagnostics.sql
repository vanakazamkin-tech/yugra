-- Read-only diagnostic: municipal budget composition and scale effects.
-- No tables are created or modified. Values are compared only within the same
-- municipality, reference year and reference period.
with budget_pivot as (
  select
    municipality_id,
    reference_year,
    reference_period,
    max(value::numeric) filter (where indicator_code = 'budget_total_revenue') as total_revenue,
    max(value::numeric) filter (where indicator_code = 'budget_revenue_excluding_grants') as revenue_excluding_grants,
    max(value::numeric) filter (where indicator_code = 'budget_intergovernmental_transfers') as intergovernmental_transfers,
    max(value::numeric) filter (where indicator_code = 'budget_tax_non_tax_revenue') as tax_non_tax_revenue
  from public.municipality_indicators
  where verification_status = 'verified'
    and geographic_level = 'municipality'
    and indicator_code in (
      'budget_total_revenue',
      'budget_revenue_excluding_grants',
      'budget_intergovernmental_transfers',
      'budget_tax_non_tax_revenue'
    )
  group by municipality_id, reference_year, reference_period
),
ratios as (
  select *,
    revenue_excluding_grants / nullif(total_revenue, 0) * 100 as own_revenue_share_pct,
    intergovernmental_transfers / nullif(total_revenue, 0) * 100 as transfer_share_pct,
    tax_non_tax_revenue / nullif(total_revenue, 0) * 100 as tax_non_tax_share_pct,
    revenue_excluding_grants + intergovernmental_transfers - total_revenue as decomposition_difference
  from budget_pivot
  where total_revenue is not null
    and revenue_excluding_grants is not null
    and intergovernmental_transfers is not null
)
-- Summary for each comparable time slice.
select
  reference_year,
  reference_period,
  count(*) as municipalities,
  round(avg(own_revenue_share_pct)::numeric, 2) as mean_own_revenue_share_pct,
  round(min(own_revenue_share_pct)::numeric, 2) as min_own_revenue_share_pct,
  round(max(own_revenue_share_pct)::numeric, 2) as max_own_revenue_share_pct,
  round(avg(transfer_share_pct)::numeric, 2) as mean_transfer_share_pct,
  round(max(abs(decomposition_difference))::numeric, 4) as max_decomposition_difference,
  round(corr(total_revenue, revenue_excluding_grants)::numeric, 4) as raw_scale_correlation,
  round(corr(total_revenue, own_revenue_share_pct)::numeric, 4) as scale_vs_own_share_correlation,
  round(corr(total_revenue, transfer_share_pct)::numeric, 4) as scale_vs_transfer_share_correlation,
  round(corr(revenue_excluding_grants, tax_non_tax_revenue)::numeric, 4) as own_vs_tax_non_tax_correlation
from ratios
group by reference_year, reference_period
order by reference_year, reference_period;

-- Municipality-level detail. A missing row means one or more components are
-- unavailable for that municipality/time slice; do not impute missing values.
select
  municipality_id,
  reference_year,
  reference_period,
  round(total_revenue::numeric, 2) as total_revenue,
  round(revenue_excluding_grants::numeric, 2) as revenue_excluding_grants,
  round(intergovernmental_transfers::numeric, 2) as intergovernmental_transfers,
  round(own_revenue_share_pct::numeric, 2) as own_revenue_share_pct,
  round(transfer_share_pct::numeric, 2) as transfer_share_pct,
  round(decomposition_difference::numeric, 4) as decomposition_difference
from ratios
order by reference_year, reference_period, municipality_id;
