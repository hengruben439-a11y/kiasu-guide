import { createClient } from '@/lib/supabase/server'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ClientProfile } from '@/types'
import { formatSGD } from '@/lib/utils'
import ReportPrintButton from '@/components/report/ReportPrintButton'
import SessionSummary from '@/components/tools/SessionSummary'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BenefitBlock {
  user_id: string
  benefit_type: string
  coverage: number
  enabled: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dimColor(score: number, max: number): string {
  const pct = max > 0 ? score / max : 0
  return pct >= 0.8 ? '#16a34a' : pct >= 0.5 ? '#d97706' : '#dc2626'
}

function scoreLabel(total: number): string {
  if (total >= 86) return 'Strong'
  if (total >= 66) return 'On Track'
  if (total >= 41) return 'Building'
  return 'Needs Attention'
}

function scoreAccent(total: number): string {
  if (total >= 86) return '#b59b5c'
  if (total >= 66) return '#2563eb'
  if (total >= 41) return '#d97706'
  return '#dc2626'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('user_id', user!.id)
    .single<ClientProfile>()

  const { data: benefits } = await supabase
    .from('benefit_blocks')
    .select('user_id, benefit_type, coverage, enabled')
    .eq('user_id', user!.id)

  if (!profile) return null

  // ── Core numerics ──────────────────────────────────────────────────────────
  const income      = Number(profile.monthly_income)
  const expenses    = Number(profile.monthly_expenses)
  const savings     = Number(profile.liquid_savings)
  const cpfOa       = Number(profile.cpf_oa)
  const cpfSa       = Number(profile.cpf_sa)
  const cpfMa       = Number(profile.cpf_ma)
  const cpfTotal    = cpfOa + cpfSa + cpfMa
  const monthlyInv  = Number(profile.monthly_investment)
  const retAge      = Number(profile.retirement_age) || 65
  const divYield    = Number(profile.dividend_yield) || 0.04
  const inflation   = Number(profile.inflation_rate) || 0.03
  const returnRate  = Number(profile.target_return_rate) || 0.06
  const desiredInc  = Number(profile.desired_monthly_income) || 5000

  // ── Derived ───────────────────────────────────────────────────────────────
  const currentAge = profile.dob
    ? Math.floor((Date.now() - new Date(profile.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 35
  const yearsToRetirement = Math.max(0, retAge - currentAge)

  const surplus         = income - expenses
  const savingsRate     = income > 0 ? (surplus / income) * 100 : 0
  const emergencyMonths = expenses > 0 ? savings / expenses : 0

  // ── Retirement projection ─────────────────────────────────────────────────
  const r = returnRate / 12
  const n = yearsToRetirement * 12
  const fvSavings   = savings * Math.pow(1 + r, n)
  const fvMonthly   = r > 0 && n > 0
    ? monthlyInv * (Math.pow(1 + r, n) - 1) / r
    : monthlyInv * n
  const projected   = fvSavings + fvMonthly + cpfTotal * Math.pow(1 + r, n)
  const inflationAdj = desiredInc * Math.pow(1 + inflation, yearsToRetirement)
  const required     = inflationAdj > 0 && divYield > 0
    ? (inflationAdj * 12) / divYield
    : inflationAdj * 240
  const gap          = projected - required
  const retirementPct = required > 0 ? Math.min(100, (projected / required) * 100) : 0

  // ── Protection ────────────────────────────────────────────────────────────
  const enabledBenefits: BenefitBlock[] = (benefits ?? []).filter((b) => b.enabled)
  const totalCoverage = enabledBenefits.reduce((s, b) => s + Number(b.coverage ?? 0), 0)
  const numPolicies   = enabledBenefits.length
  const annualIncome  = income * 12
  const coverageMultiple = annualIncome > 0 ? totalCoverage / annualIncome : 0

  // ── Financial health score ────────────────────────────────────────────────
  const dimProtection  = annualIncome > 0 ? Math.min(totalCoverage / (annualIncome * 10), 1) * 30 : 0
  const dimRetirement  = required > 0 ? Math.min(projected / required, 1) * 25 : 0
  const dimLiquidity   = expenses > 0 ? Math.min(savings / (expenses * 6), 1) * 20 : 0
  const dimDebt        = income > expenses ? 15 : 0
  const dimInvestment  = income > 0 ? Math.min(monthlyInv / (income * 0.2), 1) * 10 : 0
  const healthScore    = Math.round(dimProtection + dimRetirement + dimLiquidity + dimDebt + dimInvestment)

  const accent   = scoreAccent(healthScore)
  const label    = scoreLabel(healthScore)

  const dimensions = [
    { name: 'Protection',       score: Math.round(dimProtection), max: 30 },
    { name: 'Retirement',       score: Math.round(dimRetirement), max: 25 },
    { name: 'Liquidity',        score: Math.round(dimLiquidity),  max: 20 },
    { name: 'Debt Management',  score: dimDebt,                   max: 15 },
    { name: 'Investment',       score: Math.round(dimInvestment), max: 10 },
  ]

  // ── Report date ───────────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString('en-SG', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  // ── Style constants ───────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: '#fff',
    border: '1px solid rgba(42,31,26,0.10)',
    borderRadius: 12,
    padding: '20px 24px',
  }

  const eyebrow: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: '#c4a882',
    margin: '0 0 6px',
    fontFamily: "'Cabinet Grotesk', sans-serif",
  }

  const bigNum: React.CSSProperties = {
    fontFamily: "'Playfair Display', serif",
    fontSize: 26,
    fontWeight: 700,
    color: '#2a1f1a',
    margin: '0 0 3px',
  }

  const sub: React.CSSProperties = {
    fontSize: 11,
    color: '#a89070',
    margin: 0,
    fontFamily: "'Cabinet Grotesk', sans-serif",
  }

  const sectionTitle: React.CSSProperties = {
    fontFamily: "'Playfair Display', serif",
    fontSize: 14,
    fontWeight: 700,
    color: '#7a1c2e',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    margin: '0 0 14px',
    paddingBottom: 8,
    borderBottom: '1px solid rgba(122,28,46,0.18)',
  }

  return (
    <PageWrapper>
        <>
      {/* Print CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          #report-root { padding: 0 !important; max-width: none !important; }
        }
      `}</style>

      {/* Floating controls */}
      <ReportPrintButton />

      {/* Report root */}
      <div
        id="report-root"
        style={{
          background: '#fdf8f2',
          minHeight: '100vh',
          padding: '48px 56px',
          maxWidth: 820,
          margin: '0 auto',
          fontFamily: "'Cabinet Grotesk', sans-serif",
          color: '#2a1f1a',
          boxSizing: 'border-box',
        }}
      >

        {/* ── Report Header ────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 32,
          paddingBottom: 20,
          borderBottom: '2px solid #7a1c2e',
        }}>
          {/* Logo / brand left */}
          <div>
            <p style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 22,
              fontWeight: 700,
              color: '#7a1c2e',
              margin: 0,
              letterSpacing: '-0.01em',
            }}>
              The Kiasu Guide
            </p>
            <p style={{ fontSize: 11, color: '#a89070', margin: '3px 0 0', letterSpacing: '0.06em' }}>
              Financial Advisory Platform
            </p>
          </div>

          {/* Title + date right */}
          <div style={{ textAlign: 'right' }}>
            <p style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 18,
              fontWeight: 700,
              color: '#2a1f1a',
              margin: 0,
            }}>
              Financial Report
            </p>
            <p style={{ fontSize: 11, color: '#a89070', margin: '4px 0 0' }}>{today}</p>
          </div>
        </div>

        {/* ── Client intro ─────────────────────────────────────────────────── */}
        <div style={{
          background: '#fff',
          border: '1px solid rgba(42,31,26,0.10)',
          borderRadius: 12,
          padding: '16px 24px',
          marginBottom: 28,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 5px' }}>
              Prepared for
            </p>
            <p style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 20,
              fontWeight: 700,
              color: '#2a1f1a',
              margin: 0,
            }}>
              {profile.preferred_name ?? user!.email?.split('@')[0] ?? 'Client'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: '#a89070', margin: 0 }}>Generated on {today}</p>
            {profile.dob && (
              <p style={{ fontSize: 11, color: '#a89070', margin: '3px 0 0' }}>
                Age {currentAge} · Retirement target age {retAge}
              </p>
            )}
          </div>
        </div>

        {/* ── Section 1: Financial Health Score ────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <p style={sectionTitle}>1 — Financial Health Score</p>

          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16 }}>

            {/* Score circle (static SVG for print) */}
            <div style={{
              ...card,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 16px',
            }}>
              <p style={eyebrow}>Overall Score</p>
              <svg width={120} height={120} viewBox="0 0 120 120" style={{ display: 'block', margin: '6px 0' }}>
                {/* Track */}
                <circle cx={60} cy={60} r={50} fill="none" stroke="rgba(42,31,26,0.08)" strokeWidth={9} />
                {/* Progress arc */}
                <circle
                  cx={60} cy={60} r={50}
                  fill="none"
                  stroke={accent}
                  strokeWidth={9}
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - healthScore / 100)}`}
                  transform="rotate(-90 60 60)"
                />
                <text x={60} y={56} textAnchor="middle" fontFamily="'Playfair Display', serif" fontSize={28} fontWeight={700} fill={accent}>{healthScore}</text>
                <text x={60} y={72} textAnchor="middle" fontFamily="'Cabinet Grotesk', sans-serif" fontSize={10} fill="#a89070">/ 100</text>
              </svg>
              <p style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 14,
                fontWeight: 700,
                color: accent,
                margin: '6px 0 0',
              }}>
                {label}
              </p>
              <p style={{ fontSize: 10, color: '#a89070', margin: '4px 0 0', textAlign: 'center', lineHeight: 1.4 }}>
                Composite of 5 dimensions
              </p>
            </div>

            {/* Dimension bars */}
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={eyebrow}>Score Breakdown</p>
              {dimensions.map((dim) => {
                const pct     = dim.max > 0 ? (dim.score / dim.max) * 100 : 0
                const dColor  = dimColor(dim.score, dim.max)
                return (
                  <div key={dim.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#2a1f1a' }}>{dim.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: dColor }}>
                        {dim.score}
                        <span style={{ color: '#a89070', fontWeight: 400 }}> / {dim.max}</span>
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(42,31,26,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        borderRadius: 3,
                        background: dColor,
                        width: `${pct}%`,
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Section 2: Key Financials ─────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <p style={sectionTitle}>2 — Key Financials</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            {/* Monthly Income */}
            <div style={card}>
              <p style={eyebrow}>Monthly Income</p>
              <p style={bigNum}>{formatSGD(income)}</p>
              <p style={sub}>Take-home pay</p>
            </div>

            {/* Monthly Surplus */}
            <div style={card}>
              <p style={eyebrow}>Monthly Surplus</p>
              <p style={{ ...bigNum, color: surplus >= 0 ? '#2a1f1a' : '#dc2626' }}>
                {formatSGD(surplus)}
              </p>
              <p style={sub}>{savingsRate.toFixed(0)}% savings rate</p>
            </div>

            {/* Liquid Savings */}
            <div style={card}>
              <p style={eyebrow}>Liquid Savings</p>
              <p style={bigNum}>{formatSGD(savings)}</p>
              <p style={sub}>{emergencyMonths.toFixed(1)} months emergency</p>
            </div>

            {/* CPF Total */}
            <div style={card}>
              <p style={eyebrow}>CPF Total</p>
              <p style={bigNum}>{formatSGD(cpfTotal)}</p>
              <p style={sub}>OA {formatSGD(cpfOa)} · SA {formatSGD(cpfSa)} · MA {formatSGD(cpfMa)}</p>
            </div>
          </div>
        </div>

        {/* ── Section 3: Retirement Outlook ────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <p style={sectionTitle}>3 — Retirement Outlook</p>

          <div style={{ ...card }}>
            {/* Two-column corpus figures */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

              <div>
                <p style={eyebrow}>Projected Corpus at Age {retAge}</p>
                <p style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 30,
                  fontWeight: 700,
                  color: '#2a1f1a',
                  margin: '0 0 4px',
                }}>
                  {formatSGD(projected)}
                </p>
                <p style={sub}>
                  Savings FV {formatSGD(fvSavings)} · Monthly investment FV {formatSGD(fvMonthly)} · CPF {formatSGD(cpfTotal * Math.pow(1 + r, n))}
                </p>
              </div>

              <div>
                <p style={eyebrow}>Required Corpus (Inflation-Adjusted)</p>
                <p style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 30,
                  fontWeight: 700,
                  color: '#2a1f1a',
                  margin: '0 0 4px',
                }}>
                  {formatSGD(required)}
                </p>
                <p style={sub}>
                  Desired {formatSGD(desiredInc)}/mo · Inflation {(inflation * 100).toFixed(1)}% · Yield {(divYield * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Gap / Surplus banner */}
            <div style={{
              background: gap >= 0 ? 'rgba(22,163,74,0.07)' : 'rgba(220,38,38,0.06)',
              border: `1px solid ${gap >= 0 ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.2)'}`,
              borderRadius: 9,
              padding: '12px 18px',
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{
                fontSize: 13,
                fontWeight: 700,
                color: gap >= 0 ? '#16a34a' : '#dc2626',
              }}>
                {gap >= 0 ? 'Projected Surplus' : 'Projected Shortfall'}
              </span>
              <span style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 20,
                fontWeight: 700,
                color: gap >= 0 ? '#16a34a' : '#dc2626',
              }}>
                {gap >= 0 ? '+' : ''}{formatSGD(gap)}
              </span>
            </div>

            {/* Progress bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#a89070' }}>Retirement readiness</span>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: retirementPct >= 80 ? '#16a34a' : retirementPct >= 50 ? '#d97706' : '#dc2626',
                }}>
                  {retirementPct.toFixed(0)}%
                </span>
              </div>
              <div style={{ height: 10, background: 'rgba(42,31,26,0.08)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  borderRadius: 5,
                  background: retirementPct >= 80 ? '#16a34a' : retirementPct >= 50 ? '#d97706' : '#dc2626',
                  width: `${Math.min(100, retirementPct)}%`,
                }} />
              </div>
              <p style={{ ...sub, marginTop: 6 }}>
                {yearsToRetirement} years to retirement · Return rate {(returnRate * 100).toFixed(1)}% p.a.
              </p>
            </div>
          </div>
        </div>

        {/* ── Section 4: Protection Summary ────────────────────────────────── */}
        <div style={{ marginBottom: 36 }}>
          <p style={sectionTitle}>4 — Protection Summary</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {/* Total coverage */}
            <div style={card}>
              <p style={eyebrow}>Total Coverage</p>
              <p style={bigNum}>{formatSGD(totalCoverage)}</p>
              <p style={sub}>Sum of enabled policies</p>
            </div>

            {/* Coverage multiple */}
            <div style={card}>
              <p style={eyebrow}>Coverage Multiple</p>
              <p style={{
                ...bigNum,
                color: coverageMultiple >= 10 ? '#16a34a' : coverageMultiple >= 5 ? '#d97706' : '#dc2626',
              }}>
                {coverageMultiple.toFixed(1)}× income
              </p>
              <p style={sub}>Target: 10× annual income</p>
            </div>

            {/* Number of policies */}
            <div style={card}>
              <p style={eyebrow}>Active Policies</p>
              <p style={bigNum}>{numPolicies}</p>
              <p style={sub}>{numPolicies === 1 ? 'policy on record' : 'policies on record'}</p>
            </div>
          </div>
        </div>

        {/* ── Session Summary ───────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }} className="no-print">
          <SessionSummary
            userId={user!.id}
            profile={{
              monthly_income: income,
              monthly_expenses: expenses,
              liquid_savings: savings,
              cpf_oa: cpfOa,
              cpf_sa: cpfSa,
              cpf_ma: cpfMa,
              monthly_investment: monthlyInv,
              retirement_age: retAge,
              desired_monthly_income: desiredInc,
              portfolio_value: Number(profile.portfolio_value) || 0,
            }}
            benefits={(benefits ?? []).filter(b => b.enabled)}
            healthScore={healthScore}
          />
        </div>

        {/* ── Disclaimer footer ─────────────────────────────────────────────── */}
        <div style={{
          borderTop: '1px solid rgba(42,31,26,0.12)',
          paddingTop: 18,
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: 10,
            color: '#a89070',
            margin: 0,
            lineHeight: 1.6,
            maxWidth: 640,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            This report is for illustration purposes only and does not constitute financial advice.
            Projections are based on the assumptions stated above and actual outcomes may differ materially.
            Generated by The Kiasu Guide on {today}.
          </p>
        </div>

      </div>
    </>
    </PageWrapper>
  )
}
