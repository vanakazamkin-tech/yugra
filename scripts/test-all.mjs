import { existsSync, readdirSync } from 'node:fs';
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
let passed = 0;
let skipped = 0;

for (const [name, args] of checks) {
  console.log(`\n▶ ${name}`);
  if (args.length === 1 && !existsSync(args[0])) {
    console.error(`Missing required test file: ${args[0]}`);
    failed += 1;
    continue;
  }
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    console.error(result.error || `✗ ${name} failed (exit ${result.status ?? 'unknown'})`);
    failed += 1;
  } else {
    passed += 1;
  }
}

for (const [name, path] of optionalChecks) {
  if (!existsSync(path)) {
    console.log(`↷ ${name}: not present on this branch; skipped`);
    skipped += 1;
    continue;
  }
  console.log(`\n▶ ${name}`);
  const result = spawnSync(process.execPath, [path], { stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    console.error(result.error || `✗ ${name} failed (exit ${result.status ?? 'unknown'})`);
    failed += 1;
  } else {
    passed += 1;
  }
}

// Run Node's built-in unit-test files whenever the corresponding feature PRs
// have been integrated into this checkout. This keeps QA extensible without
// importing feature code into the isolated QA branch prematurely.
const unitTestFiles = existsSync('src/lib')
  ? readdirSync('src/lib')
    .filter((file) => file.endsWith('.test.js'))
    .sort()
    .map((file) => `src/lib/${file}`)
  : [];

if (unitTestFiles.length) {
  console.log(`\n▶ Node.js unit tests (${unitTestFiles.length} file(s))`);
  const result = spawnSync(process.execPath, ['--test', ...unitTestFiles], { stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    console.error(result.error || `✗ Node.js unit tests failed (exit ${result.status ?? 'unknown'})`);
    failed += 1;
  } else {
    passed += 1;
  }
} else {
  console.log('\n↷ Node.js unit tests: no src/lib/*.test.js files on this branch; skipped');
  skipped += 1;
}

console.log(`\nQA checks: ${passed} passed, ${failed} failed, ${skipped} skipped.`);
if (failed) {
  console.error('QA suite failed.');
  process.exitCode = 1;
} else {
  console.log('QA suite passed.');
}
