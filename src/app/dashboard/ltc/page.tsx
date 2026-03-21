import LTCGapCalculator from '@/components/tools/LTCGapCalculator'

export default function LTCPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p
          style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#a89070',
            marginBottom: '0.5rem',
          }}
        >
          Long-Term Care
        </p>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '2.25rem',
            fontWeight: 700,
            color: '#2a1f1a',
            margin: '0 0 0.5rem',
            lineHeight: 1.2,
          }}
        >
          LTC Gap Analysis
        </h1>
        <p
          style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontSize: '1rem',
            color: '#a89070',
            margin: 0,
          }}
        >
          Understanding the cost of extended care and the gap CareShield covers.
        </p>
      </div>

      <LTCGapCalculator />
    </div>
  )
}
