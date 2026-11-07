import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [entry, boundary, styles] = await Promise.all([
  readFile('src/main.jsx', 'utf8'),
  readFile('src/components/AppErrorBoundary.jsx', 'utf8'),
  readFile('src/index.css', 'utf8'),
]);

assert.match(entry, /import AppErrorBoundary from ['"]\.\/components\/AppErrorBoundary\.jsx['"]/);
assert.match(entry, /<AppErrorBoundary>\s*<App\s*\/>\s*<\/AppErrorBoundary>/);
assert.match(boundary, /class AppErrorBoundary extends React\.Component/);
assert.match(boundary, /static getDerivedStateFromError\(/);
assert.match(boundary, /componentDidCatch\(/);
assert.match(boundary, /role="alert"/);
assert.match(boundary, /onClick=\{this\.handleReload\}/);
assert.match(boundary, /window\.location\.reload\(\)/);
assert.match(styles, /\.app-error-shell\s*\{/);
assert.match(styles, /\.app-error-panel\s*\{/);
assert.match(styles, /background:\s*var\(--paper\)/);
assert.match(styles, /border-top:\s*4px solid var\(--ochre\)/);

console.log('App error boundary source contract: OK');
