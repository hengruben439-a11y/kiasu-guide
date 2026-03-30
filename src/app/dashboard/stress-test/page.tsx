import { createClient } from '@/lib/supabase/server'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ClientProfile } from '@/types'
import StressTest from '@/components/tools/StressTest'
import PlanLinksBar from '@/components/PlanLinksBar'
import { buildPlanMetrics } from '@/lib/scoring'

export default async function StressTestPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: benefitBlocks }] = await Promise.all([
    supabase
      .from('client_profiles')
      .select('monthly_income, monthly_expenses, liquid_savings, portfolio_value, total_liabilities, cpf_oa, cpf_sa, cpf_ma, cpf_toggle, monthly_investment, inflation_rate, dob, retirement_age, desired_monthly_income, dividend_yield, target_return_rate')
      .eq('user_id', user!.id)
      .single<Partial<ClientProfile>>(),
    supabase
      .from('benefit_blocks')
      .select('id, benefit_type, coverage, payout_mode, enabled, policy_name')
      .eq('user_id', user!.id),
  ])

  const planGaps = profile && Number(profile.monthly_income) > 0
    ? buildPlanMetrics(profile, benefitBlocks).gaps.filter(g => g.id !== 'emergency' && g.id !== 'cashflow')
    : []

  const currentAge = profile?.dob
    ? Math.floor((Date.now() - new Date(profile.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 35

  return (
    <PageWrapper>
        <div style={{ padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 48px)', maxWidth: 1100, margin: '0 auto', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
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
          color: '#fdf8f2', margin: '0 0 8px', letterSpacing: '-0.02em',
        }}>
          Financial Stress Test
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(253,248,242,0.5)', margin: 0, lineHeight: 1.6 }}>
          How long can your savings last if the worst happens? Run your numbers through four real-life crisis scenarios.
        </p>
      </div>

      <StressTest
        monthly_income={Number(profile?.monthly_income ?? 0)}
        monthly_expenses={Number(profile?.monthly_expenses ?? 3000)}
        liquid_savings={Number(profile?.liquid_savings ?? 0)}
        portfolio_value={Number(profile?.portfolio_value ?? 0)}
        total_liabilities={Number(profile?.total_liabilities ?? 0)}
        cpf_oa={Number(profile?.cpf_oa ?? 0)}
        cpf_sa={Number(profile?.cpf_sa ?? 0)}
        cpf_ma={Number(profile?.cpf_ma ?? 0)}
        cpf_toggle={profile?.cpf_toggle !== false}
        monthly_investment={Number(profile?.monthly_investment ?? 0)}
        inflation_rate={Number(profile?.inflation_rate ?? 0.03)}
        currentAge={currentAge}
        benefitBlocks={benefitBlocks ?? []}
      />
      <PlanLinksBar gaps={planGaps} title="Other areas of your plan" />
    </div>
    </PageWrapper>
  )
}
