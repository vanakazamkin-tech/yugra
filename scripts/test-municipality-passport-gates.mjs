import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/InvestmentDetails.jsx', import.meta.url), 'utf8');
const passportStart = source.indexOf('const modalOfficialIndicators = useMemo');
const passportEnd = source.indexOf('const surgutPopulationTrend', passportStart);
assert.ok(passportStart >= 0 && passportEnd > passportStart, 'passport official indicator selector must exist');
const passport = source.slice(passportStart, passportEnd);
assert.match(passport, /item\.verification_status === 'verified'/);
assert.match(passport, /\['municipality', 'settlement', 'region'\]\.includes\(item\.geographic_level\)/);
assert.match(passport, /Number\.isInteger\(year\)/);
assert.match(passport, /numericValue\(item\.value\) != null/);
assert.match(passport, /String\(item\.indicator_code \|\| ''\)\.trim\(\) !== ''/);
assert.doesNotMatch(passport, /item\.geographic_level\s*\|\|\s*'municipality'/);

const populationStart = source.indexOf('const populationByMunicipality = useMemo');
const populationEnd = source.indexOf('const formatPopulationIndicator', populationStart);
assert.ok(populationStart >= 0 && populationEnd > populationStart, 'municipal population selector must exist');
const population = source.slice(populationStart, populationEnd);
assert.match(population, /item\.verification_status === 'verified'/);
assert.match(population, /item\.geographic_level === 'municipality'/);
assert.match(population, /\['population_municipality', 'population_municipality_history'\]/);
assert.doesNotMatch(population, /population_settlement/);
assert.doesNotMatch(population, /item\.geographic_level\s*\|\|\s*'municipality'/);
assert.match(source, /item\.source_url \? <a href=\{item\.source_url\}/);

const budgetStart = source.indexOf('const modalBudgetSnapshots = useMemo');
const budgetEnd = source.indexOf('const modalDataCoverage', budgetStart);
assert.ok(budgetStart >= 0 && budgetEnd > budgetStart, 'municipal budget selector must exist');
const budget = source.slice(budgetStart, budgetEnd);
assert.match(budget, /item\.verification_status === 'verified'/);
assert.match(budget, /item\.geographic_level === 'municipality'/);
assert.match(budget, /item\.unit === 'тыс\. руб\.'/);
assert.match(budget, /\['2024-Q3', '2025-Q3'\]/);
assert.match(budget, /duma_hmao_municipal_budget_9m_2025/);
assert.match(budget, /matches\.length === 1/);
assert.match(budget, /Math\.abs\(derivedTransfers - transferValue\) <= 0\.1/);
assert.doesNotMatch(budget, /geographic_level\s*\|\|\s*'municipality'/);
assert.doesNotMatch(budget, /reference_period\s*===\s*'annual'/);
assert.match(source, /Все суммы — накопительное исполнение за январь–сентябрь/);

console.log('Municipality passport data-integrity gates passed.');
