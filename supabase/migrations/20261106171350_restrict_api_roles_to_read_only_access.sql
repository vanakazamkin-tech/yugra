-- The Yugra18 browser application is read-only. Data imports and edits
-- must use trusted server-side credentials, never anon/authenticated clients.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON ALL TABLES IN SCHEMA public
FROM anon, authenticated;

-- Re-assert that operational/import relations are not exposed at all.
REVOKE ALL PRIVILEGES ON TABLE
  public.forecast_runs,
  public.municipality_indicator_import_staging,
  public.municipality_indicator_import_review
FROM PUBLIC, anon, authenticated;
