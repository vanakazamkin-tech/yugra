import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationPath = 'supabase/migrations/20261118033000_harden_staging_import_integrity.sql';
const migration = readFileSync(migrationPath, 'utf8');
const compact = migration.replace(/\s+/g, ' ').toLowerCase();

for (const column of [
  'normalized_period text',
  'source_url_snapshot text',
  'source_published_at date',
  'source_retrieved_at timestamptz',
]) {
  assert.ok(compact.includes(column), 'staging must preserve ' + column);
}

for (const token of [
  "normalized_period is not null",
  "normalized_period ~ '^(annual|[0-9]{4}|[0-9]{4}-q[1-4]|[0-9]{4}-h[1-2]|[0-9]{4}-(0[1-9]|1[0-2])|[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]))$'",
  "make_date(",
  "substring(normalized_period, 9, 2)::integer - 1",
  "extract(month from (",
  "extract(year from (",
  "left(normalized_period, 4) = raw_year::text",
  "nullif(btrim(source_record_key), '') is not null",
  "nullif(btrim(reviewed_by), '') is not null",
  "coalesce(cardinality(validation_errors), 0) = 0",
  "source_retrieved_at is not null",
  "source_url_snapshot ~* '^https?://'",
  "geographic_level is not distinct from 'municipality'",
]) {
  assert.ok(compact.includes(token), 'accepted-row contract is missing: ' + token);
}

assert.ok(compact.includes("mi.source_id = s.source_id"), 'duplicate gate must allow independent source observations');
assert.equal(compact.split('mi.geographic_name = m.name').length - 1, 2, 'both review and RPC duplicate gates must use the joined canonical municipality name');
assert.ok(compact.includes('m.name as canonical_municipality_name'), 'import cursor must carry canonical municipality name');
assert.ok(compact.includes('v_row.canonical_municipality_name'), 'analytical geography must use canonical name, not source alias');
assert.ok(compact.includes('исходное название мо в источнике:'), 'raw source municipality name must remain traceable in notes');
assert.ok(compact.includes('mi.reference_period = s.normalized_period'), 'duplicate gate must use normalized period');
assert.ok(compact.includes('mi.unit = s.normalized_unit'), 'duplicate gate must use normalized unit');
assert.ok(!compact.includes("mi.verification_status = 'verified'"), 'identity duplicate detection must match the unique index across all statuses');
assert.ok(compact.includes('insert into private.municipality_indicator_source_links'),
  'successful imports must create a private primary-source provenance link');
assert.ok(compact.includes('source_url_snapshot'), 'exact source URL snapshot must be preserved');
assert.ok(compact.includes('source_published_at'), 'publication date must flow to observations');
assert.ok(compact.includes('source_retrieved_at'), 'retrieval timestamp must flow to observations');
assert.ok(compact.includes('grant execute on function public.import_accepted_municipality_indicators(text)'),
  'the controlled import RPC must be explicitly granted');
assert.ok(compact.includes('to service_role;'), 'only service_role may execute the controlled import RPC');
assert.ok(compact.includes('with (security_invoker = true)'), 'review view must respect invoker permissions');
assert.ok(!/\bgrant\s+[^;]*\bto\s+(public|anon|authenticated)\b/i.test(migration),
  'migration must not open staging or private provenance to public API roles');
assert.ok(!/\b(drop\s+table|truncate\s+|delete\s+from\s+public\.municipality_indicators)\b/i.test(migration),
  'migration must not destroy data');

const rpcMarker = 'create or replace function public.import_accepted_municipality_indicators';
const rpcStart = migration.toLowerCase().indexOf(rpcMarker);
assert.ok(rpcStart > 0, 'controlled import RPC must be present');
const migrationBeforeRpc = migration.slice(0, rpcStart);
assert.ok(!/\b(insert\s+into|update\s+public\.municipality_indicators)\b/i.test(migrationBeforeRpc),
  'migration preflight must not mutate analytical observations');

assert.match(migration, /do \$accepted_contract\$[\s\S]*?end;\s*\$accepted_contract\$;/i,
  'accepted-row constraint DO block must be syntactically terminated');
assert.match(migration, /create or replace function[\s\S]*?end;\s*\$\$;/i,
  'controlled import function must be syntactically terminated');

console.log('Staging import integrity and provenance contract checks passed.');
