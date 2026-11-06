import { readFileSync } from 'node:fs';

const municipalitiesPath = new URL('../data/municipalities-detailed.json', import.meta.url);
const geographyPath = new URL('../src/ugraMapGeo.js', import.meta.url);

const municipalitiesData = JSON.parse(readFileSync(municipalitiesPath, 'utf8'));
const municipalities = municipalitiesData.municipalities;
const geographySource = readFileSync(geographyPath, 'utf8');
const geographyIds = [...geographySource.matchAll(/"id":\s*"([^"]+)"/g)].map((match) => match[1]);

if (!Array.isArray(municipalities)) {
  throw new Error('data/municipalities-detailed.json must contain a municipalities array.');
}

const municipalityIds = municipalities.map((item) => item.id);
const duplicates = (ids) => ids.filter((id, index) => ids.indexOf(id) !== index);
const missingMunicipalities = geographyIds.filter((id) => !municipalityIds.includes(id));
const missingGeography = municipalityIds.filter((id) => !geographyIds.includes(id));
const duplicateGeographyIds = duplicates(geographyIds);
const duplicateMunicipalityIds = duplicates(municipalityIds);

const hasErrors = [
  missingMunicipalities,
  missingGeography,
  duplicateGeographyIds,
  duplicateMunicipalityIds,
].some((items) => items.length > 0);

if (hasErrors) {
  console.error('Map coverage check failed.');
  if (missingMunicipalities.length) console.error('Map regions without municipality records:', missingMunicipalities.join(', '));
  if (missingGeography.length) console.error('Municipalities without map geometry:', missingGeography.join(', '));
  if (duplicateGeographyIds.length) console.error('Duplicate map IDs:', duplicateGeographyIds.join(', '));
  if (duplicateMunicipalityIds.length) console.error('Duplicate municipality IDs:', duplicateMunicipalityIds.join(', '));
  process.exitCode = 1;
} else {
  console.log(`Map coverage check passed: ${municipalityIds.length} municipalities match ${geographyIds.length} unique map features.`);
}
