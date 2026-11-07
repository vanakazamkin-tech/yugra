import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const file = 'supabase/imports/review/duma_budget_pages4_8_aggregate_controls.csv';
const text = await fs.readFile(file, 'utf8');
const lines = text.trim().split(/\r?\n/);
assert.equal(lines.length, 55, '27 aggregate controls × 2 years plus header');
assert.equal(lines[0], 'source_id;page;metric_code;metric_name;year;value_raw;unit;record_level;review_status');

const rows = lines.slice(1).map((line) => {
  const [source_id, page, metric_code, metric_name, year, value_raw, unit, record_level, review_status] = line.split(';');
  assert.ok(source_id && metric_code && metric_name && value_raw);
  assert.ok(['2023', '2024'].includes(year));
  assert.ok(['4', '5', '6', '7', '8'].includes(page));
  assert.equal(unit, 'тыс. руб.');
  assert.equal(record_level, 'regional_aggregate');
  assert.equal(review_status, 'needs_visual_review');
  assert.match(value_raw, /^-?\d+(?: \d{3})*,\d$/);
  return { page: Number(page), metric_code, year, value: Number(value_raw.replaceAll(' ', '').replace(',', '.')) };
});

assert.equal(new Set(rows.map((r) => `${r.metric_code}:${r.year}`)).size, 54);
const expected = {
  'other_expenses_non_additive_subtotal:2023': 62688872.0,
  'other_expenses_non_additive_subtotal:2024': 78916387.3,
  'education:2023': 100886482.2,
  'education:2024': 114891654.7,
  'budget_surplus_deficit:2023': 4302909.4,
  'budget_surplus_deficit:2024': 10480393.0,
  'deficit_financing_total:2023': -4302909.4,
  'deficit_financing_total:2024': -10480393.0,
  'municipal_debt_stock:2023': 5521635.6,
  'municipal_debt_stock:2024': 3909985.7,
};
for (const [key, value] of Object.entries(expected)) {
  const [metric_code, year] = key.split(':');
  const row = rows.find((r) => r.metric_code === metric_code && r.year === year);
  assert.ok(row, `Missing control ${key}`);
  assert.equal(row.value, value, `Wrong control value for ${key}`);
}
assert.ok(rows.every((r) => r.page >= 4 && r.page <= 8));

const valueOf = (metric_code, year) => {
  const row = rows.find((r) => r.metric_code === metric_code && r.year === String(year));
  assert.ok(row, `Missing ${metric_code} for ${year}`);
  return row.value;
};
for (const year of [2023, 2024]) {
  assert.equal(
    Math.round((valueOf('bank_loans_attracted', year) + valueOf('bank_loans_repaid', year)) * 10) / 10,
    valueOf('bank_loans_net', year),
    `Bank loan net flow must equal attraction plus signed repayment for ${year}`,
  );
  assert.equal(
    Math.round((valueOf('budget_loans_attracted', year) + valueOf('budget_loans_repaid', year)) * 10) / 10,
    valueOf('budget_loans_net', year),
    `Budget loan net flow must equal attraction plus signed repayment for ${year}`,
  );
  assert.equal(
    Math.round((valueOf('early_delivery_loans_attracted', year) + valueOf('early_delivery_loans_repaid', year)) * 10) / 10,
    valueOf('early_delivery_budget_loans_net', year),
    `Early-delivery loan net flow must equal attraction plus signed repayment for ${year}`,
  );
  const financingComponents = valueOf('bank_loans_net', year)
    + valueOf('budget_loans_net', year)
    + valueOf('early_delivery_budget_loans_net', year)
    + valueOf('other_internal_deficit_sources', year);
  assert.equal(
    Math.round(financingComponents * 10) / 10,
    valueOf('deficit_financing_total', year),
    `Deficit financing total must reconcile to net components for ${year}`,
  );
  assert.equal(
    valueOf('budget_surplus_deficit', year) + valueOf('deficit_financing_total', year),
    0,
    `Budget surplus/deficit must offset deficit financing total for ${year}`,
  );
}


const expenditureTotals = { 2023: 211708172.0, 2024: 231108858.7 };
for (const year of [2023, 2024]) {
  const detailSum = rows
    .filter((r) => r.year === String(year)
      && r.page >= 4 && r.page <= 6
      && r.metric_code !== 'other_expenses_non_additive_subtotal'
      && r.metric_code !== 'budget_surplus_deficit')
    .reduce((sum, r) => sum + r.value, 0);
  assert.equal(Math.round(detailSum * 10) / 10, expenditureTotals[year],
    `Page 4–6 detailed expenditure sections must reconcile to page 3 total for ${year}`);
  const nonAdditive = rows.find((r) => r.metric_code === 'other_expenses_non_additive_subtotal' && r.year === String(year));
  assert.ok(nonAdditive, `Missing non-additive “Иные расходы” control for ${year}`);
}

console.log('Duma annual budget pages 4–8 aggregate control fixture passed');
