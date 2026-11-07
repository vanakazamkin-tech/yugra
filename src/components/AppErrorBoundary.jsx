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
    // Keep the failure visible to the host's runtime monitoring without
    // exposing internal stack traces or application data in the UI.
    console.error('Yugra18 application error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main
          role="alert"
          aria-live="assertive"
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            padding: '32px 20px',
            boxSizing: 'border-box',
            background: 'var(--color-background, #f5f3ef)',
            color: 'var(--color-text, #252525)',
            fontFamily: 'inherit',
          }}
        >
          <section
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '32px',
              border: '1px solid var(--color-border, #d8d2c8)',
              borderRadius: '16px',
              background: 'var(--color-surface, #ffffff)',
              boxShadow: '0 12px 36px rgba(28, 34, 38, 0.08)',
            }}
          >
            <p style={{ margin: '0 0 8px', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.65 }}>
              YUGRA18
            </p>
            <h1 style={{ margin: '0 0 12px', fontSize: '24px', lineHeight: 1.25 }}>
              Не удалось открыть раздел
            </h1>
            <p style={{ margin: '0 0 24px', lineHeight: 1.6, opacity: 0.8 }}>
              Произошла непредвиденная ошибка. Данные проекта не изменены.
              Попробуйте перезагрузить страницу.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                minHeight: '44px',
                padding: '10px 18px',
                border: 0,
                borderRadius: '8px',
                background: 'var(--color-accent, #315d57)',
                color: '#ffffff',
                font: 'inherit',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Перезагрузить страницу
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
