import { createClient } from '@/lib/supabase/server'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ClientProfile } from '@/types'
import FinancialProfileForm from '@/components/profile/FinancialProfileForm'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('client_profiles')
    .select('preferred_name, monthly_income, monthly_expenses, num_dependents, liquid_savings, cpf_oa, cpf_sa, cpf_ma, property_value, property_liquid, monthly_investment, portfolio_value, target_return_rate, retirement_age, desired_monthly_income, dividend_yield, inflation_rate')
    .eq('user_id', user!.id)
    .single<Partial<ClientProfile>>()

  return (
    <PageWrapper>
        <div style={{ padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 48px)', fontFamily: "'Cabinet Grotesk', sans-serif", maxWidth: 780 }}>
      <div style={{ marginBottom: 36 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 8px' }}>
          Your Data
        </p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#fdf8f2', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Financial Profile
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(253,248,242,0.5)', margin: 0 }}>
          Changes save automatically. All tools update in real time.
        </p>
      </div>
      <FinancialProfileForm userId={user!.id} profile={profile ?? null} />
    </div>
    </PageWrapper>
  )
}
