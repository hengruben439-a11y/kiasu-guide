import { createClient } from '@/lib/supabase/server'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ClientProfile } from '@/types'
import CashFlow from '@/components/tools/CashFlow'
import PlanLinksBar from '@/components/PlanLinksBar'
import { buildPlanMetrics } from '@/lib/scoring'

export default async function CashFlowPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: benefits }] = await Promise.all([
    supabase
      .from('client_profiles')
      .select('monthly_income, monthly_expenses, liquid_savings, cpf_oa, cpf_sa, cpf_ma, monthly_investment, retirement_age, desired_monthly_income, dividend_yield, inflation_rate, target_return_rate, dob')
      .eq('user_id', user!.id)
      .single<Partial<ClientProfile>>(),
    supabase.from('benefit_blocks').select('benefit_type, coverage, enabled').eq('user_id', user!.id),
  ])

  const planGaps = profile && Number(profile.monthly_income) > 0
    ? buildPlanMetrics(profile, benefits).gaps.filter(g => g.id !== 'cashflow' && g.id !== 'emergency')
    : []

  return (
    <PageWrapper>
        <div style={{ padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 48px)', maxWidth: 1100, margin: '0 auto', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
      <div style={{ marginBottom: 32 }}>
        <p style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: '#c4a882', margin: '0 0 8px',
        }}>
          Financial Tools
        </p>
        <h1 style={{
          fontFamily: "'Playfair Display', serif", fontSize: 28,
          fontWeight: 700, color: '#fdf8f2', margin: '0 0 8px', letterSpacing: '-0.02em',
        }}>
          Cash Flow Analysis
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(253,248,242,0.5)', margin: 0 }}>
          Understand where your money goes and find your optimal savings rate.
        </p>
      </div>

      <CashFlow
        monthlyIncome={Number(profile?.monthly_income ?? 8000)}
        monthlyExpenses={Number(profile?.monthly_expenses ?? 4000)}
        userId={user!.id}
      />
      <PlanLinksBar gaps={planGaps} title="Other areas of your plan" />
    </div>
    </PageWrapper>
  )
}
