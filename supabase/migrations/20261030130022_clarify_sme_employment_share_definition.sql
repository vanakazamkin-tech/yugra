-- Mirrors the already-applied Supabase migration 20261030130022.
-- Preserve the exact source definition: SME and total employment exclude external part-time workers.
UPDATE public.municipality_indicators
SET indicator_name = 'Доля среднесписочной численности работников (без внешних совместителей) малых и средних предприятий в среднесписочной численности работников (без внешних совместителей) всех предприятий и организаций',
    notes = 'Таблица 12 аналитического отчёта рейтинга муниципальных образований за 2023 год. Доля рассчитана без внешних совместителей; не является общей занятостью или уровнем безработицы.',
    updated_at = now()
WHERE source_id = 'investugra_municipal_rating_report_2023'
  AND indicator_code = 'sme_employment_share';
