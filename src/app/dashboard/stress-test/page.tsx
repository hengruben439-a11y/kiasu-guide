import { createClient } from '@/lib/supabase/server'
import { ClientProfile } from '@/types'
import StressTest from '@/components/tools/StressTest'

export default async function StressTestPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: benefitBlocks }] = await Promise.all([
    supabase
      .from('client_profiles')
      .select('monthly_income, monthly_expenses, liquid_savings, cpf_oa, cpf_sa, cpf_ma, monthly_investment, inflation_rate, dob')
      .eq('user_id', user!.id)
      .single<Partial<ClientProfile>>(),
    supabase
      .from('benefit_blocks')
      .select('id, benefit_type, coverage, payout_mode, enabled, policy_name')
      .eq('user_id', user!.id),
  ])

  const currentAge = profile?.dob
    ? Math.floor((Date.now() - new Date(profile.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 35

  return (
    <div style={{ padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 48px)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
      <div style={{ marginBottom: 36 }}>
        <p style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: '#c4a882', margin: '0 0 8px',
        }}>
          Risk Analysis
        </p>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 28, fontWeight: 700,
          color: '#2a1f1a', margin: '0 0 8px', letterSpacing: '-0.02em',
        }}>
          Financial Stress Test
        </h1>
        <p style={{ fontSize: 14, color: '#a89070', margin: 0, lineHeight: 1.6 }}>
          How long can your savings last if the worst happens? Run your numbers through four real-life crisis scenarios.
        </p>
      </div>

      <StressTest
        monthly_income={Number(profile?.monthly_income ?? 0)}
        monthly_expenses={Number(profile?.monthly_expenses ?? 3000)}
        liquid_savings={Number(profile?.liquid_savings ?? 0)}
        cpf_oa={Number(profile?.cpf_oa ?? 0)}
        cpf_sa={Number(profile?.cpf_sa ?? 0)}
        cpf_ma={Number(profile?.cpf_ma ?? 0)}
        monthly_investment={Number(profile?.monthly_investment ?? 0)}
        inflation_rate={Number(profile?.inflation_rate ?? 0.03)}
        currentAge={currentAge}
        benefitBlocks={benefitBlocks ?? []}
      />
    </div>
  )
}
