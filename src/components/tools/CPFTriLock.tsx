'use client'

import { useMemo } from 'react'

interface Props {
  cpfOa: number
  cpfSa: number
  currentAge: number
  retirementAge?: number
}

// CPF 2024 Retirement Sum tiers (set at 55) — CPF Board figures
const BRS_2024 = 102_900
const FRS_2024 = 205_800
const ERS_2024 = 308_700  // 1.5× FRS

// FRS grows ~3.5%/yr historically (2020–2025 average). Project forward to user's age-55.
function projectFRS(currentAge: number) {
  const yearsTo55 = Math.max(0, 55 - currentAge)
  const growth = Math.pow(1.035, yearsTo55)
  return {
    brs: Math.round(BRS_2024 * growth),
    frs: Math.round(FRS_2024 * growth),
    ers: Math.round(ERS_2024 * growth),
  }
}

// Approximate CPF Life monthly payouts at 65 (Standard Plan, 2024 figures from CPF Board)
// Scale proportionally with projected FRS growth
const PAYOUT_2024: Record<string, number> = {
  brs: 870,
  frs: 1590,
  ers: 2310,
}

function formatM(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${Math.round(v)}`
}

function formatSGD(v: number): string {
  return `S$${v.toLocaleString('en-SG', { maximumFractionDigits: 0 })}`
}

export default function CPFTriLock({ cpfOa, cpfSa, currentAge, retirementAge = 65 }: Props) {
  const { raAt55 } = useMemo(() => {
    const yearsTo55 = Math.max(0, 55 - currentAge)

    // SA grows at 4%, OA at 2.5%
    const saAt55 = cpfSa * Math.pow(1.04, yearsTo55)
    const oaAt55 = cpfOa * Math.pow(1.025, yearsTo55)

    // RA at 55: SA first, then OA (capped at projected ERS)
    const { ers: ersProjected } = projectFRS(currentAge)
    const raAt55 = Math.min(saAt55 + oaAt55, ersProjected)

    return { raAt55 }
  }, [cpfOa, cpfSa, currentAge])

  // Project FRS tiers to user's age-55
  const frsAt55 = projectFRS(currentAge)

  // Scale payouts proportionally with FRS growth vs 2024
  const payoutScale = frsAt55.frs / FRS_2024
  const PAYOUT = {
    brs: Math.round(PAYOUT_2024.brs * payoutScale),
    frs: Math.round(PAYOUT_2024.frs * payoutScale),
    ers: Math.round(PAYOUT_2024.ers * payoutScale),
  }

  // Which tier are they on track for at 55?
  const onTrackFor =
    raAt55 >= frsAt55.ers ? 'ers' :
    raAt55 >= frsAt55.frs ? 'frs' :
    raAt55 >= frsAt55.brs ? 'brs' : 'below'

  const tiers = [
    {
      id: 'brs',
      name: 'Basic',
      abbr: 'BRS',
      target: frsAt55.brs,
      monthlyPayout: PAYOUT.brs,
      desc: 'With property pledge. Leaves OA balance free.',
      color: '#a89070',
    },
    {
      id: 'frs',
      name: 'Full',
      abbr: 'FRS',
      target: frsAt55.frs,
      monthlyPayout: PAYOUT.frs,
      desc: 'Standard target. Full CPF Life annuity.',
      color: '#7a1c2e',
    },
    {
      id: 'ers',
      name: 'Enhanced',
      abbr: 'ERS',
      target: frsAt55.ers,
      monthlyPayout: PAYOUT.ers,
      desc: '1.5× FRS. Maximises monthly payouts.',
      color: '#c4a882',
    },
  ]

  const topTierUnlocked = onTrackFor !== 'below'
  const nextTier = onTrackFor === 'below' ? tiers[0]
    : onTrackFor === 'brs' ? tiers[1]
    : onTrackFor === 'frs' ? tiers[2]
    : null

  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(42,31,26,0.07)',
      borderRadius: 14,
      padding: '28px 28px 24px',
    }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: '#c4a882',
          margin: '0 0 6px', fontFamily: "'Cabinet Grotesk', sans-serif",
        }}>
          CPF Tri-Lock
        </p>
        <p style={{
          fontFamily: "'Playfair Display', serif", fontSize: 18,
          fontWeight: 700, color: '#2a1f1a', margin: '0 0 4px',
        }}>
          Retirement Sum Tiers
        </p>
        <p style={{ fontSize: 13, color: '#a89070', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Which CPF Life tier will your CPF unlock at 55?{currentAge < 55 ? ` Targets projected to ${new Date().getFullYear() + Math.max(0, 55 - currentAge)}.` : ''}{' '}
          Estimated RA at 55: <strong style={{ color: '#2a1f1a' }}>{formatSGD(Math.round(raAt55))}</strong>
        </p>
      </div>

      {/* Tier cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {tiers.map((tier) => {
          const isActive = onTrackFor === tier.id
          const isBelow = raAt55 < tier.target
          const progress = Math.min(100, (raAt55 / tier.target) * 100)

          return (
            <div
              key={tier.id}
              style={{
                border: `1.5px solid ${isActive ? tier.color : 'rgba(42,31,26,0.10)'}`,
                borderRadius: 12,
                padding: '18px 18px 16px',
                background: isActive ? `rgba(${tier.id === 'frs' ? '122,28,46' : tier.id === 'ers' ? '196,168,130' : '168,144,112'},0.05)` : '#fdf8f2',
                position: 'relative',
                transition: 'all 0.2s',
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute', top: -1, right: 10,
                  background: tier.color, color: '#fff',
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                  padding: '3px 8px', borderRadius: '0 0 6px 6px',
                  fontFamily: "'Cabinet Grotesk', sans-serif",
                }}>
                  ON TRACK
                </div>
              )}

              <p style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: tier.color,
                margin: '0 0 4px', fontFamily: "'Cabinet Grotesk', sans-serif",
              }}>
                {tier.abbr}
              </p>
              <p style={{
                fontFamily: "'Playfair Display', serif", fontSize: 20,
                fontWeight: 700, color: '#2a1f1a', margin: '0 0 2px',
              }}>
                {formatM(tier.target)}
              </p>
              <p style={{ fontSize: 12, color: '#a89070', margin: '0 0 12px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                {tier.desc}
              </p>

              {/* Progress bar */}
              <div style={{
                height: 6, background: 'rgba(42,31,26,0.08)',
                borderRadius: 3, overflow: 'hidden', marginBottom: 10,
              }}>
                <div style={{
                  height: '100%', width: `${progress}%`,
                  background: isActive ? tier.color : 'rgba(42,31,26,0.2)',
                  borderRadius: 3, transition: 'width 0.6s ease',
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#2a1f1a', fontWeight: 600, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  ~{formatSGD(tier.monthlyPayout)}/mo
                </span>
                {isBelow ? (
                  <span style={{ fontSize: 11, color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                    +{formatM(tier.target - raAt55)} needed
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                    ✓ Unlocked
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary row */}
      <div style={{
        background: 'rgba(42,31,26,0.03)',
        border: '1px solid rgba(42,31,26,0.07)',
        borderRadius: 10, padding: '14px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          <p style={{ fontSize: 11, color: '#a89070', margin: '0 0 3px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Estimated CPF Life payout at 65
          </p>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#2a1f1a', margin: 0, fontFamily: "'Playfair Display', serif" }}>
            {formatSGD(onTrackFor !== 'below' ? PAYOUT[onTrackFor] : 0)}/mo
          </p>
        </div>
        {nextTier && (
          <div style={{ fontFamily: "'Cabinet Grotesk', sans-serif", textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: '#a89070', margin: '0 0 3px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              To unlock {nextTier.abbr}
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#7a1c2e', margin: 0 }}>
              Top up {formatSGD(Math.round(nextTier.target - raAt55))} more
            </p>
          </div>
        )}
        {!nextTier && topTierUnlocked && (
          <div style={{ fontFamily: "'Cabinet Grotesk', sans-serif", textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: '#16a34a', margin: 0, fontWeight: 700 }}>
              ✓ ERS unlocked — maximum CPF Life tier
            </p>
          </div>
        )}
      </div>

      <p style={{
        fontSize: 11, color: '#a89070', margin: '14px 0 0',
        fontFamily: "'Cabinet Grotesk', sans-serif", lineHeight: 1.5,
      }}>
        * Retirement Sum targets are projected at 3.5%/yr from 2024 figures (BRS $102.9K / FRS $205.8K / ERS $308.7K) to your age-55 year. CPF Life payouts are scaled proportionally and are illustrative — actual payouts depend on cohort, health, and plan choice. RA is formed at 55 from SA first, then OA.
      </p>
    </div>
  )
}
