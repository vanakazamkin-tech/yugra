-- Public forecast result writes are disabled.
-- Forecast calculations now stay in the browser; users can export results as CSV.
drop policy if exists "Public can save bounded forecast runs" on public.forecast_runs;
revoke insert on table public.forecast_runs from anon, authenticated;
