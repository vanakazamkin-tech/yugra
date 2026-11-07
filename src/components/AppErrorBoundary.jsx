import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Keep diagnostics in the browser console; never render stack traces to visitors.
    console.error('Yugra18 application error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error-shell" role="alert" aria-live="assertive">
          <div className="site-shell">
            <section className="panel app-error-panel">
              <div className="app-error-brand">
                <img src="/images/khanty-prosperity-seal.svg" alt="" />
                <span>
                  <strong>ЮГРА</strong>
                  <small>АНАЛИТИЧЕСКАЯ ПЛАТФОРМА</small>
                </span>
              </div>
              <p className="app-error-kicker">YUGRA18 · СИСТЕМНОЕ СООБЩЕНИЕ</p>
              <h1>Не удалось открыть раздел</h1>
              <p className="app-error-description">
                Произошла непредвиденная ошибка интерфейса. Перезагрузите страницу.
                Если ошибка повторяется, сообщите об этом администратору проекта.
              </p>
              <button type="button" className="primary-button" onClick={this.handleReload}>
                Перезагрузить страницу
              </button>
            </section>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
