'use client'

import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: ErrorProps) {
  const message = error.message || 'An unexpected error occurred. Please try again.'

  return (
    <div style={{
      padding: '40px 48px',
      fontFamily: "'Cabinet Grotesk', sans-serif",
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff',
        border: '1px solid rgba(42,31,26,0.08)',
        borderRadius: 16,
        padding: '48px 56px',
        maxWidth: 480,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 4px 24px rgba(42,31,26,0.06)',
      }}>
        {/* Icon area */}
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(196,168,130,0.15)',
          margin: '0 auto 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
        }}>
          ⚠
        </div>

        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 22,
          fontWeight: 700,
          color: '#fdf8f2',
          margin: '0 0 12px',
          letterSpacing: '-0.01em',
        }}>
          Something went wrong
        </h1>

        <p style={{
          fontSize: 14,
          color: 'rgba(253,248,242,0.5)',
          lineHeight: 1.6,
          margin: '0 0 32px',
        }}>
          {message}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={reset}
            style={{
              background: '#7a1c2e',
              color: '#fdf8f2',
              border: 'none',
              borderRadius: 10,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "'Cabinet Grotesk', sans-serif",
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Try again
          </button>

          <Link
            href="/login"
            style={{
              display: 'block',
              fontSize: 13,
              color: 'rgba(253,248,242,0.5)',
              textDecoration: 'none',
              padding: '10px 0',
            }}
          >
            Go to login
          </Link>
        </div>
      </div>
    </div>
  )
}
