import { createClient } from '@/lib/supabase/server'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ClientProfile } from '@/types'
import FinancialHealthScore from '@/components/tools/FinancialHealthScore'

export default async function HealthScorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('user_id', user!.id)
    .single<ClientProfile>()

  // Fetch benefit_blocks for coverage total
  const { data: benefits } = await supabase
    .from('benefit_blocks')
    .select('benefit_type, coverage, enabled')
    .eq('user_id', user!.id)

  // Sum death + TPD coverage for life protection score
  const totalCoverage = (benefits ?? [])
    .filter((b) => b.enabled && (b.benefit_type === 'death' || b.benefit_type === 'tpd'))
    .reduce((sum, b) => sum + Number(b.coverage ?? 0), 0)

  const age = profile?.dob
    ? Math.floor((Date.now() - new Date(profile.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  return (
    <PageWrapper>
        <div style={{ padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 48px)', fontFamily: "'Cabinet Grotesk', sans-serif", maxWidth: 1000 }}>
      <div style={{ marginBottom: 36 }}>
        <p style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: '#c4a882', margin: '0 0 8px',
          fontFamily: "'Cabinet Grotesk', sans-serif",
        }}>
          Financial Wellness
        </p>
        <h1 style={{
          fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700,
          color: '#fdf8f2', margin: '0 0 8px', letterSpacing: '-0.02em',
        }}>
          Your Health Score
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(253,248,242,0.5)', margin: 0 }}>
          A composite score across protection, retirement, liquidity, debt management, and investment discipline.
        </p>
      </div>

      <FinancialHealthScore
        monthlyIncome={Number(profile?.monthly_income ?? 0)}
        monthlyExpenses={Number(profile?.monthly_expenses ?? 0)}
        liquidSavings={Number(profile?.liquid_savings ?? 0)}
        cpfOa={Number(profile?.cpf_oa ?? 0)}
        cpfSa={Number(profile?.cpf_sa ?? 0)}
        cpfMa={Number(profile?.cpf_ma ?? 0)}
        monthlyInvestment={Number(profile?.monthly_investment ?? 0)}
        retirementAge={Number(profile?.retirement_age ?? 65)}
        desiredMonthlyIncome={Number(profile?.desired_monthly_income ?? 5000)}
        dividendYield={Number(profile?.dividend_yield ?? 0.04)}
        targetReturnRate={Number(profile?.target_return_rate ?? 0.06)}
        inflationRate={Number(profile?.inflation_rate ?? 0.03)}
        currentAge={age}
        totalCoverage={totalCoverage}
        userId={user!.id}
      />
    </div>
    </PageWrapper>
  )
}
