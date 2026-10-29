-- Read-only audit of the source fields used by the conceptual forecast.
-- Run in Supabase SQL Editor. This query does not modify data.
-- The forecast UI reads these baseline fields from public.municipalities.
-- IMPORTANT: "score" is a project composite index (observed values can exceed 100),
-- so it must not be validated against a 0-100 scale. assessment_score is a separate
-- rating-like field and is checked separately.

select
  count(*) as municipality_count,
  count(investments_volume_billion) as investment_baseline_count,
  count(*) filter (where investments_volume_billion is null) as investment_missing_count,
  count(*) filter (where investments_volume_billion < 0) as investment_negative_count,
  count(sme_count) as sme_baseline_count,
  count(*) filter (where sme_count is null) as sme_missing_count,
  count(*) filter (where sme_count < 0) as sme_negative_count,
  count(score) as composite_score_count,
  count(*) filter (where score is null) as composite_score_missing_count,
  min(score) as composite_score_min,
  max(score) as composite_score_max,
  count(*) filter (where score < 0) as composite_score_negative_count,
  count(assessment_score) as assessment_score_count,
  min(assessment_score) as assessment_score_min,
  max(assessment_score) as assessment_score_max,
  count(*) filter (where assessment_score < 0 or assessment_score > 5) as assessment_score_outside_0_5_count
from public.municipalities;

-- List rows needing review: negative count/index values or assessment scores outside 0-5.
-- Missing investment/SME baselines are reported above; they are not converted to zero.
select
  id,
  name,
  investments_volume_billion,
  sme_count,
  score as composite_score,
  assessment_score
from public.municipalities
where investments_volume_billion < 0
   or sme_count < 0
   or score < 0
   or assessment_score < 0
   or assessment_score > 5
order by name;
