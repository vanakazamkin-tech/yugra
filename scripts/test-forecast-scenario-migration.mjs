import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationPath = path.join(root, 'supabase/migrations/20261107055913_forecast_scenario_alignment.sql');
const sql = await readFile(migrationPath, 'utf8');
const normalized = sql.toLowerCase().replace(/\s+/g, ' ');

for (const column of ['export_shock_pct', 'cost_pressure_pct', 'labor_shortage_pct']) {
  assert.match(normalized, new RegExp('add column if not exists ' + column), `migration must add ${column} idempotently`);
}

assert.match(normalized, /drop constraint if exists forecast_scenario_rates_check/);
assert.match(normalized, /add constraint forecast_scenario_rates_check check/);
assert.match(normalized, /drop constraint if exists forecast_runs_horizon_years_check/);
assert.match(normalized, /add constraint forecast_runs_horizon_years_check check/);
assert.match(normalized, /horizon_years in \(1, 2, 3\)/);
assert.match(normalized, /where key in \('cautious', 'base', 'ambitious'\)/);
assert.match(normalized, /is distinct from/, 'seed update must avoid unnecessary updated_at churn');

for (const forbidden of [
  /\bgrant\b/,
  /\brevoke\b/,
  /\bcreate policy\b/,
  /\bdrop policy\b/,
  /\benable row level security\b/,
  /\bdisable row level security\b/,
  /\btruncate\b/,
  /\bdrop table\b/,
  /\bdelete from\b/,
]) {
  assert.doesNotMatch(normalized, forbidden, `migration must not contain unsafe operation: ${forbidden}`);
}

console.log('Forecast scenario migration safety checks passed.');
