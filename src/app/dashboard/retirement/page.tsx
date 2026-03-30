import { createClient } from '@/lib/supabase/server'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ClientProfile } from '@/types'
import RetirementAnalytics from '@/components/tools/RetirementAnalytics'
import PlanLinksBar from '@/components/PlanLinksBar'
import { buildPlanMetrics } from '@/lib/scoring'

export default async function RetirementPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: benefits }] = await Promise.all([
    supabase
      .from('client_profiles')
      .select('preferred_name, dob, monthly_income, monthly_expenses, liquid_savings, portfolio_value, cpf_oa, cpf_sa, cpf_ma, monthly_investment, retirement_age, desired_monthly_income, dividend_yield, inflation_rate, target_return_rate')
      .eq('user_id', user!.id)
      .single<Partial<ClientProfile>>(),
    supabase.from('benefit_blocks').select('benefit_type, coverage, enabled').eq('user_id', user!.id),
  ])

  const planGaps = profile && Number(profile.monthly_income) > 0
    ? buildPlanMetrics(profile, benefits).gaps.filter(g => g.id !== 'retirement')
    : []

  const age = profile?.dob
    ? Math.floor((Date.now() - new Date(profile.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  return (
    <PageWrapper>
        <div style={{ padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 48px)', maxWidth: 1100, margin: '0 auto', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 8px' }}>
          Retirement Planning
        </p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#fdf8f2', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Retirement Analytics
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(253,248,242,0.5)', margin: 0 }}>
          Your financial mirror — see exactly where you stand and what it takes to retire on your terms.
        </p>
      </div>
      <RetirementAnalytics
        currentAge={age ?? 35}
        monthlyIncome={Number(profile?.monthly_income ?? 0)}
        currentSavings={Number(profile?.liquid_savings ?? 0) + Number(profile?.portfolio_value ?? 0)}
        monthlyInvestment={Number(profile?.monthly_investment ?? 0)}
        retirementAge={Number(profile?.retirement_age ?? 65)}
        desiredMonthlyIncome={Number(profile?.desired_monthly_income ?? 5000)}
        inflationRate={Number(profile?.inflation_rate ?? 0.03)}
        dividendYield={Number(profile?.dividend_yield ?? 0.04)}
        annualRate={Number(profile?.target_return_rate ?? 0.06)}
        cpfOa={Number(profile?.cpf_oa ?? 0)}
        cpfSa={Number(profile?.cpf_sa ?? 0)}
        cpfMa={Number(profile?.cpf_ma ?? 0)}
      />
      <PlanLinksBar gaps={planGaps} title="Other areas of your plan" />
    </div>
    </PageWrapper>
  )
}
