import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('client_profiles')
    .select('pdpa_consent, preferred_name, dob, sex, height_cm, weight_kg, pre_existing, employment_status, monthly_income, num_dependents, monthly_expenses, liquid_savings, cpf_oa, cpf_sa, cpf_ma, retirement_age, desired_monthly_income, inflation_rate')
    .eq('user_id', user.id)
    .single()

  // Admins don't do onboarding
  if ((profile as Record<string, unknown>)?.role === 'admin') redirect('/admin')

  // Already completed onboarding
  if (profile?.pdpa_consent) redirect('/dashboard')

  return <OnboardingWizard userId={user.id} existing={profile} />
}
