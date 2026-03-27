import { createClient } from '@/lib/supabase/server'
import { ClientProfile } from '@/types'
import { formatSGD } from '@/lib/utils'
import { buildPlanMetrics } from '@/lib/scoring'
import GreetingHeader from '@/components/dashboard/GreetingHeader'
import ToolGrid from '@/components/dashboard/ToolGrid'
import { DashboardStatCards } from '@/components/dashboard/DashboardStatCards'
import { PageWrapper } from '@/components/layout/PageWrapper'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileResult, quotesResult, notesResult, benefitsResult, liabilitiesResult] = await Promise.all([
    supabase
      .from('client_profiles')
      .select('preferred_name, monthly_income, monthly_expenses, liquid_savings, retirement_age, cpf_oa, cpf_sa, cpf_ma, monthly_investment, pdpa_consent, desired_monthly_income, dividend_yield, inflation_rate, target_return_rate, dob')
      .eq('user_id', user!.id)
      .single<Partial<ClientProfile>>(),
    supabase
      .from('daily_quotes')
      .select('quote, author')
      .eq('active', true)
      .limit(30),
    supabase
      .from('case_notes')
      .select('content, created_at')
      .eq('user_id', user!.id)
      .eq('note_type', 'client_visible')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('benefit_blocks')
      .select('benefit_type, coverage, enabled')
      .eq('user_id', user!.id),
    supabase
      .from('liabilities')
      .select('monthly_payment, outstanding_balance')
      .eq('user_id', user!.id),
  ])

  const profile = profileResult.data
  const quotes = quotesResult.data ?? []
  const notes = notesResult.data ?? []
  const benefits = benefitsResult.data ?? []
  const liabilitiesData = liabilitiesResult.data ?? []

  const dayIndex = Math.floor(Date.now() / 86400000) % Math.max(quotes.length, 1)
  const quote = quotes[dayIndex] ?? null

  const hasFinancials = !!(profile?.monthly_income && Number(profile.monthly_income) > 0)
  const displayName = profile?.preferred_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there'

  const totalCpf = (Number(profile?.cpf_oa) + Number(profile?.cpf_sa) + Number(profile?.cpf_ma)) || 0
  const income = Number(profile?.monthly_income) || 0
  const expenses = Number(profile?.monthly_expenses) || 0
  const savings = Number(profile?.liquid_savings) || 0
  const surplus = hasFinancials ? income - expenses : null
  const savingsRate = income > 0 && surplus !== null ? (surplus / income) * 100 : null

  const STAT_CARDS = [
    {
      label: 'Monthly Income',
      value: hasFinancials ? formatSGD(income) : '—',
      sub: 'Take-home pay',
      emoji: '💼',
      accent: '#0369a1',
      accentBg: 'rgba(3,105,161,0.06)',
    },
    {
      label: 'Monthly Surplus',
      value: surplus !== null ? formatSGD(surplus) : '—',
      sub: savingsRate !== null ? `${savingsRate.toFixed(0)}% savings rate` : 'After expenses',
      emoji: '📈',
      accent: surplus !== null && surplus >= 0 ? '#16a34a' : '#dc2626',
      accentBg: surplus !== null && surplus >= 0 ? 'rgba(22,163,74,0.06)' : 'rgba(220,38,38,0.06)',
    },
    {
      label: 'Liquid Savings',
      value: hasFinancials ? formatSGD(savings) : '—',
      sub: expenses > 0 ? `${(savings / expenses).toFixed(1)} months emergency fund` : 'Emergency buffer',
      emoji: '🏦',
      accent: '#d97706',
      accentBg: 'rgba(217,119,6,0.06)',
    },
    {
      label: 'CPF Balance',
      value: totalCpf > 0 ? formatSGD(totalCpf) : '—',
      sub: 'OA + SA + MA combined',
      emoji: '🇸🇬',
      accent: '#0f766e',
      accentBg: 'rgba(15,118,110,0.06)',
    },
  ]

  const planMetrics = hasFinancials && profile
    ? buildPlanMetrics(profile, benefits, liabilitiesData)
    : null
  const topPriority = planMetrics?.priorities[0] ?? null
  const criticalCount = planMetrics?.priorities.filter(g => g.severity === 'critical').length ?? 0

  // Journey steps
  const hasProfile = hasFinancials
  const hasInsurance = benefits.filter((b: { enabled: boolean }) => b.enabled).length > 0
  const hasCpf = totalCpf > 0
  const hasRetirement = !!(profile?.desired_monthly_income && Number(profile.desired_monthly_income) > 0 && profile?.monthly_investment && Number(profile.monthly_investment) > 0)
  const journeySteps = [
    { label: 'Profile', href: '/dashboard/profile', done: hasProfile, icon: '①' },
    { label: 'Insurance', href: '/dashboard/insurance', done: hasInsurance, icon: '②' },
    { label: 'CPF Plan', href: '/dashboard/cpf', done: hasCpf, icon: '③' },
    { label: 'Retirement', href: '/dashboard/retirement', done: hasRetirement, icon: '④' },
    { label: 'Stress Test', href: '/dashboard/stress-test', done: false, icon: '⑤' },
  ]
  const currentStepIdx = journeySteps.findIndex(s => !s.done)

  return (
    <PageWrapper>
    <div style={{ padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 48px)', fontFamily: "'Cabinet Grotesk', sans-serif", maxWidth: 1100 }}>

      <GreetingHeader name={displayName} />

      {/* Journey tracker */}
      <div style={{
        background: 'rgba(122,28,46,0.06)',
        border: '1px solid rgba(196,168,130,0.15)',
        borderRadius: 14,
        padding: '20px 24px',
        marginBottom: 28,
        backdropFilter: 'blur(12px)',
      }}>
        <p style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: '#c4a882', margin: '0 0 16px',
        }}>
          Your Financial Plan
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
          {journeySteps.map((step, i) => {
            const isCurrent = i === currentStepIdx
            const isDone = step.done
            return (
              <div key={step.label} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                <Link href={step.href} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 64 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    background: isDone ? 'rgba(22,163,74,0.2)' : isCurrent ? 'rgba(155,32,64,0.25)' : 'rgba(196,168,130,0.06)',
                    border: `2px solid ${isDone ? '#16a34a' : isCurrent ? '#9b2040' : 'rgba(196,168,130,0.15)'}`,
                    color: isDone ? '#16a34a' : isCurrent ? '#fdf8f2' : 'rgba(253,248,242,0.35)',
                    transition: 'all 0.2s',
                  }}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: isDone || isCurrent ? 600 : 400,
                    color: isDone ? '#16a34a' : isCurrent ? '#fdf8f2' : 'rgba(253,248,242,0.35)',
                    whiteSpace: 'nowrap',
                  }}>
                    {step.label}
                  </span>
                </Link>
                {i < journeySteps.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, minWidth: 16,
                    background: isDone ? 'rgba(22,163,74,0.4)' : 'rgba(196,168,130,0.1)',
                    borderRadius: 1, margin: '0 4px', marginBottom: 20,
                  }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Daily quote — richer card */}
      {quote && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(122,28,46,0.05) 0%, rgba(196,168,130,0.04) 100%)',
          border: '1px solid rgba(122,28,46,0.12)',
          borderRadius: 14,
          padding: '20px 28px',
          marginBottom: 32,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative quote mark */}
          <span style={{
            position: 'absolute', top: -8, right: 24,
            fontSize: 80, color: 'rgba(122,28,46,0.06)',
            fontFamily: "'Playfair Display', serif", lineHeight: 1,
            pointerEvents: 'none', userSelect: 'none',
          }}>&ldquo;</span>
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.15em',
            textTransform: 'uppercase', color: '#c4a882', margin: '0 0 10px',
            fontFamily: "'Cabinet Grotesk', sans-serif",
          }}>
            Daily Insight
          </p>
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 15, color: '#fdf8f2', fontStyle: 'italic',
            margin: '0 0 10px', lineHeight: 1.7, maxWidth: 680,
          }}>
            &ldquo;{quote.quote}&rdquo;
          </p>
          {quote.author && (
            <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.45)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              — {quote.author}
            </p>
          )}
        </div>
      )}

      {/* Advisor notes */}
      {notes.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.15em',
            textTransform: 'uppercase', color: '#c4a882', margin: '0 0 12px',
            fontFamily: "'Cabinet Grotesk', sans-serif",
          }}>
            Notes from your advisor
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notes.map((note, i) => (
              <div key={i} style={{
                background: 'rgba(122,28,46,0.08)',
                border: '1px solid rgba(196,168,130,0.12)',
                borderLeft: '3px solid #9b2040',
                borderRadius: '0 10px 10px 0',
                padding: '13px 18px',
              }}>
                <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.75)', lineHeight: 1.7, margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan Status banner */}
      {planMetrics && topPriority && !planMetrics.allGood && (
        <div style={{
          marginBottom: 28,
          background: criticalCount > 0
            ? 'rgba(220,38,38,0.06)'
            : 'rgba(217,119,6,0.06)',
          border: `1px solid ${criticalCount > 0 ? 'rgba(220,38,38,0.2)' : 'rgba(217,119,6,0.2)'}`,
          borderLeft: `3px solid ${criticalCount > 0 ? '#dc2626' : '#d97706'}`,
          borderRadius: '0 12px 12px 0',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '2px 7px', borderRadius: 5,
                background: criticalCount > 0 ? 'rgba(220,38,38,0.15)' : 'rgba(217,119,6,0.15)',
                color: criticalCount > 0 ? '#ef4444' : '#f59e0b',
              }}>
                {criticalCount > 0 ? `${criticalCount} Critical` : 'Attention Needed'}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fdf8f2', fontFamily: "'Playfair Display', serif" }}>
                {topPriority.title}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.55)', margin: 0, lineHeight: 1.4 }}>
              {topPriority.consequence}
            </p>
          </div>
          <Link href="/dashboard/overview" style={{
            fontSize: 12, fontWeight: 600,
            color: criticalCount > 0 ? '#ef4444' : '#f59e0b',
            textDecoration: 'none', flexShrink: 0,
            whiteSpace: 'nowrap',
          }}>
            View full plan →
          </Link>
        </div>
      )}

      {/* Stat cards — animated */}
      {hasFinancials && profile && <DashboardStatCards cards={STAT_CARDS} />}

      {/* No financials CTA */}
      {!hasFinancials && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(122,28,46,0.04) 0%, rgba(196,168,130,0.03) 100%)',
          border: '1px solid rgba(122,28,46,0.12)',
          borderRadius: 14, padding: '24px 28px', marginBottom: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#fdf8f2', margin: '0 0 4px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Your financial snapshot is waiting
            </p>
            <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.50)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Complete your Financial Profile to unlock personalised analytics.
            </p>
          </div>
          <Link href="/dashboard/profile" style={{
            background: '#7a1c2e', color: '#fdf8f2',
            padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            textDecoration: 'none', fontFamily: "'Cabinet Grotesk', sans-serif",
            flexShrink: 0, marginLeft: 20,
          }}>
            Set up profile →
          </Link>
        </div>
      )}

      {/* Tool grid */}
      <ToolGrid />

    </div>
    </PageWrapper>
  )
}
