import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const path = 'docs/INDEX_CANDIDATE_REGISTRY_V1_1.json';
const registry = JSON.parse(readFileSync(path, 'utf8'));

assert.equal(registry.schemaVersion, '1.0');
assert.equal(registry.registryVersion, '1.1-candidate');
assert.equal(registry.snapshotDate, '2026-11-18');
assert.equal(registry.status, 'candidate_for_expert_review');
assert.equal(registry.approvedForCalculation, false);
assert.equal(registry.calculationEnabled, false);
assert.deepEqual(registry.approvedIndicatorIds, []);

const expectedPillars = [
  ['economy', 0.20],
  ['labour', 0.20],
  ['demography', 0.15],
  ['finance', 0.15],
  ['social', 0.15],
  ['infrastructure', 0.15],
];
assert.deepEqual(registry.pillars.map(({ key, weight }) => [key, weight]), expectedPillars);
assert.equal(registry.pillars.reduce((sum, pillar) => sum + pillar.weight, 0), 1);

const ids = registry.indicators.map((item) => item.id);
assert.equal(new Set(ids).size, ids.length, 'registry IDs must be unique');
for (const item of registry.indicators) {
  assert.ok(expectedPillars.some(([key]) => key === item.pillar), item.id + ' has unknown pillar');
  assert.equal(item.approvedForCalculation, false, item.id + ' must not be approved');
  assert.equal(item.calculationEnabled, false, item.id + ' must be calculation-disabled');
  assert.equal(item.expertApproval.status, 'not_approved', item.id + ' needs expert approval');
  assert.equal(item.expertApproval.reviewer, null);
  assert.equal(item.expertApproval.approvedAt, null);
  assert.ok(['candidate_priority_1','candidate_priority_2','context_only','hold'].includes(item.status), item.id + ' has invalid candidate status');
  assert.ok(Array.isArray(item.blockers), item.id + ' must declare blockers explicitly');
}

const cohortA = registry.indicators.find((item) => item.id === 'P2-ECO-01A');
const cohortB = registry.indicators.find((item) => item.id === 'P2-ECO-01B');
assert.ok(cohortA && cohortB, 'sme_per_10k must be split into two exact-definition cohorts');
assert.notDeepEqual(cohortA.acceptedSourceNames, cohortB.acceptedSourceNames);
assert.notDeepEqual(
  cohortA.observedCoverage.map((row) => row.municipalityNames),
  cohortB.observedCoverage.map((row) => row.municipalityNames),
);
for (const item of [cohortA, cohortB]) {
  assert.equal(item.sourceIndicatorCodes.length, 1);
  assert.equal(item.sourceIndicatorCodes[0], 'sme_per_10k');
  assert.ok(item.observedCoverage.every((row) => row.municipalities === 3), 'each exact-name cohort covers only three municipalities');
}
assert.ok(!registry.indicators.some((item) => item.id === 'P2-ECO-01' && item.observedCoverage?.some((row) => row.municipalities === 6)),
  'the two three-municipality SME cohorts must never be represented as one six-municipality panel');

const holds = registry.indicators.filter((item) => item.status === 'hold');
assert.ok(holds.some((item) => item.id === 'HOLD-FIN-01'));
assert.ok(holds.some((item) => item.id === 'HOLD-FIN-02'));
assert.ok(registry.calculationRules.some((rule) => rule.includes('Не перенормировать веса')));
assert.ok(registry.calculationRules.some((rule) => rule.includes('не покрыто утверждённым индикатором')));

console.log('Candidate resilience registry v1.1 safety contract passed.');
