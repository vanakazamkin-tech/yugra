-- Keep incremental browser snapshots in sync with edits and upserts.
-- Existing rows and their verification states are not changed.
ALTER TABLE public.external_rating_results
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

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

DO $block$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'municipalities',
    'data_sources',
    'municipality_indicators',
    'investment_sites',
    'municipal_program_execution',
    'fuel_price_observations',
    'municipal_facilities',
    'external_rating_catalog',
    'external_rating_results',
    'municipal_investment_projects',
    'municipal_industrial_enterprises',
    'municipal_infrastructure_objects',
    'municipal_land_parcels'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_trigger t
      WHERE t.tgrelid = pg_catalog.to_regclass('public.' || target_table)
        AND t.tgname = 'trg_' || target_table || '_updated_at'
        AND NOT t.tgisinternal
    ) THEN
      EXECUTE pg_catalog.format(
        'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
        'trg_' || target_table || '_updated_at',
        target_table
      );
    END IF;
  END LOOP;
END;
$block$;

CREATE INDEX IF NOT EXISTS idx_municipality_indicators_verified_updated_at
  ON public.municipality_indicators (updated_at)
  WHERE verification_status = 'verified';
CREATE INDEX IF NOT EXISTS idx_municipal_program_execution_verified_updated_at
  ON public.municipal_program_execution (updated_at)
  WHERE verification_status = 'verified';
CREATE INDEX IF NOT EXISTS idx_data_sources_updated_at
  ON public.data_sources (updated_at);
CREATE INDEX IF NOT EXISTS idx_external_rating_results_verified_created_at
  ON public.external_rating_results (created_at)
  WHERE verification_status = 'verified';
