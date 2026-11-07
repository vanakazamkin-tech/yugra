import assert from 'node:assert/strict';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { transformWithEsbuild } from 'vite';

const componentPath = new URL('../src/components/AppErrorBoundary.jsx', import.meta.url);
const temporaryModulePath = new URL('../.app-error-boundary-runtime-test.mjs', import.meta.url);
const source = await readFile(componentPath, 'utf8');
const transformed = await transformWithEsbuild(source, componentPath.pathname, {
  loader: 'jsx',
  format: 'esm',
});
await writeFile(temporaryModulePath, transformed.code, 'utf8');

class ThrowingChild extends React.Component {
  render() {
    throw new Error('intentional error-boundary test');
  }
}

let reloadCount = 0;
const previousWindow = globalThis.window;
const previousConsoleError = console.error;
let renderer;

try {
  const { default: AppErrorBoundary } = await import(
    `${pathToFileURL(temporaryModulePath.pathname).href}?test=${Date.now()}`
  );

  globalThis.window = {
    location: {
      reload() {
        reloadCount += 1;
      },
    },
  };

  // React reports the intentionally thrown child error to the console.
  console.error = () => {};

  act(() => {
    renderer = TestRenderer.create(
      React.createElement(
        AppErrorBoundary,
        null,
        React.createElement(ThrowingChild),
      ),
    );
  });

  const alert = renderer.root.findByType('main');
  assert.equal(alert.props.role, 'alert');
  assert.equal(alert.props['aria-live'], 'assertive');
  assert.match(renderer.root.findByType('h1').children.join(''), /Не удалось открыть раздел/);
  assert.match(
    renderer.root.findAllByType('p')[1].children.join(''),
    /непредвиденная ошибка интерфейса/i,
  );
  assert.equal(renderer.root.findAllByType(ThrowingChild).length, 0);

  const reloadButton = renderer.root.findByType('button');
  assert.match(reloadButton.children.join(''), /Перезагрузить страницу/);
  act(() => reloadButton.props.onClick());
  assert.equal(reloadCount, 1);

  console.log('AppErrorBoundary runtime behavior: OK');
} finally {
  if (renderer) {
    act(() => renderer.unmount());
  }
  console.error = previousConsoleError;
  if (previousWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = previousWindow;
  }
  await unlink(temporaryModulePath).catch(() => {});
}
