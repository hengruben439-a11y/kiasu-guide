import { createClient } from '@/lib/supabase/server'
import { ClientProfile } from '@/types'
import { formatSGD } from '@/lib/utils'
import Link from 'next/link'

export default async function OverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('user_id', user!.id)
    .single<ClientProfile>()

  if (!profile) return null

  const income = Number(profile.monthly_income)
  const expenses = Number(profile.monthly_expenses)
  const savings = Number(profile.liquid_savings)
  const cpfTotal = Number(profile.cpf_oa) + Number(profile.cpf_sa) + Number(profile.cpf_ma)
  const surplus = income - expenses
  const savingsRate = income > 0 ? (surplus / income) * 100 : 0
  const emergencyMonths = expenses > 0 ? savings / expenses : 0
  const age = profile.dob
    ? Math.floor((Date.now() - new Date(profile.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null
  const yearsToRetirement = age ? profile.retirement_age - age : null
  const hasFinancials = income > 0

  // Retirement progress estimate
  const r = (Number(profile.target_return_rate) || 0.06) / 12
  const n = yearsToRetirement ? yearsToRetirement * 12 : 0
  const fvSavings = savings * Math.pow(1 + r, n)
  const fvMonthly = r > 0 && n > 0
    ? Number(profile.monthly_investment) * (Math.pow(1 + r, n) - 1) / r
    : 0
  const projected = fvSavings + fvMonthly + cpfTotal * Math.pow(1 + r, n)
  const dividendYield = Number(profile.dividend_yield) || 0.04
  const inflation = Number(profile.inflation_rate) || 0.03
  const inflationAdj = Number(profile.desired_monthly_income) * Math.pow(1 + inflation, yearsToRetirement ?? 0)
  const required = inflationAdj > 0 && dividendYield > 0 ? (inflationAdj * 12) / dividendYield : 0
  const retirementPct = required > 0 ? Math.min(100, (projected / required) * 100) : 0

  // Protection score (simplified)
  const annualIncome = income * 12
  // ... pulled from benefit_blocks would be more accurate; approximate here
  const protectionScore = hasFinancials ? Math.min(100, Math.round(
    (savings >= expenses * 6 ? 20 : (savings / (expenses * 6)) * 20) +
    (savingsRate >= 20 ? 20 : (savingsRate / 20) * 20) +
    (retirementPct >= 80 ? 30 : (retirementPct / 80) * 30) +
    (cpfTotal > 0 ? 15 : 0) +
    (profile.pdpa_consent ? 15 : 0)
  )) : 0

  const scoreColour = protectionScore >= 80 ? '#16a34a'
    : protectionScore >= 60 ? '#2563eb'
    : protectionScore >= 40 ? '#d97706'
    : '#dc2626'
  const scoreLabel = protectionScore >= 80 ? 'Strong' : protectionScore >= 60 ? 'Good' : protectionScore >= 40 ? 'Fair' : 'Needs Work'

  const card = {
    background: '#fff',
    border: '1px solid rgba(42,31,26,0.07)',
    borderRadius: 14,
    boxShadow: '0 2px 8px rgba(42,31,26,0.04)',
  }

  const sectionHead = {
    fontFamily: "'Playfair Display', serif" as const,
    fontSize: 15, fontWeight: 700 as const, color: '#2a1f1a', margin: 0,
  }

  const eyebrow = {
    fontSize: 10, fontWeight: 700 as const, letterSpacing: '0.12em',
    textTransform: 'uppercase' as const, color: '#c4a882', margin: '0 0 5px',
    fontFamily: "'Cabinet Grotesk', sans-serif" as const,
  }

  return (
    <div style={{ padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 48px)', fontFamily: "'Cabinet Grotesk', sans-serif", maxWidth: 1100 }}>
      <style>{`
        @media (max-width: 540px) {
          .overview-score-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 8px' }}>
          Financial Overview
        </p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: '#2a1f1a', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Your Financial Snapshot
        </h1>
        <p style={{ fontSize: 14, color: '#a89070', margin: 0 }}>
          A complete picture of where you stand across every dimension of your plan.
        </p>
      </div>

      {!hasFinancials ? (
        <div style={{ ...card, padding: '48px', textAlign: 'center' }}>
          <p style={{ fontSize: 16, color: '#a89070', margin: '0 0 20px' }}>
            Complete your Financial Profile to unlock your snapshot.
          </p>
          <Link href="/dashboard/profile" style={{
            background: '#7a1c2e', color: '#fdf8f2',
            padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            textDecoration: 'none', fontFamily: "'Cabinet Grotesk', sans-serif",
          }}>
            Go to Financial Profile →
          </Link>
        </div>
      ) : (
        <>
          {/* Health Score + Key Stats */}
          <div className="overview-score-grid" style={{ marginBottom: 20 }}>

            {/* Score ring */}
            <div style={{ ...card, padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <p style={eyebrow}>Financial Health</p>
              <svg width={120} height={120} style={{ margin: '8px 0' }}>
                <circle cx={60} cy={60} r={50} fill="none" stroke="rgba(42,31,26,0.07)" strokeWidth={10} />
                <circle
                  cx={60} cy={60} r={50}
                  fill="none"
                  stroke={scoreColour}
                  strokeWidth={10}
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - protectionScore / 100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
                <text x={60} y={55} textAnchor="middle" fontFamily="'Playfair Display', serif" fontSize={26} fontWeight={700} fill={scoreColour}>{protectionScore}</text>
                <text x={60} y={72} textAnchor="middle" fontFamily="'Cabinet Grotesk', sans-serif" fontSize={10} fill="#a89070">/100</text>
              </svg>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: scoreColour, margin: 0 }}>{scoreLabel}</p>
            </div>

            {/* 4 key stats */}
            <div className="grid-2col" style={{ gridTemplateRows: '1fr 1fr', gap: 14 }}>
              {[
                { label: 'Monthly Income', value: formatSGD(income), sub: 'Take-home pay' },
                { label: 'Monthly Surplus', value: formatSGD(surplus), sub: `${savingsRate.toFixed(0)}% savings rate`, accent: surplus >= 0 ? undefined : '#dc2626' },
                { label: 'Liquid Savings', value: formatSGD(savings), sub: `${emergencyMonths.toFixed(1)} months emergency fund` },
                { label: 'CPF Balance', value: formatSGD(cpfTotal), sub: 'OA + SA + MA combined' },
              ].map(({ label, value, sub, accent }) => (
                <div key={label} style={{ ...card, padding: '18px 20px' }}>
                  <p style={eyebrow}>{label}</p>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: accent ?? '#2a1f1a', margin: '0 0 4px' }}>{value}</p>
                  <p style={{ fontSize: 11, color: '#a89070', margin: 0 }}>{sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Progress bars row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>

            {/* Retirement progress */}
            <div style={{ ...card, padding: '20px 22px' }}>
              <p style={eyebrow}>Retirement Progress</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#2a1f1a', margin: '0 0 12px' }}>
                {retirementPct.toFixed(0)}%
                <span style={{ fontSize: 12, color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif", marginLeft: 6 }}>of corpus target</span>
              </p>
              <div style={{ height: 8, background: 'rgba(42,31,26,0.07)', borderRadius: 4 }}>
                <div style={{
                  height: 8, borderRadius: 4,
                  background: retirementPct >= 80 ? '#16a34a' : retirementPct >= 50 ? '#d97706' : '#dc2626',
                  width: `${Math.min(100, retirementPct)}%`,
                  transition: 'width 0.8s ease',
                }} />
              </div>
              <p style={{ fontSize: 11, color: '#a89070', margin: '8px 0 0' }}>
                Target age {profile.retirement_age}
                {yearsToRetirement !== null && ` · ${yearsToRetirement} years away`}
              </p>
            </div>

            {/* Emergency fund */}
            <div style={{ ...card, padding: '20px 22px' }}>
              <p style={eyebrow}>Emergency Fund</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#2a1f1a', margin: '0 0 12px' }}>
                {emergencyMonths.toFixed(1)} mo
                <span style={{ fontSize: 12, color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif", marginLeft: 6 }}>of {formatSGD(expenses)}/mo</span>
              </p>
              <div style={{ height: 8, background: 'rgba(42,31,26,0.07)', borderRadius: 4 }}>
                <div style={{
                  height: 8, borderRadius: 4,
                  background: emergencyMonths >= 6 ? '#16a34a' : emergencyMonths >= 3 ? '#d97706' : '#dc2626',
                  width: `${Math.min(100, (emergencyMonths / 6) * 100)}%`,
                  transition: 'width 0.8s ease',
                }} />
              </div>
              <p style={{ fontSize: 11, color: '#a89070', margin: '8px 0 0' }}>
                Target: 6 months · {emergencyMonths >= 6 ? '✓ Met' : `${(6 - emergencyMonths).toFixed(1)} months short`}
              </p>
            </div>

            {/* Savings rate */}
            <div style={{ ...card, padding: '20px 22px' }}>
              <p style={eyebrow}>Savings Rate</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#2a1f1a', margin: '0 0 12px' }}>
                {savingsRate.toFixed(0)}%
                <span style={{ fontSize: 12, color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif", marginLeft: 6 }}>of take-home</span>
              </p>
              <div style={{ height: 8, background: 'rgba(42,31,26,0.07)', borderRadius: 4 }}>
                <div style={{
                  height: 8, borderRadius: 4,
                  background: savingsRate >= 20 ? '#16a34a' : savingsRate >= 10 ? '#d97706' : '#dc2626',
                  width: `${Math.min(100, Math.max(0, savingsRate))}%`,
                  transition: 'width 0.8s ease',
                }} />
              </div>
              <p style={{ fontSize: 11, color: '#a89070', margin: '8px 0 0' }}>
                Target: 20% · {savingsRate >= 20 ? '✓ Met' : `${(20 - savingsRate).toFixed(0)}% below target`}
              </p>
            </div>
          </div>

          {/* Profile completeness + quick links */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>

            {/* Profile completeness */}
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(42,31,26,0.06)', background: '#fdf8f2' }}>
                <h2 style={sectionHead}>Profile Completeness</h2>
              </div>
              <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Personal details', done: !!(profile.dob && profile.sex) },
                  { label: 'Health information', done: !!(profile.height_cm && profile.weight_kg) },
                  { label: 'PDPA consent', done: profile.pdpa_consent },
                  { label: 'Income & expenses', done: income > 0 && expenses > 0 },
                  { label: 'CPF balances', done: cpfTotal > 0 },
                  { label: 'Retirement goals', done: profile.retirement_age > 0 && Number(profile.desired_monthly_income) > 0 },
                  { label: 'Investment details', done: Number(profile.monthly_investment) > 0 },
                ].map(({ label, done }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#2a1f1a' }}>{label}</span>
                    <span style={{ color: done ? '#16a34a' : '#c4a882', fontWeight: 600 }}>{done ? '✓' : '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick links to tools */}
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(42,31,26,0.06)', background: '#fdf8f2' }}>
                <h2 style={sectionHead}>Jump to a Tool</h2>
              </div>
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
                    padding: '10px 12px', borderRadius: 9,
                    background: '#fdf8f2', border: '1px solid rgba(42,31,26,0.07)',
                    textDecoration: 'none',
                    fontFamily: "'Cabinet Grotesk', sans-serif",
                    fontSize: 12, fontWeight: 600, color: '#2a1f1a',
                    transition: 'border-color 0.15s',
                  }}>
                    <span style={{ color: '#c4a882', fontSize: 12 }}>{icon}</span>
                    {label}
                  </Link>
                ))}

                {/* Download Report — full-width */}
                <Link href="/dashboard/report" style={{
                  gridColumn: '1 / -1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '11px 12px', borderRadius: 9,
                  background: '#7a1c2e', border: '1px solid #7a1c2e',
                  textDecoration: 'none',
                  fontFamily: "'Cabinet Grotesk', sans-serif",
                  fontSize: 12, fontWeight: 700, color: '#fdf8f2',
                }}>
                  <span style={{ fontSize: 13 }}>↓</span>
                  Download Financial Report
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
