// Shared design tokens for dark glassmorphism cards
// Import and spread these into any card's `style` prop

export const cardStyle: React.CSSProperties = {
  background: 'rgba(122,28,46,0.06)',
  border: '1px solid rgba(196,168,130,0.15)',
  borderRadius: 16,
  padding: '1.5rem',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 0 0 1px rgba(196,168,130,0.08), 0 4px 24px rgba(122,28,46,0.12)',
  transition: 'box-shadow 0.2s, transform 0.2s',
}

export const cardHoverStyle: React.CSSProperties = {
  boxShadow: '0 0 0 1px rgba(196,168,130,0.22), 0 8px 32px rgba(122,28,46,0.22), 0 0 40px rgba(196,168,130,0.06)',
  transform: 'translateY(-2px)',
}

export const goldLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#c4a882',
  fontFamily: "'Cabinet Grotesk', sans-serif",
  margin: 0,
}

export const headlineNumber: React.CSSProperties = {
  fontFamily: "'Playfair Display', serif",
  fontWeight: 700,
  color: '#fdf8f2',
  lineHeight: 1.1,
}

export const secondaryText: React.CSSProperties = {
  fontSize: 13,
  color: 'rgba(253,248,242,0.55)',
  fontFamily: "'Cabinet Grotesk', sans-serif",
}

// Standard number formatter: S$1.87M, S$150K, S$500
export function formatSGD(v: number): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}S$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}S$${(abs / 1_000).toFixed(0)}K`
  return `${sign}S$${Math.round(abs).toLocaleString('en-SG')}`
}

export function formatSGDFull(v: number): string {
  return `S$${Math.round(v).toLocaleString('en-SG')}`
}
