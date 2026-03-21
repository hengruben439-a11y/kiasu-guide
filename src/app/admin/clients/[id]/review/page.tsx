import { createClient } from '@/lib/supabase/server'
import { ClientProfile } from '@/types'
import { notFound } from 'next/navigation'
import AdminReviewBanner from '@/components/admin/AdminReviewBanner'
import ReviewDashboard from '@/components/admin/ReviewDashboard'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminReviewPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Verify caller is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()
  const { data: me } = await supabase
    .from('client_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()
  if (me?.role !== 'admin') notFound()

  // Fetch client profile (readable via is_admin() RLS)
  const { data: client } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('user_id', id)
    .single<ClientProfile>()

  if (!client || client.role !== 'client') notFound()

  // Fetch benefit_blocks (readable via is_admin() RLS)
  const { data: benefitBlocks } = await supabase
    .from('benefit_blocks')
    .select('*')
    .eq('user_id', id)

  const currentAge = client.dob
    ? Math.floor((Date.now() - new Date(client.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  const totalCoverage = (benefitBlocks ?? [])
    .filter((b) => b.enabled && (b.benefit_type === 'death' || b.benefit_type === 'tpd'))
    .reduce((sum: number, b: { coverage: number }) => sum + Number(b.coverage ?? 0), 0)

  return (
    <div style={{ minHeight: '100vh', background: '#fdf8f2' }}>
      <AdminReviewBanner
        clientName={client.preferred_name ?? '(No name)'}
        clientId={id}
      />
      <ReviewDashboard
        clientId={id}
        currentAge={currentAge}
        monthlyIncome={Number(client.monthly_income ?? 0)}
        monthlyExpenses={Number(client.monthly_expenses ?? 0)}
        liquidSavings={Number(client.liquid_savings ?? 0)}
        cpfOa={Number(client.cpf_oa ?? 0)}
        cpfSa={Number(client.cpf_sa ?? 0)}
        cpfMa={Number(client.cpf_ma ?? 0)}
        monthlyInvestment={Number(client.monthly_investment ?? 0)}
        portfolioValue={Number(client.portfolio_value ?? 0)}
        retirementAge={Number(client.retirement_age ?? 65)}
        desiredMonthlyIncome={Number(client.desired_monthly_income ?? 5000)}
        dividendYield={Number(client.dividend_yield ?? 0.04)}
        targetReturnRate={Number(client.target_return_rate ?? 0.06)}
        inflationRate={Number(client.inflation_rate ?? 0.03)}
        heightCm={client.height_cm ? Number(client.height_cm) : null}
        weightKg={client.weight_kg ? Number(client.weight_kg) : null}
        totalCoverage={totalCoverage}
        benefitBlocks={benefitBlocks ?? []}
      />
    </div>
  )
}
