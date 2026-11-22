import assert from 'node:assert/strict';
import { mergeOfficialDataSnapshots } from '../src/lib/officialData.js';

const previous = {
  investmentProjects: [{
    id: 'project-1',
    municipality_id: '1',
    project_name: 'Реконструкция школы',
    investment_amount_million: 125,
    source_id: 'source-1',
    source_url: 'https://example.test/source',
    verification_status: 'verified',
    updated_at: '2026-11-01T10:00:00.000Z',
    notes: 'Проверенная запись с заполненными значениями',
  }],
  facilities: [{
    id: 'facility-1',
    municipality_id: '1',
    name_short: 'Школа № 1',
    facility_category: 'school',
    verification_status: 'verified',
    source_id: 'source-1',
    updated_at: '2026-11-01T10:00:00.000Z',
  }],
};

const updates = {
  investmentProjects: [{
    id: 'project-1',
    municipality_id: '1',
    project_name: '',
    investment_amount_million: null,
    source_id: 'source-1',
    source_url: '',
    verification_status: 'verified',
    updated_at: '2026-11-22T10:00:00.000Z',
    notes: 'Появилось новое примечание',
  }],
  facilities: [{
    id: 'facility-1',
    municipality_id: '1',
    name_short: null,
    facility_category: 'school',
    verification_status: 'verified',
    source_id: 'source-1',
    updated_at: '2026-11-22T10:00:00.000Z',
  }],
};

const merged = mergeOfficialDataSnapshots(previous, updates);
const project = merged.investmentProjects[0];
const facility = merged.facilities[0];

assert.equal(project.project_name, 'Реконструкция школы');
assert.equal(project.investment_amount_million, 125);
assert.equal(project.source_url, 'https://example.test/source');
assert.equal(project.notes, 'Появилось новое примечание');
assert.equal(project.verification_status, 'verified');

assert.equal(facility.name_short, 'Школа № 1');
assert.equal(facility.facility_category, 'school');
assert.equal(facility.verification_status, 'verified');

assert.equal(merged.investmentProjects.length, 1);
assert.equal(merged.facilities.length, 1);

console.log('Incremental snapshot merge preserves populated values and verification statuses.');
