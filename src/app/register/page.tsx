import RegisterForm from '@/components/auth/RegisterForm'
import Link from 'next/link'

export default function RegisterPage() {
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
          .register-left { display: none !important; }
          .register-right { grid-column: 1 / -1 !important; }
        }
      `}</style>

      {/* ── Left: Brand panel ── */}
      <div
        className="register-left"
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
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(196,168,130,0.06) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: -80, left: -80,
          width: 360, height: 360,
          background: 'radial-gradient(circle, rgba(122,28,46,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
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
            letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600,
          }}>
            Financial clarity for Singapore
          </p>
        </div>

        {/* Middle: What you get */}
        <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 0' }}>
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 30, fontWeight: 400, lineHeight: 1.3,
            color: '#fdf8f2', margin: '0 0 36px',
            letterSpacing: '-0.02em',
          }}>
            Everything your financial life needs.<br />
            <span style={{ fontStyle: 'italic', color: '#c4a882' }}>In one place.</span>
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              ['Retirement gap analysis', 'See exactly how far you are — and what closes it.'],
              ['Protection coverage map', 'Know which risks you\'re exposed to, right now.'],
              ['Financial Health Score', 'A single number that captures your full picture.'],
              ['AI advisor insights', 'Personalised analysis after every tool.'],
            ].map(([title, desc]) => (
              <div key={title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(196,168,130,0.15)',
                  border: '1px solid rgba(196,168,130,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: 1,
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#c4a882' }} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#fdf8f2', margin: '0 0 2px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>{title}</p>
                  <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.45)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif", lineHeight: 1.5 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p style={{
          position: 'relative', zIndex: 1,
          fontSize: 11, color: 'rgba(253,248,242,0.25)',
          margin: 0, lineHeight: 1.6, fontFamily: "'Cabinet Grotesk', sans-serif",
        }}>
          Free to use · No card required · © 2026 The Kiasu Guide
        </p>
      </div>

      {/* ── Right: Form panel ── */}
      <div
        className="register-right"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 40px',
          background: '#fdf8f2',
        }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: 36 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.15em',
              textTransform: 'uppercase', color: '#c4a882', margin: '0 0 10px',
            }}>
              Get started
            </p>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 30, fontWeight: 700,
              color: '#2a1f1a', margin: '0 0 8px',
              letterSpacing: '-0.02em',
            }}>
              Create your account
            </h1>
            <p style={{ fontSize: 14, color: '#a89070', margin: 0 }}>
              Free forever. Your data stays private.
            </p>
          </div>

          <div style={{
            background: '#fff',
            borderRadius: 18,
            border: '1px solid rgba(42,31,26,0.07)',
            padding: '36px',
            boxShadow: '0 4px 24px rgba(42,31,26,0.06)',
          }}>
            <RegisterForm />
          </div>

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
            <Link href="/login" style={{
              fontSize: 13, color: '#7a1c2e', fontWeight: 600,
              textDecoration: 'none', fontFamily: "'Cabinet Grotesk', sans-serif",
            }}>
              Already have an account →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
