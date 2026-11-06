import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationPath = 'supabase/migrations/20261106230000_add_municipality_indicator_quality_view.sql';
const migration = readFileSync(migrationPath, 'utf8');
const assertions = readFileSync('supabase/tests/data_quality_audit.sql', 'utf8');

assert.match(migration, /security_invoker\s*=\s*true/i, 'quality view must respect caller privileges');
assert.match(migration, /conflicting_source_values/, 'must identify source disagreements');
assert.match(migration, /noncanonical_period_label/, 'must identify period-label inconsistencies');
assert.match(migration, /verification_backlog/, 'must expose unverified observations for review');
assert.match(migration, /group by[\\s\\S]*geographic_level[\\s\\S]*geographic_name/i, 'conflict keys must retain geographic scope');
assert.match(migration, /having count\\(distinct source_id\\) > 1/i, 'cross-source conflict view must require multiple sources');
assert.match(migration, /revoke all .*anon, authenticated/is, 'quality view must not be exposed to API roles');
assert.doesNotMatch(migration, /\b(insert\s+into|update\s+public\.|delete\s+from|truncate)\b/i, 'diagnostics migration must not mutate observations');
assert.match(assertions, /known multi-source disagreement/i, 'SQL regression assertions must cover known conflict');
assert.match(assertions, /legitimate negative growth value/i, 'SQL regression assertions must protect valid negative values');
console.log('Data-quality contract checks passed.');
