import { createClient } from '@/lib/supabase/server'
import MPCIBuilder from '@/components/tools/MPCIBuilder'

export default async function MPCIPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('client_profiles')
    .select('preferred_name, monthly_income, retirement_age')
    .eq('user_id', user!.id)
    .single()

  return (
    <div style={{ padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 48px)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 8px' }}>
          Protection Analysis
        </p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#2a1f1a', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          MPCI Scenario Builder
        </h1>
        <p style={{ fontSize: 14, color: '#a89070', margin: 0 }}>
          Project critical illness payouts across multiple claims. Built for review sessions.
        </p>
      </div>
      <MPCIBuilder clientName={profile?.preferred_name ?? 'Client'} />
    </div>
  )
}
