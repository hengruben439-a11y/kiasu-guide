import Link from 'next/link'
import { GapItem, SEVERITY_STYLES } from '@/lib/scoring'

interface Props {
  gaps: GapItem[]
  title?: string
}

export default function PlanLinksBar({ gaps, title = 'Also in your plan' }: Props) {
  const visible = gaps.filter(g => g.severity !== 'good')
  if (visible.length === 0) return null

  return (
    <div style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid rgba(196,168,130,0.1)' }}>
      <p style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: '#c4a882', margin: '0 0 12px',
        fontFamily: "'Cabinet Grotesk', sans-serif",
      }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.map(gap => {
          const s = SEVERITY_STYLES[gap.severity]
          return (
            <div key={gap.id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 16px', borderRadius: 10,
              background: s.bg, border: `1px solid ${s.border}`,
              borderLeft: `3px solid ${s.dot}`,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fdf8f2', fontFamily: "'Playfair Display', serif" }}>
                    {gap.title}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                    textTransform: 'uppercase', padding: '2px 7px', borderRadius: 5,
                    background: s.badge, color: s.text,
                  }}>
                    {gap.severity === 'critical' ? 'Critical' : 'Attention'}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.55)', margin: 0, lineHeight: 1.4 }}>
                  {gap.consequence}
                </p>
              </div>
              <Link href={gap.href} style={{
                fontSize: 12, fontWeight: 600, color: s.text,
                textDecoration: 'none', flexShrink: 0,
              }}>
                {gap.cta} →
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
