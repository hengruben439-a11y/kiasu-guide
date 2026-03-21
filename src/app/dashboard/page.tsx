import { createClient } from '@/lib/supabase/server'
import { ClientProfile } from '@/types'
import { formatSGD } from '@/lib/utils'
import GreetingHeader from '@/components/dashboard/GreetingHeader'
import ToolGrid from '@/components/dashboard/ToolGrid'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileResult, quotesResult, notesResult] = await Promise.all([
    supabase
      .from('client_profiles')
      .select('preferred_name, monthly_income, monthly_expenses, liquid_savings, retirement_age, cpf_oa, cpf_sa, cpf_ma, monthly_investment, pdpa_consent')
      .eq('user_id', user!.id)
      .single<Pick<ClientProfile,
        'preferred_name' | 'monthly_income' | 'monthly_expenses' |
        'liquid_savings' | 'retirement_age' | 'cpf_oa' | 'cpf_sa' | 'cpf_ma' |
        'monthly_investment' | 'pdpa_consent'
      >>(),
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
  ])

  const profile = profileResult.data
  const quotes = quotesResult.data ?? []
  const notes = notesResult.data ?? []

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

  return (
    <div style={{ padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 48px)', fontFamily: "'Cabinet Grotesk', sans-serif", maxWidth: 1100 }}>

      <GreetingHeader name={displayName} />

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
            fontSize: 15, color: '#2a1f1a', fontStyle: 'italic',
            margin: '0 0 10px', lineHeight: 1.7, maxWidth: 680,
          }}>
            &ldquo;{quote.quote}&rdquo;
          </p>
          {quote.author && (
            <p style={{ fontSize: 12, color: '#a89070', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
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
                background: '#fff',
                border: '1px solid rgba(42,31,26,0.07)',
                borderLeft: '3px solid #7a1c2e',
                borderRadius: '0 10px 10px 0',
                padding: '13px 18px',
              }}>
                <p style={{ fontSize: 13, color: '#2a1f1a', lineHeight: 1.7, margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat cards — colored accent style */}
      {hasFinancials && profile && (
        <div className="grid-4col" style={{ gap: 12, marginBottom: 40 }}>
          {STAT_CARDS.map((s) => (
            <div key={s.label} style={{
              background: '#fff',
              border: '1px solid rgba(42,31,26,0.07)',
              borderRadius: 14,
              padding: '18px 20px',
              boxShadow: '0 2px 10px rgba(42,31,26,0.04)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Top accent strip */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg, ${s.accent}, ${s.accent}60)`,
              }} />
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: s.accentBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, marginBottom: 10,
              }}>
                {s.emoji}
              </div>
              <p style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: '#a89070',
                margin: '0 0 5px', fontFamily: "'Cabinet Grotesk', sans-serif",
              }}>
                {s.label}
              </p>
              <p style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 22, fontWeight: 700, color: '#2a1f1a', margin: '0 0 3px',
              }}>
                {s.value}
              </p>
              <p style={{ fontSize: 11, color: '#a89070', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                {s.sub}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* No financials CTA */}
      {!hasFinancials && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(122,28,46,0.04) 0%, rgba(196,168,130,0.03) 100%)',
          border: '1px solid rgba(122,28,46,0.12)',
          borderRadius: 14, padding: '24px 28px', marginBottom: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#2a1f1a', margin: '0 0 4px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Your financial snapshot is waiting
            </p>
            <p style={{ fontSize: 13, color: '#a89070', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
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
  )
}
