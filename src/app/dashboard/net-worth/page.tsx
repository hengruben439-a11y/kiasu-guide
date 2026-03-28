import { createClient } from '@/lib/supabase/server'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ClientProfile } from '@/types'
import NetWorthTracker from '@/components/tools/NetWorthTracker'

export default async function NetWorthPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('client_profiles')
    .select('liquid_savings, portfolio_value, property_value, property_liquid, cpf_oa, cpf_sa, cpf_ma, total_liabilities')
    .eq('user_id', user!.id)
    .single<Partial<ClientProfile>>()

  return (
    <PageWrapper>
        <div style={{ padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 48px)', fontFamily: "'Cabinet Grotesk', sans-serif", maxWidth: 1000 }}>
      <div style={{ marginBottom: 36 }}>
        <p style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: '#c4a882', margin: '0 0 8px',
          fontFamily: "'Cabinet Grotesk', sans-serif",
        }}>
          Wealth
        </p>
        <h1 style={{
          fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700,
          color: '#fdf8f2', margin: '0 0 8px', letterSpacing: '-0.02em',
        }}>
          Net Worth
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(253,248,242,0.5)', margin: 0 }}>
          Your total assets at a glance.
        </p>
      </div>

      <NetWorthTracker
        liquidSavings={Number(profile?.liquid_savings ?? 0)}
        portfolioValue={Number(profile?.portfolio_value ?? 0)}
        propertyValue={Number(profile?.property_value ?? 0)}
        propertyLiquid={profile?.property_liquid ?? false}
        cpfOa={Number(profile?.cpf_oa ?? 0)}
        cpfSa={Number(profile?.cpf_sa ?? 0)}
        cpfMa={Number(profile?.cpf_ma ?? 0)}
        totalLiabilities={Number(profile?.total_liabilities ?? 0)}
        userId={user!.id}
      />
    </div>
    </PageWrapper>
  )
}
