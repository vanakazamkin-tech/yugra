-- Keep incremental browser snapshots in sync with edits and upserts.
-- Existing rows and their verification states are not changed.
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
    'municipal_program_execution'
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
