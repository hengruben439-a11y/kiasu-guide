import { createClient } from '@/lib/supabase/server'
import BMICalculator from '@/components/tools/BMICalculator'

export default async function BMIPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('client_profiles')
    .select('height_cm, weight_kg, sex')
    .eq('user_id', user!.id)
    .single()

  return (
    <div style={{ padding: 'clamp(20px, 4vw, 40px) clamp(16px, 4vw, 48px)', fontFamily: "'Cabinet Grotesk', sans-serif", maxWidth: 600 }}>
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 8px' }}>
          Health Metrics
        </p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#fdf8f2', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          BMI Calculator
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(253,248,242,0.5)', margin: 0 }}>
          Uses Asian-standard BMI thresholds per Ministry of Health Singapore.
        </p>
      </div>
      <BMICalculator
        initialHeight={Number(profile?.height_cm) || null}
        initialWeight={Number(profile?.weight_kg) || null}
        userId={user!.id}
      />
    </div>
  )
}
