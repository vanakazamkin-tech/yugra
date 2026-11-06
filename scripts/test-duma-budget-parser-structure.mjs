import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'yugra-duma-parser-'));
const headers = 'municipality;indicator_code;indicator_name;measure_type;year;value_raw;unit;page;table_title';
try {
  const cases = [
    { name: 'extra column', csv: `${headers}\nСургут;code;name;amount;2024;10;тыс. руб.;1;Table;unexpected\n` },
    { name: 'missing column', csv: `${headers}\nСургут;code;name;amount;2024;10;тыс. руб.;1\n` },
    { name: 'duplicate header', csv: 'municipality;municipality;indicator_name;measure_type;year;value_raw;unit;page;table_title\nСургут;Сургут;name;amount;2024;10;тыс. руб.;1;Table\n' },
    { name: 'quote inside unquoted field', csv: `${headers}\nСургут;co"de;name;amount;2024;10;тыс. руб.;1;Table\n` },
    { name: 'characters after closing quote', csv: `${headers}\nСургут;code;"name"x;amount;2024;10;тыс. руб.;1;Table\n` },
    { name: 'unclosed quoted field', csv: `${headers}\nСургут;code;"name;amount;2024;10;тыс. руб.;1;Table\n` },
  ];

  for (const testCase of cases) {
    const input = path.join(temp, `${testCase.name.replace(/\s+/g, '-')}.csv`);
    const output = path.join(temp, 'should-not-exist.json');
    await fs.writeFile(input, testCase.csv, 'utf8');
    const result = spawnSync(process.execPath, [
      'scripts/prepare-duma-budget-import.mjs', input, `--out=${output}`,
    ], { encoding: 'utf8' });
    assert.notEqual(result.status, 0, `${testCase.name} must fail`);
    assert.match(result.stderr, /CSV (contains duplicate column names|line \\d+ has|contains a quote inside an unquoted field|contains unexpected characters after a closing quote|contains an unclosed quoted field)/);
    await assert.rejects(fs.access(output));
  }
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}
console.log('Duma CSV structure validation checks passed');
