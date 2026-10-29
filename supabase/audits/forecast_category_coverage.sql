-- Read-only audit matching the five-group coverage matrix in the forecast UI.
-- Coverage means at least one verified municipality-level observation, not complete
-- indicator or time-series coverage. Settlement-level records are deliberately excluded.
-- Local-budget-funded capital investment is classified as investment, not as a budget series.
-- Verified municipal program-execution records are shown as a limited budget proxy.

WITH classified AS (
  SELECT
    mi.id,
    mi.municipality_id,
    mi.reference_year,
    CASE
      WHEN (mi.indicator_code || ' ' || mi.indicator_name) ~* '(migration|migrat|arrival|departure|миграц|прибывш|выбывш)' THEN 'migration'
      WHEN (mi.indicator_code || ' ' || mi.indicator_name) ~* '(investment|инвестици)' THEN 'investment'
      WHEN (mi.indicator_code || ' ' || mi.indicator_name) ~* '(budget|revenue|expenditure|исполнени[ея].{0,30}программ|бюджет|расходы бюджета|доходы бюджета)' THEN 'budget'
      WHEN (mi.indicator_code || ' ' || mi.indicator_name) ~* '(salary|wage|income|заработн|оплат[аы] труда|доход населения)' THEN 'income'
      WHEN (mi.indicator_code || ' ' || mi.indicator_name) ~* '(employee|employment|employees|работник|занятост)' THEN 'employment'
      ELSE NULL
    END AS category
  FROM public.municipality_indicators mi
  WHERE mi.verification_status = 'verified'
    AND mi.geographic_level = 'municipality'
),
all_rows AS (
  SELECT id::text AS row_id, municipality_id, reference_year, category
  FROM classified
  WHERE category IS NOT NULL
  UNION ALL
  SELECT
    'program-execution:' || mpe.id::text,
    mpe.municipality_id,
    EXTRACT(YEAR FROM mpe.report_date)::integer,
    'budget'
  FROM public.municipal_program_execution mpe
  WHERE mpe.verification_status = 'verified'
),
categories(category, label, display_order) AS (
  VALUES
    ('employment', 'Занятость', 1),
    ('income', 'Доходы населения', 2),
    ('budget', 'Местный бюджет', 3),
    ('migration', 'Миграция', 4),
    ('investment', 'Инвестиции', 5)
)
SELECT
  c.category,
  c.label,
  COUNT(DISTINCT r.municipality_id) AS municipality_count,
  (SELECT COUNT(*) FROM public.municipalities) AS municipality_total,
  COUNT(r.row_id) AS observation_count,
  MAX(r.reference_year) AS latest_year
FROM categories c
LEFT JOIN all_rows r ON r.category = c.category
GROUP BY c.category, c.label, c.display_order
ORDER BY c.display_order;
