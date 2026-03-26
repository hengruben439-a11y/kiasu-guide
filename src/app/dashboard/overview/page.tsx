import { createClient } from '@/lib/supabase/server'
import { ClientProfile } from '@/types'
import { formatSGD } from '@/lib/utils'
import Link from 'next/link'
import { buildPlanMetrics, SEVERITY_STYLES } from '@/lib/scoring'

export default async function OverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: benefits }, { data: liabilities }] = await Promise.all([
    supabase.from('client_profiles').select('*').eq('user_id', user!.id).single<ClientProfile>(),
    supabase.from('benefit_blocks').select('benefit_type, coverage, enabled').eq('user_id', user!.id),
    supabase.from('liabilities').select('monthly_payment, outstanding_balance').eq('user_id', user!.id),
  ])

  if (!profile) return null

  const m = buildPlanMetrics(profile, benefits, liabilities)
  const { income, expenses, savings, cpfTotal, surplus, savingsRate, emergencyMonths } = m
  const { priorities, wins, allGood } = m
  const hasFinancials = income > 0
  const name = profile.preferred_name ?? 'there'

  // Profile completeness
  const profileItems = [
    { label: 'Personal details', done: !!(profile.dob && profile.sex) },
    { label: 'Health information', done: !!(profile.height_cm && profile.weight_kg) },
    { label: 'PDPA consent', done: profile.pdpa_consent },
    { label: 'Income & expenses', done: income > 0 && expenses > 0 },
    { label: 'CPF balances', done: cpfTotal > 0 },
    { label: 'Retirement goals', done: profile.retirement_age > 0 && Number(profile.desired_monthly_income) > 0 },
    { label: 'Investment details', done: Number(profile.monthly_investment) > 0 },
  ]
  const completePct = Math.round((profileItems.filter(i => i.done).length / profileItems.length) * 100)

  const card = {
    background: 'rgba(122,28,46,0.06)',
    border: '1px solid rgba(196,168,130,0.15)',
    borderRadius: 14,
    backdropFilter: 'blur(12px)',
  } as const

  const eyebrow = {
    fontSize: 10, fontWeight: 700 as const, letterSpacing: '0.12em',
    textTransform: 'uppercase' as const, color: '#c4a882', margin: '0 0 10px',
    fontFamily: "'Cabinet Grotesk', sans-serif" as const,
  }

  return (
    <div style={{ padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 48px)', fontFamily: "'Cabinet Grotesk', sans-serif", maxWidth: 1100 }}>
      <style>{`
        .ov-gap-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
        .ov-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .ov-bottom { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .ov-tools { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        @media (max-width: 800px) { .ov-stats { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 480px) { .ov-stats { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 8px' }}>
          Financial Overview
        </p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: '#fdf8f2', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          {hasFinancials ? `${name}'s Plan Status` : 'Your Financial Snapshot'}
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(253,248,242,0.5)', margin: 0 }}>
          {hasFinancials
            ? allGood
              ? 'Your finances are in strong shape across all key areas.'
              : `${priorities.length} area${priorities.length !== 1 ? 's' : ''} need${priorities.length === 1 ? 's' : ''} your attention.`
            : 'Complete your Financial Profile to unlock your snapshot.'}
        </p>
      </div>

      {!hasFinancials ? (
        <div style={{ ...card, padding: '48px', textAlign: 'center' }}>
          <p style={{ fontSize: 16, color: 'rgba(253,248,242,0.5)', margin: '0 0 20px' }}>
            Complete your Financial Profile to unlock your snapshot.
          </p>
          <Link href="/dashboard/profile" style={{
            background: '#7a1c2e', color: '#fdf8f2',
            padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            textDecoration: 'none',
          }}>
            Go to Financial Profile →
          </Link>
        </div>
      ) : (
        <>
          {/* ── Priorities ──────────────────────────────────────────────── */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={eyebrow}>{allGood ? "What's Working" : 'Priorities'}</p>
              {!allGood && (
                <span style={{ fontSize: 11, color: 'rgba(253,248,242,0.3)' }}>Ranked by urgency</span>
              )}
            </div>

            {allGood ? (
              <div style={{
                ...card,
                padding: '22px 26px',
                background: 'rgba(22,163,74,0.06)',
                border: '1px solid rgba(22,163,74,0.2)',
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: 'rgba(22,163,74,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0, color: '#4ade80',
                }}>✓</div>
                <div>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: '#4ade80', margin: '0 0 4px' }}>
                    All systems green
                  </p>
                  <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.55)', margin: 0 }}>
                    Emergency fund, retirement trajectory, protection, and cash flow are all on track.
                  </p>
                </div>
              </div>
            ) : (
              <div className="ov-gap-grid">
                {priorities.map((gap, i) => {
                  const s = SEVERITY_STYLES[gap.severity]
                  return (
                    <div key={gap.id} style={{
                      background: s.bg,
                      border: `1px solid ${s.border}`,
                      borderLeft: `3px solid ${s.dot}`,
                      borderRadius: 14,
                      padding: i === 0 ? '22px 24px' : '18px 22px',
                      display: 'flex', flexDirection: 'column', gap: 10,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <p style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: i === 0 ? 16 : 15,
                          fontWeight: 700, color: '#fdf8f2', margin: 0,
                        }}>
                          {gap.title}
                        </p>
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                          textTransform: 'uppercase', padding: '3px 8px', borderRadius: 6,
                          background: s.badge, color: s.text, flexShrink: 0,
                        }}>
                          {gap.severity === 'critical' ? 'Critical' : 'Attention'}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.7)', margin: 0, lineHeight: 1.55 }}>
                        {gap.consequence}
                      </p>
                      {gap.fix && (
                        <p style={{ fontSize: 12, color: s.text, margin: 0, opacity: 0.85 }}>
                          {gap.fix}
                        </p>
                      )}
                      <Link href={gap.href} style={{
                        alignSelf: 'flex-start', fontSize: 12, fontWeight: 600,
                        color: s.text, textDecoration: 'none', marginTop: 2,
                      }}>
                        {gap.cta} →
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── What's working pills ─────────────────────────────────────── */}
          {!allGood && wins.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <p style={eyebrow}>{"What's Working"}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {wins.map(w => (
                  <div key={w.id} style={{
                    padding: '7px 14px', borderRadius: 20,
                    background: 'rgba(22,163,74,0.08)',
                    border: '1px solid rgba(22,163,74,0.2)',
                    fontSize: 12, fontWeight: 600, color: '#4ade80',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{ fontSize: 8 }}>●</span> {w.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Stats strip ──────────────────────────────────────────────── */}
          <div className="ov-stats" style={{ marginBottom: 22 }}>
            {[
              { label: 'Monthly Income', value: formatSGD(income), sub: 'Take-home pay' },
              { label: 'Monthly Surplus', value: formatSGD(surplus), sub: `${savingsRate.toFixed(0)}% savings rate`, accent: surplus < 0 },
              { label: 'Liquid Savings', value: formatSGD(savings), sub: `${emergencyMonths.toFixed(1)} mo emergency fund` },
              { label: 'CPF Balance', value: formatSGD(cpfTotal), sub: 'OA + SA + MA' },
            ].map(({ label, value, sub, accent }) => (
              <div key={label} style={{ ...card, padding: '14px 18px' }}>
                <p style={{ ...eyebrow, margin: '0 0 4px' }}>{label}</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: accent ? '#f87171' : '#fdf8f2', margin: '0 0 2px' }}>
                  {value}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.4)', margin: 0 }}>{sub}</p>
              </div>
            ))}
          </div>

          {/* ── Profile completeness + Tools ─────────────────────────────── */}
          <div className="ov-bottom">
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(196,168,130,0.1)', background: 'rgba(122,28,46,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: '#fdf8f2', margin: 0 }}>
                  Profile Completeness
                </h2>
                <span style={{ fontSize: 12, fontWeight: 700, color: completePct === 100 ? '#4ade80' : '#c4a882' }}>
                  {completePct}%
                </span>
              </div>
              <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                {profileItems.map(({ label, done }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: done ? '#fdf8f2' : 'rgba(253,248,242,0.4)' }}>{label}</span>
                    <span style={{ color: done ? '#4ade80' : '#c4a882', fontWeight: 600 }}>{done ? '✓' : '—'}</span>
                  </div>
                ))}
                <Link href="/dashboard/profile" style={{
                  display: 'block', textAlign: 'center',
                  padding: '9px 0', marginTop: 4, borderRadius: 8,
                  background: 'rgba(196,168,130,0.08)', border: '1px solid rgba(196,168,130,0.15)',
                  fontSize: 12, fontWeight: 600, color: '#c4a882', textDecoration: 'none',
                }}>
                  {completePct === 100 ? 'Edit Profile' : 'Complete Profile'} →
                </Link>
              </div>
            </div>

            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(196,168,130,0.1)', background: 'rgba(122,28,46,0.08)' }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: '#fdf8f2', margin: 0 }}>
                  Tools
                </h2>
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div className="ov-tools">
                  {[
                    { label: 'Retirement', href: '/dashboard/retirement', icon: '◈' },
                    { label: 'Stress Test', href: '/dashboard/stress-test', icon: '◇' },
                    { label: 'Cost of Waiting', href: '/dashboard/cost-of-waiting', icon: '△' },
                    { label: 'CPF Planning', href: '/dashboard/cpf', icon: '⬟' },
                    { label: 'Insurance', href: '/dashboard/insurance', icon: '◍' },
                    { label: 'Cash Flow', href: '/dashboard/cashflow', icon: '⊞' },
                    { label: 'BMI', href: '/dashboard/bmi', icon: '⊕' },
                    { label: 'LTC Gap', href: '/dashboard/ltc', icon: '⊗' },
                  ].map(({ label, href, icon }) => (
                    <Link key={href} href={href} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '9px 11px', borderRadius: 8,
                      background: 'rgba(196,168,130,0.06)', border: '1px solid rgba(196,168,130,0.12)',
                      textDecoration: 'none', fontSize: 12, fontWeight: 600, color: 'rgba(253,248,242,0.75)',
                    }}>
                      <span style={{ color: '#c4a882', fontSize: 11 }}>{icon}</span>
                      {label}
                    </Link>
                  ))}
                </div>
                <Link href="/dashboard/report" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '10px', marginTop: 8, borderRadius: 8,
                  background: '#7a1c2e', border: '1px solid #7a1c2e',
                  textDecoration: 'none', fontSize: 12, fontWeight: 700, color: '#fdf8f2',
                }}>
                  ↓ Download Financial Report
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
