import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const checks = [
  ['Migration staging syntax', ['--check', 'scripts/prepare-rosstat-migration-import.mjs']],
  ['Migration staging filters', ['scripts/test-rosstat-migration-staging.mjs']],
  ['Forecast coverage classification', ['scripts/test-forecast-coverage.mjs']],
  ['Risk data provenance and geography gates', ['scripts/test-risk-data-gates.mjs']],
  ['Indicator classification and risk model pillars', ['scripts/test-risk-model-pillars.mjs']],
  ['Official comparison comparability', ['scripts/test-official-comparison-gates.mjs']],
  ['Analytical report official-data gates', ['scripts/test-report-official-data-gates.mjs']],
  ['Municipality passport data integrity', ['scripts/test-municipality-passport-gates.mjs']],
  ['Operational registry data integrity', ['scripts/test-operational-registry-gates.mjs']],
];

const optionalChecks = [
  ['Six-pillar resilience index methodology', 'scripts/test-resilience-index.mjs'],
];

let failed = 0;
for (const [name, args] of checks) {
  console.log(`\n▶ ${name}`);
  if (args.length === 1 && !existsSync(args[0])) {
    console.error(`Missing required test file: ${args[0]}`);
    failed += 1;
    continue;
  }
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.error) {
    console.error(result.error);
    failed += 1;
  } else if (result.status !== 0) {
    console.error(`✗ ${name} failed (exit ${result.status ?? 'unknown'})`);
    failed += 1;
  }
}

for (const [name, path] of optionalChecks) {
  if (!existsSync(path)) {
    console.log(`↷ ${name}: not present on this branch; skipped`);
    continue;
  }
  console.log(`\n▶ ${name}`);
  const result = spawnSync(process.execPath, [path], { stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    console.error(result.error || `✗ ${name} failed (exit ${result.status ?? 'unknown'})`);
    failed += 1;
  }
}

if (failed) {
  console.error(`\nQA suite failed: ${failed} check(s).`);
  process.exitCode = 1;
} else {
  console.log('\nQA suite passed.');
}
