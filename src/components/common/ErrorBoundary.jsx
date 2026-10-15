import React from 'react';

/**
 * Catches rendering errors anywhere below it and shows a recoverable fallback
 * instead of a blank white screen. Also auto-recovers from stale-chunk errors
 * that happen after a new deploy (reloads once).
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info);
    // After a deploy, old lazy chunks 404. Reload once to pick up the new build.
    const message = String(error?.message || '');
    const isStaleChunk =
      /ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed/i.test(message) ||
      error?.name === 'ChunkLoadError';
    if (isStaleChunk) {
      try {
        const key = 'iea-chunk-reload';
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          window.location.reload();
        }
      } catch {
        // sessionStorage unavailable (private mode): fall through to the UI.
      }
    }
  }

  handleReload = () => {
    try { sessionStorage.removeItem('iea-chunk-reload'); } catch { /* ignore */ }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: 'var(--color-background, #faf9f5)',
          color: 'var(--color-text, #0b0b0b)',
          fontFamily: 'Outfit, Helvetica, Arial, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '440px',
            padding: '2rem',
            textAlign: 'center',
            background: 'var(--color-surface, #fff)',
            border: '1px solid var(--color-border, rgba(11,11,11,0.1))',
            borderRadius: 'var(--radius-lg, 14px)',
            boxShadow: 'var(--shadow-lg, 0 12px 34px rgba(0,0,0,0.08))',
          }}
        >
          <h1 style={{ fontSize: '1.35rem', margin: '0 0 0.5rem' }}>Algo salió mal</h1>
          <p style={{ color: 'var(--color-text-muted, #5c5850)', margin: '0 0 1.5rem', fontSize: '0.95rem' }}>
            Ocurrió un error inesperado. Podés recargar la página para continuar.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              width: '100%',
              padding: '0.85rem 1.5rem',
              border: '1px solid var(--color-primary, #0b0b0b)',
              borderRadius: 'var(--radius-md, 10px)',
              background: 'var(--color-primary, #0b0b0b)',
              color: 'var(--color-bg, #faf9f5)',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >
            Recargar
          </button>
          {this.state.error?.message && (
            <details style={{ marginTop: '1.25rem', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'var(--color-text-muted, #5c5850)' }}>
                Detalles técnicos
              </summary>
              <pre
                style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '0.72rem',
                  color: 'var(--color-text-muted, #5c5850)',
                  background: 'var(--color-bg, #faf9f5)',
                  borderRadius: 'var(--radius-sm, 6px)',
                }}
              >
                {String(this.state.error.message)}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
