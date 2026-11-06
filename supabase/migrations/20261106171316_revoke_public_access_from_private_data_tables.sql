-- Private operational tables are not part of the public Data API.
-- RLS remains enabled; this also removes unnecessary object-level grants.
REVOKE ALL PRIVILEGES ON TABLE
  public.forecast_runs,
  public.municipality_indicator_import_staging,
  public.municipality_indicator_import_review
FROM PUBLIC, anon, authenticated;

-- Stop future public-schema tables created by postgres migrations from
-- inheriting broad API-role grants automatically. Public tables must be
-- granted explicitly together with their RLS policies.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated;
