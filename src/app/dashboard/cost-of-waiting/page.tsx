import { createClient } from '@/lib/supabase/server'
import { ClientProfile } from '@/types'
import CostOfWaiting from '@/components/tools/CostOfWaiting'

export default async function CostOfWaitingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('client_profiles')
    .select('liquid_savings, monthly_investment, retirement_age, target_return_rate, desired_monthly_income, dividend_yield, dob')
    .eq('user_id', user!.id)
    .single<Partial<ClientProfile>>()

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
          Investment Planning
        </p>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 28, fontWeight: 700,
          color: '#fdf8f2', margin: '0 0 8px', letterSpacing: '-0.02em',
        }}>
          The Cost of Waiting
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(253,248,242,0.5)', margin: 0, lineHeight: 1.6 }}>
          Every year you delay, compounding works against you. See exactly how much more you must invest each month to reach the same goal.
        </p>
      </div>

      <CostOfWaiting
        liquid_savings={Number(profile?.liquid_savings ?? 0)}
        monthly_investment={Number(profile?.monthly_investment ?? 0)}
        retirement_age={Number(profile?.retirement_age ?? 65)}
        target_return_rate={Number(profile?.target_return_rate ?? 0.06)}
        desired_monthly_income={Number(profile?.desired_monthly_income ?? 5000)}
        dividend_yield={Number(profile?.dividend_yield ?? 0.04)}
        currentAge={currentAge}
      />
    </div>
  )
}
