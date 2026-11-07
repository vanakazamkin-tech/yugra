import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const original = readFileSync(
  'supabase/migrations/20261105225539_create_external_ratings_catalog_and_results.sql',
  'utf8',
);
const hardening = readFileSync(
  'supabase/migrations/20261107114255_harden_external_rating_review_default.sql',
  'utf8',
);

assert.match(
  original,
  /verification_status text not null default 'verified'/i,
  'The test documents the original unsafe default that this follow-up migration hardens',
);
assert.match(
  hardening,
  /alter table public\.external_rating_results\s+alter column verification_status set default 'needs_review'/i,
  'New external rating rows must default to needs_review',
);
assert.match(
  hardening,
  /comment on column public\.external_rating_results\.verification_status/i,
  'The review-first default must be documented in the schema',
);
assert.doesNotMatch(
  hardening,
  /\b(insert|update|delete|truncate)\s+(into\s+)?public\.external_rating_results\b/i,
  'The migration must not rewrite existing rows',
);
assert.doesNotMatch(
  hardening,
  /\b(grant|revoke)\b/i,
  'The migration must not change table privileges',
);

console.log('External rating review-default migration contract passed.');
