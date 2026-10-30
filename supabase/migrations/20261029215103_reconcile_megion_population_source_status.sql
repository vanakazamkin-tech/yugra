-- Reconcile the Megion open-data catalog status with the actual imported rows.
-- The published 59,732 value is currently attributed to the Rosstat municipal series.
-- Do not mark the Megion dataset as imported until its source file and geography are verified.
UPDATE public.data_sources AS ds
SET import_status = 'identified',
    notes = 'В наборе открытых данных опубликовано значение 59 732 человека на 01.01.2025. Однако в текущей базе соответствующее наблюдение привязано к источнику Росстата rosstat_hmao_municipal_population_2022_2025; записей с source_id megion_admin_territorial_population нет ни в одной импортной таблице. До сверки исходного файла, географического уровня и происхождения значения набор не считается импортированным.',
    last_checked_at = now(),
    updated_at = now()
WHERE ds.id = 'megion_admin_territorial_population'
  AND ds.import_status = 'partially_imported'
  AND NOT EXISTS (SELECT 1 FROM public.municipality_indicators WHERE source_id = ds.id)
  AND NOT EXISTS (SELECT 1 FROM public.investment_sites WHERE source_id = ds.id)
  AND NOT EXISTS (SELECT 1 FROM public.municipal_facilities WHERE source_id = ds.id)
  AND NOT EXISTS (SELECT 1 FROM public.municipal_program_execution WHERE source_id = ds.id)
  AND NOT EXISTS (SELECT 1 FROM public.fuel_price_observations WHERE source_id = ds.id);
