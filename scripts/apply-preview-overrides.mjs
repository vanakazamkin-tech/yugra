import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';

const root = process.cwd();
const archivePath = path.join(root, '.preview', 'claude-stage1.2-core-files.json.gz.b64');
const encoded = (await readFile(archivePath, 'utf8')).trim();
const payload = JSON.parse(gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8'));
const expected = [
  'src/lib/riskModel.js',
  'src/lib/indicatorSeries.js',
  'src/components/UnifiedRiskForecast.jsx',
];

for (const relativePath of expected) {
  if (typeof payload[relativePath] !== 'string') {
    throw new Error(`Preview override is missing ${relativePath}`);
  }
}

for (const [relativePath, content] of Object.entries(payload)) {
  if (!expected.includes(relativePath) || path.isAbsolute(relativePath) || relativePath.split(/[\\/]/).includes('..')) {
    throw new Error(`Unexpected preview override path: ${relativePath}`);
  }
  const target = path.resolve(root, relativePath);
  if (!target.startsWith(root + path.sep)) {
    throw new Error(`Refusing to write outside project: ${relativePath}`);
  }
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, 'utf8');
}

console.log('Applied Claude stage 1.2 preview overrides:');
for (const relativePath of expected) console.log(`- ${relativePath}`);
