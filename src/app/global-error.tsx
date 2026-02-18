'use client'

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ko">
      <body>
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ marginBottom: '1rem', fontSize: '3rem' }}>😵</div>
          <h2 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 600 }}>
            문제가 발생했어요
          </h2>
          <p style={{ marginBottom: '1rem', color: '#666', textAlign: 'center' }}>
            잠시 후 다시 시도해주세요.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: '#6366f1',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  )
}
