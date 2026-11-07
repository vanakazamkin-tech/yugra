import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import AppErrorBoundary from '../src/components/AppErrorBoundary.jsx';

class ThrowingChild extends React.Component {
  render() {
    throw new Error('intentional error-boundary test');
  }
}

let reloadCount = 0;
const previousWindow = globalThis.window;
const previousConsoleError = console.error;

globalThis.window = {
  location: {
    reload() {
      reloadCount += 1;
    },
  },
};

// React correctly reports the intentionally thrown child error to the console.
// Silence that expected diagnostic so the test output remains actionable.
console.error = () => {};

let renderer;
try {
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
}
