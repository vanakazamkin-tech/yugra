DROP POLICY IF EXISTS "Public can read municipality indicators" ON public.municipality_indicators;
CREATE POLICY "Public can read verified municipality indicators"
  ON public.municipality_indicators FOR SELECT TO anon, authenticated
  USING (verification_status = 'verified');

DROP POLICY IF EXISTS "Public can read investment sites" ON public.investment_sites;
CREATE POLICY "Public can read verified investment sites"
  ON public.investment_sites FOR SELECT TO anon, authenticated
  USING (verification_status = 'verified');

DROP POLICY IF EXISTS "Public can read municipal program execution" ON public.municipal_program_execution;
CREATE POLICY "Public can read verified municipal program execution"
  ON public.municipal_program_execution FOR SELECT TO anon, authenticated
  USING (verification_status = 'verified');
