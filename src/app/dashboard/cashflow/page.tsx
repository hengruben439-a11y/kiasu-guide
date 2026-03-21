import { createClient } from '@/lib/supabase/server'
import { ClientProfile } from '@/types'
import CashFlow from '@/components/tools/CashFlow'

export default async function CashFlowPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('client_profiles')
    .select('monthly_income, monthly_expenses')
    .eq('user_id', user!.id)
    .single<Partial<ClientProfile>>()

  return (
    <div style={{ padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 48px)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#c4a882',
            margin: '0 0 8px',
          }}
        >
          Financial Tools
        </p>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 28,
            fontWeight: 700,
            color: '#2a1f1a',
            margin: '0 0 8px',
            letterSpacing: '-0.02em',
          }}
        >
          Cash Flow Analysis
        </h1>
        <p style={{ fontSize: 14, color: '#a89070', margin: 0 }}>
          Understand where your money goes and find your optimal savings rate.
        </p>
      </div>

      <CashFlow
        monthlyIncome={Number(profile?.monthly_income ?? 8000)}
        monthlyExpenses={Number(profile?.monthly_expenses ?? 4000)}
        userId={user!.id}
      />
    </div>
  )
}
