-- Read-only quality audit for public.municipality_indicators.
-- Safe to run repeatedly: this file contains SELECT statements only.
-- "verified" records have a source and metadata, but this audit does not prove
-- that each value was transcribed correctly from its official publication.

-- 1. Overall inventory.
SELECT
  COUNT(*) AS total_observations,
  COUNT(*) FILTER (WHERE verification_status = 'verified') AS verified_observations,
  COUNT(DISTINCT indicator_code) AS indicator_codes,
  COUNT(DISTINCT source_id) AS sources_used,
  COUNT(DISTINCT municipality_id) FILTER (WHERE geographic_level = 'municipality') AS municipalities_with_municipal_level_data
FROM public.municipality_indicators;

-- 2. Missing provenance or basic metadata, unexpected status, and negative values.
SELECT 'missing_source_url' AS check_name, COUNT(*) AS affected_rows
FROM public.municipality_indicators WHERE source_url IS NULL OR BTRIM(source_url) = ''
UNION ALL
SELECT 'missing_unit', COUNT(*)
FROM public.municipality_indicators WHERE unit IS NULL OR BTRIM(unit) = ''
UNION ALL
SELECT 'missing_geography', COUNT(*)
FROM public.municipality_indicators WHERE geographic_level IS NULL OR BTRIM(geographic_level) = ''
UNION ALL
SELECT 'missing_period', COUNT(*)
FROM public.municipality_indicators WHERE reference_period IS NULL OR BTRIM(reference_period) = ''
UNION ALL
SELECT 'negative_value', COUNT(*)
FROM public.municipality_indicators WHERE value < 0
UNION ALL
SELECT 'not_verified', COUNT(*)
FROM public.municipality_indicators
WHERE verification_status IS DISTINCT FROM 'verified';

-- 3. Duplicate logical keys. Source is included because two publications may
-- legitimately contain the same measure for the same territory and period.
SELECT municipality_id, indicator_code, reference_year, reference_period, source_id,
       COUNT(*) AS duplicate_rows
FROM public.municipality_indicators
GROUP BY municipality_id, indicator_code, reference_year, reference_period, source_id
HAVING COUNT(*) > 1
ORDER BY duplicate_rows DESC, municipality_id, indicator_code;

-- 4. Indicator codes whose labels vary across records. Review before combining
-- series: different labels can be harmless wording variants or different scopes.
SELECT indicator_code,
       COUNT(DISTINCT indicator_name) AS distinct_labels,
       STRING_AGG(DISTINCT indicator_name, ' | ' ORDER BY indicator_name) AS labels,
       COUNT(DISTINCT unit) AS distinct_units,
       STRING_AGG(DISTINCT unit, ', ' ORDER BY unit) AS units
FROM public.municipality_indicators
GROUP BY indicator_code
HAVING COUNT(DISTINCT indicator_name) > 1 OR COUNT(DISTINCT unit) > 1
ORDER BY distinct_units DESC, distinct_labels DESC, indicator_code;

-- 5. Coverage by category heuristic. This is presence of data, not completeness
-- of all periods or indicators. Change the CASE mapping as the taxonomy evolves.
SELECT
  CASE
    WHEN indicator_code ILIKE '%population%' THEN 'population'
    WHEN indicator_code ILIKE '%salary%' OR indicator_code ILIKE '%wage%' THEN 'salary'
    WHEN indicator_code ILIKE '%employee%' OR indicator_code ILIKE '%employment%' THEN 'employment'
    WHEN indicator_code ILIKE '%investment%' THEN 'investment'
    WHEN indicator_code ILIKE '%sme%' OR indicator_code ILIKE '%entrepreneur%' THEN 'entrepreneurship'
    ELSE 'other'
  END AS category,
  COUNT(*) AS observations,
  COUNT(DISTINCT municipality_id) FILTER (WHERE geographic_level = 'municipality') AS municipalities
FROM public.municipality_indicators
WHERE verification_status = 'verified'
GROUP BY category
ORDER BY category;
