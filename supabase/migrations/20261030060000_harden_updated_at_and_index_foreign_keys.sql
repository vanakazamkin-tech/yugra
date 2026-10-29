-- Tighten trigger function resolution and add indexes for foreign-key lookups.
-- This migration does not grant new table access or change RLS policies.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$function$;

CREATE INDEX IF NOT EXISTS municipality_indicators_source_id_idx
  ON public.municipality_indicators (source_id);

CREATE INDEX IF NOT EXISTS municipal_facilities_municipality_id_idx
  ON public.municipal_facilities (municipality_id);

CREATE INDEX IF NOT EXISTS municipal_facilities_source_id_idx
  ON public.municipal_facilities (source_id);

CREATE INDEX IF NOT EXISTS municipal_program_execution_source_id_idx
  ON public.municipal_program_execution (source_id);

CREATE INDEX IF NOT EXISTS forecast_runs_scenario_id_idx
  ON public.forecast_runs (scenario_id);
