-- Read-only audit of the source fields used by the conceptual forecast.
-- Run in Supabase SQL Editor. This query does not modify data.
-- The forecast UI reads these baseline fields from public.municipalities.

select
  count(*) as municipality_count,
  count(investments_volume_billion) as investment_baseline_count,
  count(*) filter (where investments_volume_billion is null) as investment_missing_count,
  count(*) filter (where investments_volume_billion < 0) as investment_negative_count,
  count(sme_count) as sme_baseline_count,
  count(*) filter (where sme_count is null) as sme_missing_count,
  count(*) filter (where sme_count < 0) as sme_negative_count,
  count(score) as score_baseline_count,
  count(*) filter (where score is null) as score_missing_count,
  count(*) filter (where score < 0) as score_negative_count,
  count(*) filter (where score > 100) as score_above_100_count
from public.municipalities;

-- List any rows that should be reviewed before they are used as forecast baselines.
select
  id,
  name,
  investments_volume_billion,
  sme_count,
  score,
  assessment_score
from public.municipalities
where investments_volume_billion < 0
   or sme_count < 0
   or score < 0
   or score > 100
order by name;
