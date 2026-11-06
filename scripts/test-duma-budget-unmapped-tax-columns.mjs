import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const input='supabase/imports/review/duma_budget_page1_unmapped_tax_columns.csv';
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'yugra-duma-unmapped-'));
try{
 const output=path.join(temp,'review.json');
 execFileSync(process.execPath,['scripts/prepare-duma-budget-import.mjs',input,`--out=${output}`],{stdio:'pipe'});
 const result=JSON.parse(await fs.readFile(output,'utf8'));
 assert.equal(result.input_rows,88);
 assert.equal(result.staged_rows,88);
 assert.equal(result.warning_count,88);
 assert.equal(result.records.filter(r=>r.indicator_code===null).length,88);
 assert.ok(result.records.every(r=>r.review_flags.includes('indicator_mapping_required')));
 assert.ok(result.records.every(r=>r.value!==null));
 assert.equal(result.coverage_by_year['2023'].municipality_count,22);
 assert.equal(result.coverage_by_year['2024'].municipality_count,22);
 assert.equal(Object.keys(result.coverage_by_indicator_year).length,0,'unmapped rows must not masquerade as mapped indicator coverage');
} finally { await fs.rm(temp,{recursive:true,force:true}); }
console.log('Duma unmapped tax-column review checks passed');
