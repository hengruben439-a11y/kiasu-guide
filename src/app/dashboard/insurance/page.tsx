import { createClient } from '@/lib/supabase/server'
import { ClientProfile } from '@/types'
import InsuranceBenefits from '@/components/tools/InsuranceBenefits'
import PolicyVault from '@/components/tools/PolicyVault'
import PolicyReminders from '@/components/tools/PolicyReminders'
import PlanLinksBar from '@/components/PlanLinksBar'
import { buildPlanMetrics } from '@/lib/scoring'

export interface BenefitBlock {
  id: string
  user_id: string
  benefit_type: 'death' | 'tpd' | 'eci' | 'aci' | 'hospitalisation' | 'pa' | 'careshield'
  policy_name: string | null
  coverage: number
  payout_mode: 'lump_sum' | 'monthly' | 'multipay' | null
  multiplier: number | null
  max_claims: number | null
  cooldown_years: number | null
  expiry_age: number | null
  renewal_date: string | null
  enabled: boolean
}

export default async function InsurancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: benefits }, { data: documents }, { data: reminders }] = await Promise.all([
    supabase
      .from('client_profiles')
      .select('monthly_income, monthly_expenses, liquid_savings, preferred_name, cpf_oa, cpf_sa, cpf_ma, monthly_investment, retirement_age, desired_monthly_income, dividend_yield, inflation_rate, target_return_rate, dob')
      .eq('user_id', user!.id)
      .single<Partial<ClientProfile>>(),
    supabase
      .from('benefit_blocks')
      .select('*')
      .eq('user_id', user!.id)
      .order('benefit_type'),
    supabase
      .from('documents')
      .select('id, file_url, document_type, extraction_status, confidence_score, created_at')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('policy_reminders')
      .select('*')
      .eq('user_id', user!.id)
      .order('reminder_date', { ascending: true }),
  ])

  const planGaps = profile && Number(profile.monthly_income) > 0
    ? buildPlanMetrics(profile, benefits).gaps.filter(g => g.id !== 'protection')
    : []

  return (
    <div style={{ padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 48px)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
      <div style={{ marginBottom: 32 }}>
        <p style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: '#c4a882', margin: '0 0 8px',
        }}>
          Insurance Benefits
        </p>
        <h1 style={{
          fontFamily: "'Playfair Display', serif", fontSize: 28,
          fontWeight: 700, color: '#fdf8f2', margin: '0 0 8px', letterSpacing: '-0.02em',
        }}>
          Protection Coverage
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(253,248,242,0.5)', margin: 0 }}>
          Review your coverage gaps, protection score, and add new policies.
        </p>
      </div>
      <InsuranceBenefits
        monthlyIncome={Number(profile?.monthly_income ?? 8000)}
        monthlyExpenses={Number(profile?.monthly_expenses ?? 0)}
        liquidSavings={Number(profile?.liquid_savings ?? 0)}
        benefitBlocks={(benefits ?? []) as BenefitBlock[]}
        userId={user!.id}
      />
      <div style={{ marginTop: 24 }}>
        <PolicyReminders
          userId={user!.id}
          initialReminders={reminders ?? []}
        />
      </div>
      <div style={{ marginTop: 24 }}>
        <PolicyVault
          userId={user!.id}
          initialDocuments={documents ?? []}
        />
      </div>
      <PlanLinksBar gaps={planGaps} title="Other areas of your plan" />
    </div>
  )
}
