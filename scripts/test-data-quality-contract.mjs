import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationPath = 'supabase/migrations/20261106230000_add_municipality_indicator_quality_view.sql';
const migration = readFileSync(migrationPath, 'utf8');
const assertions = readFileSync('supabase/tests/data_quality_audit.sql', 'utf8');

assert.match(migration, /security_invoker\s*=\s*true/i, 'quality view must respect caller privileges');
assert.match(migration, /conflicting_source_values/, 'must identify source disagreements');
assert.match(migration, /noncanonical_period_label/, 'must identify period-label inconsistencies');
assert.match(migration, /verification_backlog/, 'must expose unverified observations for review');
assert.match(migration, /\[0-9\]\{4\}/, 'bare years must be accepted as annual period labels');
assert.match(migration, /group by[\s\S]*geographic_level[\s\S]*geographic_name/i, 'conflict keys must retain geographic scope');
assert.match(migration, /and count\(distinct source_id\) > 1/i, 'cross-source conflict view must require multiple sources');
assert.match(migration, /revoke all .*anon, authenticated/is, 'quality view must not be exposed to API roles');
assert.match(migration, /grant select on table public\.municipality_indicator_quality_issues to service_role/i, 'service role must be able to read the private diagnostic view');
assert.doesNotMatch(migration, /\b(insert\s+into|update\s+public\.|delete\s+from|truncate)\b/i, 'diagnostics migration must not mutate observations');
assert.match(assertions, /known multi-source disagreement/i, 'SQL regression assertions must cover known conflict');
assert.match(assertions, /legitimate negative growth value/i, 'SQL regression assertions must protect valid negative values');
console.log('Data-quality contract checks passed.');

const provenanceMigration = readFileSync('supabase/migrations/20261106210000_data_quality_provenance_guardrails.sql', 'utf8');
const metadataMigration = readFileSync('supabase/migrations/20261106233000_extend_data_source_provenance_metadata.sql', 'utf8');
const auditSql = readFileSync('supabase/audits/data-quality-audit.sql', 'utf8');

assert.match(provenanceMigration, /create table if not exists private\.municipality_indicator_source_links/i, 'provenance relation must be private and additive');
assert.match(provenanceMigration, /on conflict \(indicator_id, source_id, source_role\) do nothing/i, 'provenance backfill must be idempotent');
assert.match(provenanceMigration, /revoke all privileges on table private\.municipality_indicator_source_links[\s\S]*from public, anon, authenticated/i, 'private provenance must not be exposed to API roles');
assert.match(provenanceMigration, /grant select, insert, update, delete on table private\.municipality_indicator_source_links[\s\S]*to service_role/i, 'service role must retain provenance maintenance access');
assert.match(metadataMigration, /add column if not exists data_owner text/i, 'source owner metadata must be available');
assert.match(metadataMigration, /add column if not exists temporal_coverage text/i, 'temporal coverage metadata must be available');
assert.match(metadataMigration, /add column if not exists access_restrictions text/i, 'access restrictions metadata must be available');
assert.match(auditSql, /observations_without_provenance_link/i, 'read-only audit must identify observations without provenance');
assert.match(auditSql, /municipality_indicator_quality_issues/i, 'read-only audit must summarize diagnostic flags');
assert.match(auditSql, /unchecked_access_restrictions/i, 'read-only audit must expose unchecked source restrictions');
assert.match(auditSql, /reference_period !~ '[^']*\[0-9\]\{4\}/i, 'period audit must preserve explicit canonical vocabulary');
console.log('Extended provenance and source-quality audit contract checks passed.');
