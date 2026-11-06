import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  'supabase/migrations/20261106233000_extend_data_source_provenance_metadata.sql',
  'utf8',
);

for (const column of ['data_owner', 'temporal_coverage', 'data_type', 'access_restrictions', 'retrieved_at']) {
  assert.match(migration, new RegExp('add column if not exists ' + column, 'i'), column + ' must be additive');
  assert.match(migration, new RegExp('comment on column public\\.data_sources\\.' + column, 'i'), column + ' must be documented');
}
assert.doesNotMatch(migration, /not null|default\s+now\(\)/i, 'legacy metadata must remain nullable; do not fabricate dates');
assert.doesNotMatch(migration, /grant\s+[^;]*\bto\s+(public|anon|authenticated)\b/i, 'do not expand public privileges');
assert.doesNotMatch(migration, /disable row level security/i, 'RLS must remain enabled');

console.log('Source catalog migration contract checks passed.');
