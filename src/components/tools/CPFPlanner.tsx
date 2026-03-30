'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCountUp } from '@/lib/hooks/use-count-up'
import SliderInput from '@/components/ui/SliderInput'
import AIInsightPanel from '@/components/ui/AIInsightPanel'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'

// ─── CPF constants (Singapore 2024) ──────────────────────────────────────────
// Contribution rates are age-tiered per CPF Board 2024 schedule
// Source: cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay
const CPF_RATES: { maxAge: number; employee: number; total: number }[] = [
  { maxAge: 55,  employee: 0.20, total: 0.37 },
  { maxAge: 60,  employee: 0.13, total: 0.28 },
  { maxAge: 65,  employee: 0.075, total: 0.19 },
  { maxAge: 999, employee: 0.05,  total: 0.125 },
]
function getCPFRates(age: number) {
  return CPF_RATES.find(r => age <= r.maxAge) ?? CPF_RATES[CPF_RATES.length - 1]
}

// Allocation percentages (age ≤ 55; simplified — OA/SA/MA allocation also
// shifts by age but the below is the primary working-age split)
const OA_PCT = 0.6217
const SA_PCT = 0.1621
const MA_PCT = 0.2162
const OA_INTEREST = 0.025
const SA_INTEREST = 0.04
const MA_INTEREST = 0.04
const FRS_2024 = 205800
const BHS_2024 = 71500   // Basic Healthcare Sum — MA capped here, excess → SA/OA
const RSTU_CASH_CAP = 8000 // RSTU cash top-up annual cap (for yourself)

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(v: number) {
  if (v >= 1_000_000) return `S$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `S$${(v / 1_000).toFixed(0)}K`
  return `S$${v.toFixed(0)}`
}
function fmtFull(v: number) {
  return `S$${Math.round(v).toLocaleString('en-SG')}`
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface Props {
  cpfOa: number
  cpfSa: number
  cpfMa: number
  monthlyIncome: number
  retirementAge: number
  currentAge: number
  desiredMonthlyIncome: number
  inflationRate: number
}

interface YearPoint {
  age: number
  oa: number
  sa: number
  ma: number
  ra: number
}

// ─── Projection engine ───────────────────────────────────────────────────────
function project(
  cpfOa: number,
  cpfSa: number,
  cpfMa: number,
  monthlyIncome: number,
  currentAge: number,
  retirementAge: number,
  annualTopup: number,
): YearPoint[] {
  let oa = cpfOa
  let sa = cpfSa
  let ma = cpfMa
  let ra = 0

  const points: YearPoint[] = [{ age: currentAge, oa, sa, ma, ra }]

  for (let yr = 1; yr <= retirementAge - currentAge; yr++) {
    const age = currentAge + yr

    // Age-tiered contribution rates
    const rates = getCPFRates(age)
    const gross = monthlyIncome > 0 ? (monthlyIncome * 12) / (1 - rates.employee) : 0
    const annualContrib = gross * rates.total

    if (age <= 55) {
      // Standard OA/SA/MA split
      oa += annualContrib * OA_PCT
      // RSTU top-up capped at S$8,000/year cash
      sa += annualContrib * SA_PCT + Math.min(annualTopup, RSTU_CASH_CAP)
      const maContrib = annualContrib * MA_PCT
      // BHS cap: excess MA contributions flow to SA (pre-55)
      const maRoom = Math.max(0, BHS_2024 - ma)
      ma += Math.min(maContrib, maRoom)
      sa += Math.max(0, maContrib - maRoom)
    } else {
      // Post-55: contributions go mainly to OA; RA already formed
      oa += annualContrib
    }

    // Interest
    oa += oa * OA_INTEREST
    sa += sa * SA_INTEREST
    ma = Math.min(ma * (1 + MA_INTEREST), BHS_2024) // MA interest but stays capped

    // RA formation at 55 — can go up to ERS (1.5× FRS) with top-ups
    if (age === 55) {
      const ERS = FRS_2024 * 1.5
      const prevSa = sa
      ra = Math.min(sa + oa, ERS)
      sa = Math.max(0, prevSa - ra)
      oa = Math.max(0, oa - Math.max(0, ra - prevSa))
    } else if (age > 55) {
      ra += ra * SA_INTEREST
    }

    points.push({ age, oa: Math.round(oa), sa: Math.round(sa), ma: Math.round(ma), ra: Math.round(ra) })
  }

  return points
}

// useCountUp imported from @/lib/hooks/use-count-up

// ─── Custom tooltip ──────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: number }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(10,6,5,0.95)', border: '1px solid rgba(196,168,130,0.2)',
      borderRadius: 10, padding: '12px 16px',
      fontFamily: "'Cabinet Grotesk', sans-serif", boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#c4a882', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Age {label}
      </p>
      {payload.map((p) => p.value > 0 && (
        <p key={p.name} style={{ fontSize: 13, margin: '3px 0', color: '#fdf8f2' }}>
          <span style={{ color: p.color, marginRight: 6 }}>■</span>
          {p.name}: <strong>{fmt(p.value)}</strong>
        </p>
      ))}
    </div>
  )
}

// ─── Progress ring ───────────────────────────────────────────────────────────
function ProgressRing({ pct, size = 96, stroke = 8, color = '#7a1c2e' }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(196,168,130,0.1)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CPFPlanner(props: Props) {
  const [annualTopup, setAnnualTopup] = useState(0)
  const [selectedTier, setSelectedTier] = useState<'brs' | 'frs' | 'ers' | null>(null)
  const safeAge = Math.max(18, Math.min(props.currentAge, props.retirementAge - 1))

  // Project BRS/FRS/ERS targets to user's age 55
  const yearsTo55 = Math.max(0, 55 - safeAge)
  const tierTargets = {
    brs: Math.round(102900 * Math.pow(1.035, yearsTo55)),
    frs: Math.round(205800 * Math.pow(1.035, yearsTo55)),
    ers: Math.round(308700 * Math.pow(1.035, yearsTo55)),
  }

  // Base projection (no top-up)
  const basePoints = useMemo(
    () => project(props.cpfOa, props.cpfSa, props.cpfMa, props.monthlyIncome, safeAge, props.retirementAge, 0),
    [props.cpfOa, props.cpfSa, props.cpfMa, props.monthlyIncome, safeAge, props.retirementAge],
  )

  // Top-up projection
  const topupPoints = useMemo(
    () => project(props.cpfOa, props.cpfSa, props.cpfMa, props.monthlyIncome, safeAge, props.retirementAge, annualTopup),
    [props.cpfOa, props.cpfSa, props.cpfMa, props.monthlyIncome, safeAge, props.retirementAge, annualTopup],
  )

  const baseRetirement = basePoints[basePoints.length - 1]
  const topupRetirement = topupPoints[topupPoints.length - 1]

  // CPF Life monthly payout: RA × 0.0081 (consistent with CPF Board Standard Plan ratio)
  const baseRA = baseRetirement.ra > 0 ? baseRetirement.ra : baseRetirement.sa
  const topupRA = topupRetirement.ra > 0 ? topupRetirement.ra : topupRetirement.sa
  const baseCpfLife = baseRA * 0.0081
  const topupCpfLife = topupRA * 0.0081
  const cpfLifeMonthly = annualTopup > 0 ? topupCpfLife : baseCpfLife
  const topupDelta = topupCpfLife - baseCpfLife
  // Detect ERS cap — if topup RA equals base RA, the cap prevented any additional benefit
  const ersCapHit = annualTopup > 0 && Math.abs(topupRA - baseRA) < 1

  // Inflation-adjusted desired income
  const yearsToRet = props.retirementAge - safeAge
  const adjDesired = props.desiredMonthlyIncome * Math.pow(1 + props.inflationRate, yearsToRet)
  const coveragePct = adjDesired > 0 ? Math.min(100, (cpfLifeMonthly / adjDesired) * 100) : 0
  const coveragePctBase = adjDesired > 0 ? Math.min(100, (baseCpfLife / adjDesired) * 100) : 0

  const animatedPayout = useCountUp(Math.round(cpfLifeMonthly))
  const animatedCoverage = useCountUp(Math.round(coveragePct))

  // Chart data — combine base & topup
  const chartData = useMemo(() => {
    return topupPoints.map((pt) => ({
      age: pt.age,
      oa: pt.oa,
      sa: pt.sa,
      ma: pt.ma,
      ra: pt.ra,
    }))
  }, [topupPoints])

  // Find the RA formation age (55 or retirement, whichever applies)
  const raFormAge = safeAge <= 55 ? 55 : null

  // Find age at which user's projected SA hits the selected tier's RA target
  const tierHitAge = useMemo(() => {
    if (!selectedTier) return null
    const target = tierTargets[selectedTier]
    for (const pt of topupPoints) {
      const total = pt.ra > 0 ? pt.ra : pt.sa + pt.oa
      if (total >= target) return pt.age
    }
    return null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTier, topupPoints, tierTargets.brs, tierTargets.frs, tierTargets.ers])

  // Balance summary cards
  const ret = topupRetirement
  const cards = [
    { label: 'OA at Retirement', value: fmtFull(ret.oa), color: '#c4a882', sub: '2.5% p.a.' },
    { label: 'SA at Retirement', value: fmtFull(ret.sa), color: '#8b5a6a', sub: '4.0% p.a.' },
    { label: 'MA at Retirement', value: fmtFull(ret.ma), color: '#a89070', sub: '4.0% p.a.' },
    { label: 'RA at Retirement', value: fmtFull(ret.ra || topupRA), color: '#7a1c2e', sub: 'Formed at 55' },
  ]

  const portfolioGapMonthly = Math.max(0, adjDesired - cpfLifeMonthly)
  const portfolioGapPct = adjDesired > 0 ? Math.round((portfolioGapMonthly / adjDesired) * 100) : 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── How CPF fits your plan ── */}
      {props.desiredMonthlyIncome > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            background: 'rgba(122,28,46,0.04)', border: '1px solid rgba(122,28,46,0.15)',
            borderRadius: 14, padding: '24px 28px',
          }}
        >
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 12px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            How CPF Fits Your Retirement Plan
          </p>
          <div className="grid-2col" style={{ gap: 20 }}>
            {/* Guaranteed Floor */}
            <div style={{
              background: 'rgba(122,28,46,0.06)', border: '1px solid rgba(122,28,46,0.12)',
              borderRadius: 10, padding: '18px 22px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '3px 8px', borderRadius: 5, background: 'rgba(22,163,74,0.12)', color: '#16a34a',
                }}>Guaranteed Floor</span>
              </div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#7a1c2e', margin: '0 0 4px' }}>
                {fmtFull(cpfLifeMonthly)}<span style={{ fontSize: 14, color: '#a89070', marginLeft: 4 }}>/mo</span>
              </p>
              <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.5)', margin: '0 0 8px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                CPF Life payout — guaranteed for life
              </p>
              <div style={{ background: 'rgba(253,248,242,0.06)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, background: '#16a34a', width: `${Math.min(100, 100 - portfolioGapPct)}%`, transition: 'width 0.6s ease' }} />
              </div>
              <p style={{ fontSize: 10, color: 'rgba(253,248,242,0.5)', margin: '4px 0 0', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Covers {Math.round(100 - portfolioGapPct)}% of desired retirement income
              </p>
            </div>

            {/* Growth Layer */}
            <div style={{
              background: 'rgba(217,119,6,0.04)', border: '1px solid rgba(217,119,6,0.12)',
              borderRadius: 10, padding: '18px 22px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '3px 8px', borderRadius: 5, background: 'rgba(217,119,6,0.12)', color: '#d97706',
                }}>Growth Layer</span>
              </div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#fdf8f2', margin: '0 0 4px' }}>
                {fmtFull(portfolioGapMonthly)}<span style={{ fontSize: 14, color: 'rgba(253,248,242,0.5)', marginLeft: 4 }}>/mo</span>
              </p>
              <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.5)', margin: '0 0 8px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Gap your investment portfolio must fill
              </p>
              <div style={{ background: 'rgba(253,248,242,0.06)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, background: '#d97706', width: `${Math.min(100, portfolioGapPct)}%`, transition: 'width 0.6s ease' }} />
              </div>
              <p style={{ fontSize: 10, color: 'rgba(253,248,242,0.5)', margin: '4px 0 0', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                {portfolioGapPct}% of desired {fmtFull(adjDesired)}/mo (inflation-adjusted)
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Balance cards (staggered) ── */}
      <div className="grid-4col" style={{ gap: 16 }}>
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: 'easeOut' }}
            style={{
              background: 'rgba(122,28,46,0.06)', borderRadius: 14,
              border: '1px solid rgba(196,168,130,0.15)',
              padding: '20px 22px',
              backdropFilter: 'blur(12px)',
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 8px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              {c.label}
            </p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: c.color, margin: '0 0 4px' }}>
              {c.value}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.5)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              {c.sub}
            </p>
          </motion.div>
        ))}
      </div>

      {/* ── CPF Life payout + coverage ── */}
      <div className="grid-2col" style={{ gap: 20 }}>

        {/* CPF Life payout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          style={{
            background: 'rgba(122,28,46,0.06)', border: '1px solid rgba(196,168,130,0.15)',
            borderRadius: 14, padding: '28px 32px',
            backdropFilter: 'blur(12px)',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c4a882', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Estimated CPF Life Payout
          </p>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 700, color: '#9b2040', margin: 0, lineHeight: 1.1 }}>
            S${animatedPayout.toLocaleString('en-SG')}
            <span style={{ fontSize: 16, fontFamily: "'Cabinet Grotesk', sans-serif", color: 'rgba(253,248,242,0.5)', marginLeft: 6 }}>/mo</span>
          </p>
          <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.5)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            At retirement age {props.retirementAge} · Standard Plan estimate
          </p>
          {annualTopup > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ fontSize: 13, color: '#16a34a', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 600 }}
            >
              +S${Math.round(topupDelta).toLocaleString('en-SG')}/mo from top-up
            </motion.p>
          )}
        </motion.div>

        {/* Coverage ring */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.43, duration: 0.4 }}
          style={{
            background: 'rgba(122,28,46,0.06)', border: '1px solid rgba(196,168,130,0.15)',
            borderRadius: 14, padding: '28px 32px',
            backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', gap: 24,
          }}
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <ProgressRing pct={coveragePct} size={96} stroke={8} color={coveragePct >= 80 ? '#16a34a' : coveragePct >= 50 ? '#d97706' : '#9b2040'} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#fdf8f2' }}>{animatedCoverage}%</span>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 6px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              CPF Coverage
            </p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#fdf8f2', margin: '0 0 4px' }}>
              of desired income
            </p>
            <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.5)', margin: '0 0 8px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Target: {fmtFull(adjDesired)}/mo (inflation-adj.)
            </p>
            <motion.div style={{ background: 'rgba(253,248,242,0.06)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${coveragePct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ height: '100%', borderRadius: 99, background: coveragePct >= 80 ? '#16a34a' : coveragePct >= 50 ? '#d97706' : '#7a1c2e' }}
              />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* ── Stacked area chart ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        style={{ background: 'rgba(122,28,46,0.06)', border: '1px solid rgba(196,168,130,0.15)', borderRadius: 14, padding: '24px 28px', backdropFilter: 'blur(12px)' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: '#fdf8f2', margin: '0 0 4px' }}>
              CPF Balance Projection — Age {safeAge} to {props.retirementAge}
            </p>
            <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.5)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              OA · SA · MA · RA (formed at 55)
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: 'rgba(196,168,130,0.5)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>Tier target:</span>
            {([
              { id: 'brs' as const, label: 'BRS', color: '#f59e0b', target: tierTargets.brs },
              { id: 'frs' as const, label: 'FRS', color: '#10b981', target: tierTargets.frs },
              { id: 'ers' as const, label: 'ERS', color: '#0ea5e9', target: tierTargets.ers },
            ]).map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTier(selectedTier === t.id ? null : t.id)}
                style={{
                  padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontFamily: "'Cabinet Grotesk', sans-serif",
                  fontSize: 11, fontWeight: 700,
                  background: selectedTier === t.id ? `${t.color}22` : 'rgba(196,168,130,0.08)',
                  color: selectedTier === t.id ? t.color : 'rgba(253,248,242,0.4)',
                  outline: selectedTier === t.id ? `1px solid ${t.color}50` : '1px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {selectedTier && (
          <div style={{ marginBottom: 12, padding: '8px 14px', borderRadius: 8, background: 'rgba(196,168,130,0.06)', border: '1px solid rgba(196,168,130,0.12)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            <span style={{ fontSize: 11, color: 'rgba(253,248,242,0.55)' }}>
              {selectedTier.toUpperCase()} target (age 55): <strong style={{ color: '#fdf8f2' }}>{fmt(tierTargets[selectedTier])}</strong>
              {tierHitAge !== null
                ? tierHitAge <= 55
                  ? <> · <span style={{ color: '#10b981' }}>You&apos;re already on track ✓</span></>
                  : <> · At your current pace, you&apos;ll hit {selectedTier.toUpperCase()} at <strong style={{ color: '#10b981' }}>age {tierHitAge}</strong></>
                : <> · <span style={{ color: '#ef4444' }}>You won&apos;t reach {selectedTier.toUpperCase()} by 55 — top up SA to close the gap</span></>
              }
            </span>
          </div>
        )}
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="gOA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c4a882" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#c4a882" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gSA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5a6a" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#8b5a6a" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gMA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a89070" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#a89070" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="gRA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7a1c2e" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#7a1c2e" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <XAxis dataKey="age" tick={{ fontSize: 10, fill: 'rgba(253,248,242,0.35)', fontFamily: "'Cabinet Grotesk', sans-serif" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: 'rgba(253,248,242,0.35)', fontFamily: "'Cabinet Grotesk', sans-serif" }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            {raFormAge && (
              <ReferenceLine
                x={raFormAge}
                stroke="rgba(122,28,46,0.4)"
                strokeDasharray="6 3"
                label={{ value: 'RA formed', position: 'top', fontSize: 10, fill: '#7a1c2e', fontFamily: "'Cabinet Grotesk', sans-serif" }}
              />
            )}
            {selectedTier && (() => {
              const tierColors = { brs: '#f59e0b', frs: '#10b981', ers: '#0ea5e9' }
              const color = tierColors[selectedTier]
              return (
                <ReferenceLine
                  y={tierTargets[selectedTier]}
                  stroke={color}
                  strokeDasharray="5 3"
                  strokeWidth={1.5}
                  label={{ value: `${selectedTier.toUpperCase()} ${fmt(tierTargets[selectedTier])}`, position: 'insideTopRight', fill: color, fontSize: 10, fontFamily: "'Cabinet Grotesk', sans-serif" }}
                />
              )
            })()}
            <Area type="monotone" dataKey="oa" name="OA" stroke="#c4a882" fill="url(#gOA)" strokeWidth={2} stackId="a" isAnimationActive={true} animationDuration={1200} />
            <Area type="monotone" dataKey="sa" name="SA" stroke="#8b5a6a" fill="url(#gSA)" strokeWidth={2} stackId="a" isAnimationActive={true} animationDuration={1200} />
            <Area type="monotone" dataKey="ma" name="MA" stroke="#a89070" fill="url(#gMA)" strokeWidth={2} stackId="a" isAnimationActive={true} animationDuration={1200} />
            <Area type="monotone" dataKey="ra" name="RA" stroke="#7a1c2e" fill="url(#gRA)" strokeWidth={2} stackId="a" isAnimationActive={true} animationDuration={1200} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* ── Voluntary top-up slider ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        style={{ background: 'rgba(122,28,46,0.06)', border: '1px solid rgba(196,168,130,0.15)', borderRadius: 14, padding: '24px 28px', backdropFilter: 'blur(12px)' }}
      >
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 6px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Voluntary SA Top-Up Simulator
        </p>
        <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.5)', margin: '0 0 20px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          See how annual RSTU contributions boost your CPF Life payout at retirement.
        </p>
        <div style={{ marginBottom: 20 }}>
          <SliderInput
            label="Annual SA Top-Up"
            value={annualTopup}
            min={0}
            max={RSTU_CASH_CAP}
            step={500}
            format={(v) => `S$${v.toLocaleString('en-SG')}`}
            onChange={setAnnualTopup}
            unit="/ yr"
            tooltip="Retirement Sum Top-Up Scheme — cash top-up to your SA (max S$8,000/yr for tax relief)"
          />
        </div>
        <AnimatePresence mode="wait">
          {annualTopup > 0 ? (
            <motion.div
              key="topup-active"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              style={{
                background: ersCapHit ? 'rgba(245,158,11,0.06)' : 'rgba(22,163,74,0.06)',
                border: `1px solid ${ersCapHit ? 'rgba(245,158,11,0.25)' : 'rgba(22,163,74,0.2)'}`,
                borderRadius: 10, padding: '16px 20px',
                fontFamily: "'Cabinet Grotesk', sans-serif",
              }}
            >
              {ersCapHit ? (
                <>
                  <p style={{ fontSize: 13, color: '#f59e0b', margin: 0, lineHeight: 1.6, fontWeight: 600 }}>
                    ERS cap reached — top-up has no additional effect
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.5)', margin: '6px 0 0', lineHeight: 1.5 }}>
                    Your projected SA + OA at age 55 already exceeds the Enhanced Retirement Sum limit. SA top-ups won&apos;t increase your RA or CPF Life payout further.
                  </p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: '#fdf8f2', margin: 0, lineHeight: 1.6 }}>
                    Contributing <strong style={{ color: '#16a34a' }}>S${annualTopup.toLocaleString('en-SG')}/yr</strong> to SA now would increase your CPF Life payout by{' '}
                    <strong style={{ color: '#16a34a' }}>S${Math.round(topupDelta).toLocaleString('en-SG')}/mo</strong>{' '}
                    — that&apos;s <strong style={{ color: '#16a34a' }}>S${Math.round(topupDelta * 12).toLocaleString('en-SG')}/yr</strong> more in retirement.
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.5)', margin: '6px 0 0', lineHeight: 1.5 }}>
                    Base CPF Life: {fmtFull(baseCpfLife)}/mo → With top-up: {fmtFull(topupCpfLife)}/mo
                  </p>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="topup-idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                background: 'rgba(196,168,130,0.07)', border: '1px dashed rgba(196,168,130,0.3)',
                borderRadius: 10, padding: '16px 20px',
                fontFamily: "'Cabinet Grotesk', sans-serif",
              }}
            >
              <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.5)', margin: 0 }}>
                Slide above to see the impact of voluntary SA top-ups on your CPF Life monthly payout.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Coverage improvement when topup active */}
        {annualTopup > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <span style={{ fontSize: 12, color: 'rgba(253,248,242,0.5)', fontFamily: "'Cabinet Grotesk', sans-serif", minWidth: 120 }}>
              Coverage improvement
            </span>
            <div style={{ flex: 1, background: 'rgba(253,248,242,0.06)', borderRadius: 99, height: 8, overflow: 'hidden', position: 'relative' }}>
              <motion.div
                style={{ height: '100%', borderRadius: 99, background: 'rgba(253,248,242,0.12)', position: 'absolute', left: 0 }}
                initial={{ width: `${coveragePctBase}%` }}
                animate={{ width: `${coveragePctBase}%` }}
              />
              <motion.div
                style={{ height: '100%', borderRadius: 99, background: '#16a34a', position: 'absolute', left: 0 }}
                initial={{ width: `${coveragePctBase}%` }}
                animate={{ width: `${Math.min(coveragePct, 100)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', fontFamily: "'Cabinet Grotesk', sans-serif", minWidth: 40 }}>
              {Math.round(coveragePct)}%
            </span>
          </motion.div>
        )}
      </motion.div>

      <AIInsightPanel
        tool="cpf"
        data={{
          cpfLifeMonthly: Math.round(cpfLifeMonthly),
          adjDesiredMonthly: Math.round(adjDesired),
          coveragePct: Math.round(coveragePct),
          raAtRetirement: ret.ra || topupRA,
          annualTopup,
          topupDeltaPerMonth: Math.round(topupDelta),
          yearsToRetirement: yearsToRet,
          retirementAge: props.retirementAge,
        }}
        autoRefresh
      />

    </div>
  )
}
