'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import AIInsightPanel from '@/components/ui/AIInsightPanel'
import SliderInput from '@/components/ui/SliderInput'
import { monthlyRate } from '@/lib/tools/retirement/calculations'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  liquid_savings: number
  monthly_investment: number
  retirement_age: number
  target_return_rate: number
  desired_monthly_income: number
  dividend_yield: number
  currentAge: number
}

// ── Math ──────────────────────────────────────────────────────────────────────

function computePMT(corpus: number, savings: number, annualRate: number, years: number): number {
  if (years <= 0) return Infinity
  const r = monthlyRate(annualRate)
  const n = years * 12
  const fvExisting = r === 0 ? savings : savings * Math.pow(1 + r, n)
  const gap = corpus - fvExisting
  if (gap <= 0) return 0
  if (r === 0) return gap / n
  return Math.max(0, (gap * r) / (Math.pow(1 + r, n) - 1))
}

function buildProjection(savings: number, pmt: number, annualRate: number, totalYears: number, startOffset: number): number[] {
  const r = monthlyRate(annualRate)
  return Array.from({ length: totalYears + 1 }, (_, yr) => {
    if (yr <= startOffset) {
      const n = yr * 12
      return Math.round(r === 0 ? savings : savings * Math.pow(1 + r, n))
    }
    const yearsInvested = yr - startOffset
    const n = yearsInvested * 12
    const idleN = startOffset * 12
    const afterIdle = r === 0 ? savings : savings * Math.pow(1 + r, idleN)
    const fvSav = r === 0 ? afterIdle : afterIdle * Math.pow(1 + r, n)
    const fvCon = r === 0 ? pmt * n : pmt * ((Math.pow(1 + r, n) - 1) / r)
    return Math.round(fvSav + fvCon)
  })
}

// ── Count-up animation ────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0)
  const frameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)
  const startRef = useRef<number | null>(null)
  const startValueRef = useRef(0)

  useEffect(() => {
    startValueRef.current = value
    startRef.current = null
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(startValueRef.current + (target - startValueRef.current) * eased))
      if (progress < 1) frameRef.current = requestAnimationFrame(step)
    }
    frameRef.current = requestAnimationFrame(step)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return value
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`
  return `$${Math.round(v).toLocaleString()}`
}
function fmtFull(v: number): string {
  return `S$${Math.round(v).toLocaleString('en-SG')}`
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SCENARIOS = [
  { years: 0,  label: 'Start Now',     color: '#10b981', lineColor: '#10b981' },
  { years: 2,  label: 'Wait 2 Years',  color: '#f59e0b', lineColor: '#f59e0b' },
  { years: 5,  label: 'Wait 5 Years',  color: '#ef4444', lineColor: '#ef4444' },
]

// ── Chart tooltip ─────────────────────────────────────────────────────────────

function ChartTip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: number
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(10,6,5,0.95)', border: '1px solid rgba(196,168,130,0.2)',
      borderRadius: 10, padding: '10px 14px',
      fontFamily: "'Cabinet Grotesk', sans-serif",
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)', fontSize: 11,
    }}>
      <p style={{ fontWeight: 700, color: '#c4a882', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Age {label}</p>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, margin: '3px 0' }}>
          <span style={{ color: p.color }}>■ {p.name}</span>
          <strong style={{ color: '#fdf8f2' }}>{fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CostOfWaiting({
  liquid_savings, retirement_age, target_return_rate,
  desired_monthly_income, dividend_yield, currentAge,
}: Props) {
  const [sliderDelay, setSliderDelay] = useState(0)

  const swr = dividend_yield > 0 ? dividend_yield : 0.04
  const corpus = (desired_monthly_income * 12) / swr
  const yearsToRetirement = Math.max(1, retirement_age - currentAge)
  const maxSlider = Math.min(10, yearsToRetirement - 1)

  const pmtNow = computePMT(corpus, liquid_savings, target_return_rate, yearsToRetirement)

  const scenarios = SCENARIOS.map(s => {
    const pmt = computePMT(corpus, liquid_savings, target_return_rate, yearsToRetirement - s.years)
    const extra = s.years === 0 ? 0 : Math.max(0, pmt - pmtNow)
    const extraPct = pmtNow > 0 ? (extra / pmtNow) * 100 : 0
    return { ...s, pmt, extra, extraPct }
  })

  const sliderPmt = computePMT(corpus, liquid_savings, target_return_rate, yearsToRetirement - sliderDelay)
  const sliderExtra = Math.max(0, sliderPmt - pmtNow)
  const animatedExtra = useCountUp(Math.round(sliderExtra))

  // Chart data
  const chartData = Array.from({ length: yearsToRetirement + 1 }, (_, i) => {
    const age = currentAge + i
    const row: Record<string, number | string> = { age }
    scenarios.forEach(s => {
      const pmt = s.pmt === Infinity ? 0 : s.pmt
      const proj = buildProjection(liquid_savings, pmt, target_return_rate, yearsToRetirement, s.years)
      row[s.label] = proj[i] ?? 0
    })
    return row
  })

  const fiveYearExtra = scenarios.find(s => s.years === 5)?.extra ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Cabinet Grotesk', sans-serif" }}>

      {/* Page header */}
      <div style={{ marginBottom: 4 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 6px' }}>Cost of Waiting</p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#fdf8f2', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          Time is the one thing you can't buy back
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.50)', margin: 0 }}>
          Every year of delay doesn't just cost you now — it costs you compounding. Drag the slider to feel it.
        </p>
      </div>

      {/* Target corpus */}
      <div style={{
        background: 'rgba(122,28,46,0.08)',
        border: '1px solid rgba(196,168,130,0.2)',
        borderRadius: 14, padding: '20px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.6)', margin: '0 0 4px' }}>
            Your retirement target ({fmtFull(desired_monthly_income * 12)}/yr ÷ {(swr * 100).toFixed(1)}% SWR)
          </p>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#fdf8f2', margin: 0 }}>
            {fmtFull(corpus)}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.40)', margin: '0 0 4px' }}>Starting today, you need</p>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#10b981', margin: 0 }}>
            {pmtNow === Infinity ? 'Not achievable' : `${fmtFull(pmtNow)}/mo`}
          </p>
        </div>
      </div>

      {/* Scenario cards */}
      <div className="grid-3col" style={{ gap: 14 }}>
        {scenarios.map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: s.years === 0 ? 'rgba(16,185,129,0.08)' : 'rgba(10,6,5,0.5)',
              border: `1px solid ${s.years === 0 ? 'rgba(16,185,129,0.25)' : 'rgba(196,168,130,0.12)'}`,
              borderRadius: 14, padding: '18px 20px',
              borderLeft: `3px solid ${s.color}`,
            }}
          >
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: s.color, margin: '0 0 6px' }}>
              {s.label}
            </p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#fdf8f2', margin: '0 0 8px' }}>
              {s.pmt === Infinity ? 'Impossible' : `${fmtFull(s.pmt)}/mo`}
            </p>
            {s.years === 0 ? (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: 20 }}>
                Baseline — start now
              </span>
            ) : s.extra > 0 ? (
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: s.color, background: `${s.color}18`, padding: '2px 8px', borderRadius: 20 }}>
                  +{fmtFull(s.extra)}/mo more
                </span>
                <p style={{ fontSize: 10, color: 'rgba(253,248,242,0.40)', margin: '6px 0 0' }}>
                  {Math.round(s.extraPct)}% higher than starting now
                </p>
              </div>
            ) : null}
          </motion.div>
        ))}
      </div>

      {/* Delay slider — the emotional centrepiece */}
      <div style={{
        background: 'rgba(122,28,46,0.08)',
        border: '1px solid rgba(196,168,130,0.2)',
        borderRadius: 16, padding: '24px 28px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 4px' }}>Delay Simulator</p>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#fdf8f2', margin: 0 }}>
              What if I wait…
            </h3>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '5px 14px', borderRadius: 20,
            background: sliderDelay === 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
            color: sliderDelay === 0 ? '#10b981' : '#ef4444',
            border: `1px solid ${sliderDelay === 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            {sliderDelay === 0 ? 'Investing today' : `Waiting ${sliderDelay} year${sliderDelay > 1 ? 's' : ''}`}
          </span>
        </div>

        <SliderInput
          label="Years of delay"
          value={sliderDelay}
          min={0} max={maxSlider} step={1}
          format={(v) => v === 0 ? 'Today' : `${v} yr${v > 1 ? 's' : ''}`}
          onChange={setSliderDelay}
          color="#ef4444"
        />

        <AnimatePresence mode="wait">
          {sliderDelay > 0 ? (
            <motion.div
              key={`delay-${sliderDelay}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              style={{ marginTop: 24, textAlign: 'center' }}
            >
              <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.55)', margin: '0 0 6px' }}>
                Waiting <strong style={{ color: '#ef4444' }}>{sliderDelay} year{sliderDelay > 1 ? 's' : ''}</strong> means you need an extra
              </p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 800, color: '#ef4444', margin: '0 0 4px', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {fmtFull(animatedExtra)}
                <span style={{ fontSize: 18, fontWeight: 400, color: 'rgba(253,248,242,0.50)', marginLeft: 6 }}>/month</span>
              </p>
              <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.35)', margin: 0 }}>
                to reach the same retirement target — for the rest of your working life
              </p>
            </motion.div>
          ) : (
            <motion.div key="now" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 20, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#10b981' }}>
                Starting today gives you the lowest possible monthly commitment — every year of delay makes this number grow.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Visceral callout */}
      {fiveYearExtra > 0 && (
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderLeft: '4px solid #ef4444',
          borderRadius: 14, padding: '20px 24px',
          display: 'flex', gap: 14, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 24 }}>⏰</span>
          <div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#ef4444', margin: '0 0 6px' }}>
              Waiting 5 years costs you an extra {fmtFull(fiveYearExtra)}/month
            </p>
            <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.50)', margin: 0, lineHeight: 1.7 }}>
              That's {fmtFull(scenarios.find(s => s.years === 5)?.extra ?? 0)} per month — every month — for the remaining {yearsToRetirement - 5} years until retirement.
              Money that could have been compounding is now playing catch-up instead.
            </p>
          </div>
        </div>
      )}

      {/* Diverging chart */}
      <div style={{
        background: 'rgba(122,28,46,0.06)',
        border: '1px solid rgba(196,168,130,0.15)',
        borderRadius: 16, padding: '24px 28px',
        backdropFilter: 'blur(12px)',
      }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 4px' }}>Wealth Divergence</p>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#fdf8f2', margin: '0 0 20px' }}>
          The same monthly amount, started at different times
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 8, right: 20, left: 8, bottom: 0 }}>
            <defs>
              {SCENARIOS.map(s => (
                <linearGradient key={s.label} id={`g-${s.years}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={s.color} stopOpacity={s.years === 0 ? 0.3 : 0.15} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0.01} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,168,130,0.06)" />
            <XAxis dataKey="age" tick={{ fontSize: 9, fill: 'rgba(253,248,242,0.35)', fontFamily: "'Cabinet Grotesk', sans-serif" }} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 8, fill: 'rgba(253,248,242,0.35)', fontFamily: "'Cabinet Grotesk', sans-serif" }} width={60} />
            <Tooltip content={<ChartTip />} />
            {SCENARIOS.slice().reverse().map(s => (
              <Area
                key={s.label}
                type="monotone"
                dataKey={s.label}
                stroke={s.color}
                fill={`url(#g-${s.years})`}
                strokeWidth={s.years === 0 ? 2.5 : 1.5}
                strokeDasharray={s.years === 0 ? undefined : s.years === 2 ? '5 3' : '3 3'}
                dot={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
          {SCENARIOS.map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'rgba(253,248,242,0.45)' }}>
              <div style={{ width: 18, height: 2, borderRadius: 2, background: s.color }} />
              {s.label}
            </div>
          ))}
        </div>
      </div>

      <AIInsightPanel
        tool="cost-of-waiting"
        autoRefresh
        data={{
          currentAge, delay: sliderDelay,
          pmtNow: Math.round(pmtNow),
          pmtDelayed: Math.round(sliderPmt),
          delta: Math.round(sliderExtra),
          targetCorpus: Math.round(corpus),
          fiveYearExtra: Math.round(fiveYearExtra),
        }}
        label="Analyse the Cost of Delay"
      />
    </div>
  )
}
