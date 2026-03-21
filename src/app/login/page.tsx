import LoginForm from '@/components/auth/LoginForm'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#fdf8f2',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      fontFamily: "'Cabinet Grotesk', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,300;1,400&display=swap');
        @import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,600,700&display=swap');
        @media (max-width: 768px) {
          .login-left { display: none !important; }
          .login-right { grid-column: 1 / -1 !important; }
        }
      `}</style>

      {/* ── Left: Brand panel ── */}
      <div
        className="login-left"
        style={{
          background: '#2a1f1a',
          padding: '56px 52px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle texture dots */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(196,168,130,0.06) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
        }} />

        {/* Glow accent */}
        <div style={{
          position: 'absolute', bottom: -80, right: -80,
          width: 360, height: 360,
          background: 'radial-gradient(circle, rgba(122,28,46,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Top: Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <p style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 20, fontWeight: 700,
              color: '#fdf8f2', margin: '0 0 6px',
              letterSpacing: '-0.01em',
            }}>
              The Kiasu Guide
            </p>
          </Link>
          <p style={{
            fontSize: 11, color: '#c4a882', margin: 0,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            Financial clarity for Singapore
          </p>
        </div>

        {/* Middle: Headline + quote */}
        <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 0' }}>
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 36, fontWeight: 400, lineHeight: 1.25,
            color: '#fdf8f2', margin: '0 0 32px',
            letterSpacing: '-0.02em',
          }}>
            Your financial picture,<br />
            <span style={{ fontStyle: 'italic', color: '#c4a882' }}>finally clear.</span>
          </p>

          <div style={{
            borderLeft: '2px solid rgba(196,168,130,0.3)',
            paddingLeft: 20,
          }}>
            <p style={{
              fontSize: 14, color: 'rgba(253,248,242,0.65)',
              margin: '0 0 10px', lineHeight: 1.75,
              fontFamily: "'Cabinet Grotesk', sans-serif",
            }}>
              "The goal isn't to be rich. It's to never have to worry about money again."
            </p>
            <p style={{ fontSize: 12, color: '#c4a882', margin: 0, fontWeight: 600 }}>
              — Your advisor
            </p>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 32, marginTop: 40 }}>
            {[
              { v: '9', l: 'financial tools' },
              { v: 'S$0', l: 'to get started' },
              { v: '15 min', l: 'full picture' },
            ].map(({ v, l }) => (
              <div key={v}>
                <p style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 22, fontStyle: 'italic',
                  color: '#c4a882', margin: '0 0 4px',
                }}>{v}</p>
                <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.4)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Disclaimer */}
        <p style={{
          position: 'relative', zIndex: 1,
          fontSize: 11, color: 'rgba(253,248,242,0.25)',
          margin: 0, lineHeight: 1.6,
          fontFamily: "'Cabinet Grotesk', sans-serif",
        }}>
          For illustration only · Not financial advice ·{' '}
          <span style={{ color: 'rgba(196,168,130,0.4)' }}>© 2026 The Kiasu Guide</span>
        </p>
      </div>

      {/* ── Right: Form panel ── */}
      <div
        className="login-right"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 40px',
          background: '#fdf8f2',
        }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Mobile-only logo */}
          <div style={{ textAlign: 'center', marginBottom: 32, display: 'none' }} className="mobile-logo">
            <Link href="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#2a1f1a', textDecoration: 'none' }}>
              The Kiasu Guide
            </Link>
          </div>

          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.15em',
              textTransform: 'uppercase', color: '#c4a882', margin: '0 0 10px',
            }}>
              Welcome back
            </p>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 30, fontWeight: 700,
              color: '#2a1f1a', margin: '0 0 8px',
              letterSpacing: '-0.02em',
            }}>
              Sign in to your account
            </h1>
            <p style={{ fontSize: 14, color: '#a89070', margin: 0 }}>
              Your financial dashboard is waiting.
            </p>
          </div>

          {/* Form card */}
          <div style={{
            background: '#fff',
            borderRadius: 18,
            border: '1px solid rgba(42,31,26,0.07)',
            padding: '36px',
            boxShadow: '0 4px 24px rgba(42,31,26,0.06)',
          }}>
            <LoginForm />
          </div>

          {/* Footer */}
          <div style={{
            marginTop: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <Link href="/" style={{
              fontSize: 13, color: '#a89070',
              textDecoration: 'none', fontFamily: "'Cabinet Grotesk', sans-serif",
            }}>
              ← Back to home
            </Link>
            <Link href="/register" style={{
              fontSize: 13, color: '#7a1c2e', fontWeight: 600,
              textDecoration: 'none', fontFamily: "'Cabinet Grotesk', sans-serif",
            }}>
              Create account →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
