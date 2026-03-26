import { createClient } from '@/lib/supabase/server'
import { ClientProfile } from '@/types'
import CPFPlanner from '@/components/tools/CPFPlanner'

export default async function CPFPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('client_profiles')
    .select('cpf_oa, cpf_sa, cpf_ma, monthly_income, retirement_age, dob, desired_monthly_income, inflation_rate')
    .eq('user_id', user!.id)
    .single<Partial<ClientProfile>>()

  const currentAge = profile?.dob
    ? Math.floor((Date.now() - new Date(profile.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 35

  return (
    <div style={{ padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 48px)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
      <div style={{ marginBottom: 32 }}>
        <p style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: '#c4a882', margin: '0 0 8px',
        }}>
          CPF Planning
        </p>
        <h1 style={{
          fontFamily: "'Playfair Display', serif", fontSize: 28,
          fontWeight: 700, color: '#fdf8f2', margin: '0 0 8px', letterSpacing: '-0.02em',
        }}>
          CPF Optimiser
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(253,248,242,0.5)', margin: 0 }}>
          Project your CPF balances, estimate CPF Life payout, and find your top-up sweet spot.
        </p>
      </div>
      <CPFPlanner
        cpfOa={Number(profile?.cpf_oa ?? 80000)}
        cpfSa={Number(profile?.cpf_sa ?? 40000)}
        cpfMa={Number(profile?.cpf_ma ?? 20000)}
        monthlyIncome={Number(profile?.monthly_income ?? 8000)}
        retirementAge={Number(profile?.retirement_age ?? 65)}
        currentAge={currentAge}
        desiredMonthlyIncome={Number(profile?.desired_monthly_income ?? 5000)}
        inflationRate={Number(profile?.inflation_rate ?? 0.03)}
      />
    </div>
  )
}
