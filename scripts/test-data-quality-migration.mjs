import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  'supabase/migrations/20261106210000_data_quality_provenance_guardrails.sql',
  'utf8',
);

assert.match(migration, /create schema if not exists private/i);
assert.match(migration, /create table if not exists private\.municipality_indicator_source_links/i);
assert.match(migration, /references public\.municipality_indicators\(id\)/i);
assert.match(migration, /references public\.data_sources\(id\)/i);
assert.match(migration, /source_role in \(\s*'primary',\s*'input',\s*'methodology',\s*'validation',\s*'context'\s*\)/i);
assert.match(migration, /source_url_snapshot text not null/i);
assert.match(migration, /alter table private\.municipality_indicator_source_links enable row level security/i);
assert.match(migration, /revoke all privileges on table private\.municipality_indicator_source_links\s+from public, anon, authenticated/i);
assert.match(migration, /grant select, insert, update, delete on table private\.municipality_indicator_source_links\s+to service_role/i);
assert.match(migration, /on conflict \(indicator_id,\s*source_id,\s*source_role\) do nothing/i);
assert.match(migration, /create unique index if not exists uq_municipality_indicators_source_observation/i);

// The uniqueness guard includes source_id, so conflicting source observations coexist.
const uniqueIndex = migration.match(/create unique index if not exists uq_municipality_indicators_source_observation([\s\S]*?);/i)?.[1] ?? '';
assert.match(uniqueIndex, /source_id/i);
assert.match(uniqueIndex, /coalesce\(geographic_name/i);

// No rewrite/delete of live observations and no public privilege expansion.
assert.doesNotMatch(migration, /\b(update|delete from|truncate)\s+public\.municipality_indicators\b/i);
assert.doesNotMatch(migration, /\bgrant\s+[^;]*\bto\s+(public|anon|authenticated)\b/i);
assert.doesNotMatch(migration, /\balter table\s+public\.municipality_indicators\s+disable row level security/i);

console.log('Data-quality migration contract tests passed.');
