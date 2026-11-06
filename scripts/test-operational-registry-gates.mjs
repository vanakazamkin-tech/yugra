import assert from 'node:assert/strict';
import { validateOfficialOperationalRecords } from '../src/lib/officialData.js';

const validSite = {
  id: 'site-1', municipality_id: 'megion', name: 'Площадка 1',
  area_hectares: '12.5', source_url: 'https://example.org/site',
  verification_status: 'verified',
};
const validProgram = {
  id: 'program-1', municipality_id: 'megion', program_name: 'Доступная среда',
  report_date: '2026-07-01', revised_budget_thousand: '1000',
  executed_budget_thousand: '750', execution_percent: '75',
  source_url: 'https://example.org/program', verification_status: 'verified',
};
const validFacility = {
  id: 'school-1', municipality_id: 'megion', facility_category: 'school',
  name_short: 'Школа № 1', latitude: '61.03', longitude: '76.11',
  annual_attendance: '500', staffing_percent: '92',
  source_url: 'https://example.org/school', verification_status: 'verified',
};

const result = validateOfficialOperationalRecords({
  investmentSites: [
    validSite,
    { ...validSite, id: 'unverified', verification_status: 'needs_review' },
    { ...validSite, id: 'missing-source', source_url: null },
    { ...validSite, id: 'negative-area', area_hectares: -1 },
    { ...validSite, id: 'missing-territory', municipality_id: '' },
  ],
  programExecution: [
    validProgram,
    { ...validProgram, id: 'bad-date', report_date: '2026-02-30' },
    { ...validProgram, id: 'bad-rate', execution_percent: 101 },
    { ...validProgram, id: 'missing-budget', revised_budget_thousand: null, executed_budget_thousand: null },
    { ...validProgram, id: 'bad-source', source_url: 'javascript:alert(1)' },
  ],
  facilities: [
    validFacility,
    { ...validFacility, id: 'bad-coordinate', latitude: 91 },
    { ...validFacility, id: 'partial-coordinate', longitude: null },
    { ...validFacility, id: 'bad-staffing', staffing_percent: 120 },
    { ...validFacility, id: 'bad-category', facility_category: 'culture' },
  ],
});

assert.deepEqual(result.investmentSites.map((item) => item.id), ['site-1']);
assert.deepEqual(result.programExecution.map((item) => item.id), ['program-1']);
assert.deepEqual(result.facilities.map((item) => item.id), ['school-1']);
console.log('Operational registry validation gates passed.');
