import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  'supabase/migrations/20261107055915_data_quality_provenance_guardrails.sql',
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

const uniqueIndex = migration.match(/create unique index if not exists uq_municipality_indicators_source_observation([\s\S]*?);/i)?.[1] ?? '';
for (const part of ['source_id', 'unit', 'geographic_level', 'coalesce(geographic_name']) {
  assert.ok(uniqueIndex.toLowerCase().includes(part.toLowerCase()), 'full observation key must include ' + part);
}
assert.match(migration, /group by[\s\S]*unit[\s\S]*geographic_level[\s\S]*source_id[\s\S]*having count\(\*\) > 1/i,
  'preflight must detect duplicates using the same full identity key');
assert.match(migration, /drop index if exists public\.municipality_indicators_observation_unique/i,
  'obsolete narrower unique index must be removed after the replacement is installed');
assert.ok(
  migration.indexOf('create unique index if not exists uq_municipality_indicators_source_observation')
    < migration.indexOf('drop index if exists public.municipality_indicators_observation_unique'),
  'replacement index must be installed before the old index is dropped',
);
assert.doesNotMatch(migration, /\b(update|delete from|truncate)\s+public\.municipality_indicators\b/i);
assert.doesNotMatch(migration, /\bgrant\s+[^;]*\bto\s+(public|anon|authenticated)\b/i);
assert.doesNotMatch(migration, /\balter table\s+public\.municipality_indicators\s+disable row level security/i);

console.log('Data-quality migration contract tests passed.');
