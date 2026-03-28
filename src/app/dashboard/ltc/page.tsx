import { createClient } from '@/lib/supabase/server'
import { PageWrapper } from '@/components/layout/PageWrapper'
import LTCGapCalculator from '@/components/tools/LTCGapCalculator'

export default async function LTCPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch existing LTC/CareShield coverage from benefit_blocks
  let initialLtcCoverage: number | undefined
  if (user) {
    const { data: ltcBlocks } = await supabase
      .from('benefit_blocks')
      .select('coverage, payout_mode')
      .eq('user_id', user.id)
      .eq('enabled', true)
      .in('benefit_type', ['careshield', 'ltc'])

    if (ltcBlocks && ltcBlocks.length > 0) {
      // Sum monthly coverage from all LTC policies
      initialLtcCoverage = ltcBlocks.reduce((sum, b) => {
        // Monthly policies count directly; lump-sum converted to monthly equivalent (not used for LTC)
        return sum + (b.payout_mode === 'monthly' || b.payout_mode === null ? Number(b.coverage) : 0)
      }, 0)
    }
  }

  return (
    <PageWrapper>
      <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(253,248,242,0.5)', marginBottom: '0.5rem' }}>
            Long-Term Care
          </p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.25rem', fontWeight: 700, color: '#fdf8f2', margin: '0 0 0.5rem', lineHeight: 1.2 }}>
            LTC Gap Analysis
          </h1>
          <p style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: '1rem', color: 'rgba(253,248,242,0.5)', margin: 0 }}>
            Understanding the cost of extended care and how your existing coverage stacks up.
            {initialLtcCoverage !== undefined && initialLtcCoverage > 0 && (
              <span style={{ color: '#c4a882', marginLeft: 8 }}>
                Loaded S${initialLtcCoverage.toLocaleString('en-SG')}/mo from your insurance policies.
              </span>
            )}
          </p>
        </div>

        <LTCGapCalculator initialLtcCoverage={initialLtcCoverage} />
      </div>
    </PageWrapper>
  )
}
