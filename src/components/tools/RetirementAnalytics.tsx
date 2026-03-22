'use client'

import { useState, useMemo } from 'react'
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts'
import SliderInput from '@/components/ui/SliderInput'
import AIInsightPanel from '@/components/ui/AIInsightPanel'
import {
  projectedCorpus, requiredCorpus, solveForRate, solveForAge, solveForMonthly,
  buildWealthProjection, cpfLifeMonthly, cpfProjectedRA, medisaveProjected,
  cpfCapitalisedValue,
} from '@/lib/tools/retirement/calculations'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  currentAge: number
  monthlyIncome: number
  currentSavings: number
  monthlyInvestment: number
  retirementAge: number
  desiredMonthlyIncome: number
  inflationRate: number
  dividendYield: number
  annualRate: number
  cpfOa: number
  cpfSa: number
  cpfMa: number
}

type LockedField = 'rate' | 'time' | 'monthly'

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}
function fmtSGD(v: number): string {
  return `S$${Math.round(v).toLocaleString('en-SG')}`
}
function fmtPct(v: number): string { return `${(v * 100).toFixed(1)}%` }

// ── Design primitives ─────────────────────────────────────────────────────────

function GlassCard({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(122,28,46,0.06)',
      border: '1px solid rgba(196,168,130,0.15)',
      borderRadius: 16,
      backdropFilter: 'blur(12px)',
      padding: '24px 28px',
      ...style,
    }}>
      {children}
    </div>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
      textTransform: 'uppercase', color: '#c4a882',
      margin: '0 0 6px', fontFamily: "'Cabinet Grotesk', sans-serif",
    }}>
      {children}
    </p>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: "'Playfair Display', serif",
      fontSize: 18, fontWeight: 700, color: '#fdf8f2',
      margin: 0, letterSpacing: '-0.01em',
    }}>
      {children}
    </h2>
  )
}

// ── Chart tooltip ─────────────────────────────────────────────────────────────

function ChartTip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: number
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(10,6,5,0.95)',
      border: '1px solid rgba(196,168,130,0.2)',
      borderRadius: 10, padding: '10px 14px',
      fontFamily: "'Cabinet Grotesk', sans-serif",
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)', fontSize: 11,
    }}>
      <p style={{ fontWeight: 700, color: '#c4a882', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Age {label}
      </p>
      {payload.filter(p => p.value != null && p.value > 0).map((p) => (
        <p key={p.name} style={{ margin: '2px 0', color: '#fdf8f2', display: 'flex', justifyContent: 'space-between', gap: 14 }}>
          <span><span style={{ color: p.color, marginRight: 5 }}>■</span>{p.name}</span>
          <strong>{fmt(p.value)}</strong>
        </p>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RetirementAnalytics(props: Props) {
  const [s, setS] = useState({ ...props })
  const [showCPF, setShowCPF] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const [solvedFor, setSolvedFor] = useState<LockedField>('rate')

  function set<K extends keyof typeof s>(k: K, v: (typeof s)[K]) {
    setS(prev => ({ ...prev, [k]: v }))
  }

  const {
    currentAge, monthlyIncome, currentSavings, monthlyInvestment, retirementAge,
    desiredMonthlyIncome, inflationRate, dividendYield, annualRate,
    cpfOa, cpfSa, cpfMa,
  } = s

  const yrs = Math.max(1, retirementAge - currentAge)

  // ── Core calculations ─────────────────────────────────────────────────────

  const req = requiredCorpus(desiredMonthlyIncome, inflationRate, yrs, dividendYield)
  const proj = projectedCorpus(currentSavings, monthlyInvestment, annualRate, yrs, cpfOa, cpfSa, dividendYield, showCPF)
  const gap = req - proj.total
  const onTrack = gap <= 0
  const fundedPct = req > 0 ? Math.min(150, (proj.total / req) * 100) : 0

  // Tri-lock solved values
  const solvedRate = useMemo(
    () => solveForRate(currentSavings, monthlyInvestment, yrs, cpfOa, cpfSa, dividendYield, showCPF, req),
    [currentSavings, monthlyInvestment, yrs, cpfOa, cpfSa, dividendYield, showCPF, req]
  )
  const solvedAge = useMemo(
    () => solveForAge(currentAge, currentSavings, monthlyInvestment, annualRate, cpfOa, cpfSa, dividendYield, showCPF, desiredMonthlyIncome, inflationRate),
    [currentAge, currentSavings, monthlyInvestment, annualRate, cpfOa, cpfSa, dividendYield, showCPF, desiredMonthlyIncome, inflationRate]
  )
  const solvedMonthly = useMemo(
    () => solveForMonthly(currentSavings, annualRate, yrs, cpfOa, cpfSa, dividendYield, showCPF, req),
    [currentSavings, annualRate, yrs, cpfOa, cpfSa, dividendYield, showCPF, req]
  )

  // CPF detail
  const cpfMonthlyPayout = cpfLifeMonthly(cpfOa, cpfSa, yrs)
  const cpfRAValue = cpfProjectedRA(cpfOa, cpfSa, yrs)
  const cpfCap = cpfCapitalisedValue(cpfOa, cpfSa, yrs, dividendYield)
  const medisaveFV = medisaveProjected(cpfMa, yrs)

  const replacementRate = monthlyIncome > 0 ? desiredMonthlyIncome / monthlyIncome : null

  // Chart data
  const chartData = useMemo(() => buildWealthProjection(
    currentAge, retirementAge, currentSavings, monthlyInvestment,
    annualRate, desiredMonthlyIncome, inflationRate, dividendYield,
    cpfOa, cpfSa, cpfMa, showCPF,
  ), [s, showCPF])

  const depletionBase = chartData.find((d, i) => i > 0 && d.base === 0 && chartData[i - 1].base > 0)?.age

  // Scenario projections
  const scenarioProj = useMemo(() => ({
    pessimistic: projectedCorpus(currentSavings, monthlyInvestment, Math.max(0.01, annualRate - 0.02), yrs, cpfOa, cpfSa, dividendYield, showCPF).total,
    base: proj.total,
    optimistic: projectedCorpus(currentSavings, monthlyInvestment, annualRate + 0.02, yrs, cpfOa, cpfSa, dividendYield, showCPF).total,
  }), [s, showCPF, yrs])

  // Tri-lock field definitions
  const triLockFields: Array<{
    id: LockedField
    icon: string
    eyebrow: string
    value: number
    solvedValue: number
    format: (v: number) => string
    sliderMin: number
    sliderMax: number
    sliderStep: number
    parse: (s: string) => number
    onChange: (v: number) => void
    tooltip: string
    warningThreshold?: number
    warningMsg?: string
  }> = [
    {
      id: 'rate',
      icon: '📈',
      eyebrow: 'Rate of Return',
      value: annualRate,
      solvedValue: solvedRate,
      format: (v) => `${(v * 100).toFixed(1)}% p.a.`,
      sliderMin: 0.02,
      sliderMax: 0.15,
      sliderStep: 0.005,
      parse: (s) => parseFloat(s.replace(/[^0-9.]/g, '')) / 100,
      onChange: (v) => set('annualRate', v),
      tooltip: 'Annual portfolio return. Global index funds target 7–10% historically. Higher = more risk.',
      warningThreshold: 0.10,
      warningMsg: '⚠ High assumption — implies significant portfolio risk',
    },
    {
      id: 'time',
      icon: '⏳',
      eyebrow: 'Retirement Age',
      value: retirementAge,
      solvedValue: solvedAge,
      format: (v) => `Age ${Math.round(v)}`,
      sliderMin: 45,
      sliderMax: 75,
      sliderStep: 1,
      parse: (s) => parseInt(s.replace(/[^0-9]/g, ''), 10),
      onChange: (v) => set('retirementAge', v),
      tooltip: 'Later retirement = more accumulation time AND fewer drawdown years. Powerful lever.',
    },
    {
      id: 'monthly',
      icon: '💰',
      eyebrow: 'Monthly Investment',
      value: monthlyInvestment,
      solvedValue: solvedMonthly,
      format: (v) => fmtSGD(v),
      sliderMin: 0,
      sliderMax: 20000,
      sliderStep: 50,
      parse: (s) => parseFloat(s.replace(/[^0-9.]/g, '')),
      onChange: (v) => set('monthlyInvestment', v),
      tooltip: 'How much you invest each month. The most controllable lever — every dollar compounds.',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Cabinet Grotesk', sans-serif" }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 4 }}>
        <Eyebrow>Retirement Analytics</Eyebrow>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 26, fontWeight: 700, color: '#fdf8f2',
          margin: '0 0 4px', letterSpacing: '-0.02em',
        }}>
          Plan your freedom
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.50)', margin: 0 }}>
          Dynamic calculations that adapt as you adjust — no Calculate button needed
        </p>
      </div>

      {/* ── Snapshot card ── */}
      <div style={{
        background: onTrack
          ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.03))'
          : 'linear-gradient(135deg, rgba(155,32,64,0.12), rgba(196,168,130,0.04))',
        border: `1px solid ${onTrack ? 'rgba(16,185,129,0.25)' : 'rgba(155,32,64,0.25)'}`,
        borderRadius: 16, padding: '24px 28px',
        backdropFilter: 'blur(12px)',
      }}>
        {/* Headline row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <Eyebrow>Your Retirement Snapshot</Eyebrow>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 22, fontWeight: 700, color: '#fdf8f2',
              margin: 0, letterSpacing: '-0.01em',
            }}>
              Retire at {retirementAge} · {fmtSGD(desiredMonthlyIncome)}/mo
              {replacementRate !== null && (
                <span style={{
                  fontSize: 13, fontWeight: 500, marginLeft: 10,
                  color: replacementRate > 0.9 ? '#f59e0b' : replacementRate < 0.5 ? '#60a5fa' : '#10b981',
                  fontFamily: "'Cabinet Grotesk', sans-serif",
                }}>
                  — {Math.round(replacementRate * 100)}% income replacement
                </span>
              )}
            </h2>
          </div>
          <div style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: onTrack ? 'rgba(16,185,129,0.15)' : 'rgba(155,32,64,0.15)',
            color: onTrack ? '#10b981' : '#f87171',
            border: `1px solid ${onTrack ? 'rgba(16,185,129,0.3)' : 'rgba(155,32,64,0.3)'}`,
          }}>
            {onTrack ? '✓ On Track' : '⚠ Shortfall'}
          </div>
        </div>

        {/* 3 key metrics */}
        <div className="grid-3col" style={{ gap: 12, marginBottom: 16 }}>
          {[
            {
              label: 'Required Corpus',
              value: fmtSGD(req),
              sub: `${fmtSGD(desiredMonthlyIncome)}/mo × 12 ÷ ${fmtPct(dividendYield)} SWR`,
              color: '#fdf8f2',
            },
            {
              label: 'Projected Corpus',
              value: fmtSGD(proj.total),
              sub: `At ${fmtPct(annualRate)} p.a.${showCPF ? ' + CPF Life floor' : ''}`,
              color: '#fdf8f2',
            },
            {
              label: onTrack ? 'Surplus' : 'Shortfall',
              value: fmtSGD(Math.abs(gap)),
              sub: onTrack
                ? "You're ahead — keep invested"
                : `Close this gap to retire at ${retirementAge}`,
              color: onTrack ? '#10b981' : '#f87171',
            },
          ].map(({ label, value, sub, color }) => (
            <div key={label} style={{
              background: 'rgba(10,6,5,0.4)',
              borderRadius: 10, padding: '14px 16px',
              border: '1px solid rgba(196,168,130,0.08)',
            }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.7)', margin: '0 0 4px' }}>{label}</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color, margin: '0 0 3px' }}>{value}</p>
              <p style={{ fontSize: 10, color: 'rgba(253,248,242,0.40)', margin: 0, lineHeight: 1.5 }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: 'rgba(253,248,242,0.45)' }}>
              {depletionBase
                ? `Funds deplete at age ${depletionBase} (base scenario)`
                : 'Funds last beyond age 90 in all scenarios ✓'}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: onTrack ? '#10b981' : '#f87171' }}>
              {Math.round(fundedPct)}% funded
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(253,248,242,0.08)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${Math.min(100, fundedPct)}%`,
              background: onTrack
                ? 'linear-gradient(90deg, rgba(16,185,129,0.5), #10b981)'
                : 'linear-gradient(90deg, rgba(155,32,64,0.5), #9b2040)',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* Corpus breakdown chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Savings growth', value: proj.fvSavings, color: '#c4a882' },
            { label: 'Monthly investments', value: proj.fvContributions, color: '#9b2040' },
            ...(showCPF && proj.cpfCapitalised > 0 ? [{ label: 'CPF Life floor', value: proj.cpfCapitalised, color: '#a78bfa' }] : []),
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: 'rgba(10,6,5,0.5)', border: '1px solid rgba(196,168,130,0.12)',
              borderRadius: 8, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ width: 3, height: 20, borderRadius: 2, background: color, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.5)', margin: 0 }}>{label}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color, margin: 0 }}>{fmtSGD(value)}</p>
              </div>
              {proj.total > 0 && (
                <span style={{ fontSize: 10, color: 'rgba(253,248,242,0.3)', borderLeft: '1px solid rgba(196,168,130,0.1)', paddingLeft: 8 }}>
                  {Math.round((value / proj.total) * 100)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Two-panel: Chart + Tri-lock ── */}
      <div className="grid-2col" style={{ gap: 20, alignItems: 'start' }}>

        {/* LEFT — Chart */}
        <GlassCard>
          <Eyebrow>Wealth Projection</Eyebrow>
          <SectionTitle>Your financial trajectory</SectionTitle>
          <div style={{ marginTop: 20 }}>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gBase" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9b2040" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#9b2040" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gOpt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="gPess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,168,130,0.06)" />
                <XAxis dataKey="age" tick={{ fontSize: 9, fill: 'rgba(253,248,242,0.35)', fontFamily: "'Cabinet Grotesk', sans-serif" }} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 8, fill: 'rgba(253,248,242,0.35)', fontFamily: "'Cabinet Grotesk', sans-serif" }} width={50} />
                <Tooltip content={<ChartTip />} />
                <ReferenceLine x={retirementAge} stroke="rgba(196,168,130,0.4)" strokeDasharray="5 3"
                  label={{ value: `Age ${retirementAge}`, position: 'top', fontSize: 8, fill: '#c4a882', fontFamily: "'Cabinet Grotesk', sans-serif" }} />
                {depletionBase && (
                  <ReferenceLine x={depletionBase} stroke="rgba(239,68,68,0.5)" strokeDasharray="3 3"
                    label={{ value: `Depletes ${depletionBase}`, position: 'top', fontSize: 8, fill: '#ef4444', fontFamily: "'Cabinet Grotesk', sans-serif" }} />
                )}
                <Area type="monotone" dataKey="optimistic" name="Optimistic (+2%)" stroke="#10b981" fill="url(#gOpt)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                <Area type="monotone" dataKey="base" name="Base" stroke="#9b2040" fill="url(#gBase)" strokeWidth={2.5} dot={false} />
                <Area type="monotone" dataKey="pessimistic" name="Conservative (−2%)" stroke="#f59e0b" fill="url(#gPess)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                <Line type="monotone" dataKey="required" name="Target corpus" stroke="rgba(196,168,130,0.6)" strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls={false} />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
              {[
                { color: '#9b2040', label: `Base (${fmtPct(annualRate)})`, dash: false },
                { color: '#10b981', label: 'Optimistic (+2%)', dash: true },
                { color: '#f59e0b', label: 'Conservative (−2%)', dash: true },
                { color: 'rgba(196,168,130,0.6)', label: 'Target corpus', dash: true },
              ].map(({ color, label, dash }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'rgba(253,248,242,0.40)' }}>
                  <div style={{ width: 18, height: 2, borderRadius: 2, background: color }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Scenario strip */}
          <div style={{ marginTop: 20, borderTop: '1px solid rgba(196,168,130,0.08)', paddingTop: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.6)', margin: '0 0 10px' }}>
              Scenario at retirement
            </p>
            {([
              { key: 'pessimistic' as const, label: 'Conservative', rate: Math.max(0.01, annualRate - 0.02), color: '#f59e0b' },
              { key: 'base' as const, label: 'Base', rate: annualRate, color: '#9b2040' },
              { key: 'optimistic' as const, label: 'Optimistic', rate: annualRate + 0.02, color: '#10b981' },
            ]).map(({ key, label, rate, color }) => {
              const val = scenarioProj[key]
              const diff = req - val
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(196,168,130,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 3, height: 14, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'rgba(253,248,242,0.6)' }}>{label}</span>
                    <span style={{ fontSize: 10, color: 'rgba(253,248,242,0.3)' }}>{fmtPct(rate)}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#fdf8f2' }}>{fmtSGD(val)}</span>
                    <span style={{ fontSize: 10, color: diff <= 0 ? '#10b981' : '#f87171', marginLeft: 6 }}>
                      {diff <= 0 ? `+${fmtSGD(-diff)}` : `-${fmtSGD(diff)}`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>

        {/* RIGHT — Tri-lock */}
        <GlassCard>
          <Eyebrow>Solving For</Eyebrow>
          <SectionTitle>Adjust two, compute one</SectionTitle>
          <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.45)', margin: '8px 0 20px', lineHeight: 1.6 }}>
            Click <strong style={{ color: '#c4a882' }}>Solve →</strong> on any row to let the math compute it from the other two.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {triLockFields.map((field) => {
              const isSolved = solvedFor === field.id
              return (
                <div key={field.id} style={{
                  padding: '16px 18px', borderRadius: 12,
                  background: isSolved ? 'rgba(155,32,64,0.12)' : 'rgba(10,6,5,0.3)',
                  border: isSolved ? '1px solid rgba(155,32,64,0.35)' : '1px solid rgba(196,168,130,0.08)',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{field.icon}</span>
                      <div>
                        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.6)', margin: 0 }}>
                          {field.eyebrow}
                        </p>
                        <p style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: 17, fontWeight: 700, margin: '2px 0 0',
                          color: isSolved ? '#c4a882' : '#fdf8f2',
                        }}>
                          {isSolved ? field.format(field.solvedValue) : field.format(field.value)}
                        </p>
                      </div>
                    </div>
                    {!isSolved && (
                      <button
                        onClick={() => setSolvedFor(field.id)}
                        style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                          padding: '4px 10px', borderRadius: 6,
                          background: 'rgba(196,168,130,0.1)',
                          border: '1px solid rgba(196,168,130,0.2)',
                          color: 'rgba(196,168,130,0.8)',
                          cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif",
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(196,168,130,0.2)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(196,168,130,0.1)' }}
                      >
                        Solve →
                      </button>
                    )}
                    {isSolved && (
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9b2040', background: 'rgba(155,32,64,0.15)', padding: '3px 8px', borderRadius: 5 }}>
                        Computing
                      </span>
                    )}
                  </div>

                  {!isSolved && (
                    <SliderInput
                      label=""
                      value={field.value}
                      min={field.sliderMin}
                      max={field.sliderMax}
                      step={field.sliderStep}
                      format={field.format}
                      parse={field.parse}
                      onChange={field.onChange}
                      tooltip={field.tooltip}
                    />
                  )}

                  {isSolved && (
                    <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.40)', margin: '4px 0 0', lineHeight: 1.5 }}>
                      {field.id === 'rate' && `Need ${field.format(field.solvedValue)} annual returns to retire at ${retirementAge} investing ${fmtSGD(monthlyInvestment)}/mo`}
                      {field.id === 'time' && `Earliest retirement age at ${fmtPct(annualRate)} returns investing ${fmtSGD(monthlyInvestment)}/mo`}
                      {field.id === 'monthly' && `Monthly investment needed at ${fmtPct(annualRate)} to retire at ${retirementAge}`}
                    </p>
                  )}

                  {field.warningThreshold && !isSolved && field.value > field.warningThreshold && (
                    <p style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, margin: '8px 0 0' }}>{field.warningMsg}</p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Primary levers also include: desired income, current savings */}
          <div style={{ marginTop: 20, borderTop: '1px solid rgba(196,168,130,0.08)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SliderInput
              label="Desired monthly income (today's $)"
              value={desiredMonthlyIncome} min={1000} max={30000} step={250}
              format={(v) => fmtSGD(v)}
              onChange={(v) => set('desiredMonthlyIncome', v)}
              tooltip="What you want to spend each month in today's dollars. We inflation-adjust this forward."
            />
            <SliderInput
              label="Current liquid savings"
              value={currentSavings} min={0} max={2000000} step={5000}
              format={(v) => fmtSGD(v)}
              onChange={(v) => set('currentSavings', v)}
              tooltip="Investable assets today — exclude CPF, property, emergency fund."
            />
          </div>
        </GlassCard>
      </div>

      {/* ── Advanced / CPF (expandable) ── */}
      <GlassCard>
        <button
          onClick={() => setShowDetails(v => !v)}
          style={{
            width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: "'Cabinet Grotesk', sans-serif",
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <Eyebrow>Advanced</Eyebrow>
            <SectionTitle>Assumptions & CPF Detail</SectionTitle>
          </div>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: 'rgba(196,168,130,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: 'rgba(196,168,130,0.6)', flexShrink: 0,
          }}>
            {showDetails ? '−' : '+'}
          </div>
        </button>

        {showDetails && (
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 28 }}>
            {/* Advanced sliders */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.6)', margin: '0 0 16px' }}>
                Economic assumptions
              </p>
              <div className="grid-2col" style={{ gap: 28 }}>
                <SliderInput
                  label="Inflation rate"
                  value={inflationRate} min={0.01} max={0.07} step={0.005}
                  format={(v) => `${(v * 100).toFixed(1)}%`}
                  parse={(s) => parseFloat(s.replace(/[^0-9.]/g, '')) / 100}
                  onChange={(v) => set('inflationRate', v)}
                  tooltip="Singapore long-run CPI: ~2–3% p.a. Inflation inflates your required retirement income."
                />
                <SliderInput
                  label="Safe withdrawal rate (SWR)"
                  value={dividendYield} min={0.02} max={0.10} step={0.005}
                  format={(v) => `${(v * 100).toFixed(1)}%`}
                  parse={(s) => parseFloat(s.replace(/[^0-9.]/g, '')) / 100}
                  onChange={(v) => set('dividendYield', v)}
                  tooltip="4% rule: withdraw 4% of portfolio annually — should last 30+ years. 3% is more conservative."
                />
              </div>
            </div>

            {/* CPF breakdown */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.6)', margin: 0 }}>
                  CPF breakdown
                </p>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox" checked={showCPF}
                    onChange={(e) => setShowCPF(e.target.checked)}
                    style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#9b2040' }}
                  />
                  <span style={{ fontSize: 11, color: 'rgba(253,248,242,0.6)' }}>Include CPF in corpus</span>
                </label>
              </div>

              <div className="grid-3col" style={{ gap: 10 }}>
                {[
                  { label: 'OA Balance', value: fmtSGD(cpfOa), note: '2.5% p.a. guaranteed', color: '#9b2040' },
                  { label: 'SA Balance', value: fmtSGD(cpfSa), note: '4% p.a. → RA at 55', color: '#c4a882' },
                  { label: 'CPF Life est.', value: `${fmtSGD(Math.round(cpfMonthlyPayout))}/mo`, note: `RA: ${fmtSGD(Math.round(cpfRAValue))} at ${retirementAge}`, color: '#a78bfa' },
                ].map(({ label, value, note, color }) => (
                  <div key={label} style={{ background: 'rgba(10,6,5,0.4)', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(196,168,130,0.08)' }}>
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.5)', margin: '0 0 4px' }}>{label}</p>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color, margin: '0 0 3px' }}>{value}</p>
                    <p style={{ fontSize: 10, color: 'rgba(253,248,242,0.35)', margin: 0 }}>{note}</p>
                  </div>
                ))}
              </div>

              {cpfMa > 0 && (
                <div style={{ marginTop: 10, padding: '8px 14px', background: 'rgba(167,139,250,0.06)', borderRadius: 8, border: '1px solid rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13 }}>🏥</span>
                  <p style={{ fontSize: 12, margin: 0, color: 'rgba(253,248,242,0.5)' }}>
                    <strong style={{ color: '#a78bfa' }}>Medisave (MA): {fmtSGD(cpfMa)}</strong> — grows to {fmtSGD(Math.round(medisaveFV))} at {retirementAge}. Healthcare reserve only — excluded from retirement corpus.
                  </p>
                </div>
              )}

              <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(122,28,46,0.08)', borderRadius: 8, borderLeft: '3px solid rgba(155,32,64,0.4)' }}>
                <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.55)', margin: 0, lineHeight: 1.75 }}>
                  <strong style={{ color: '#c4a882' }}>How CPF feeds this plan:</strong> OA + SA grow at a blended 3.5% to a projected RA of <strong style={{ color: '#fdf8f2' }}>{fmtSGD(Math.round(cpfRAValue))}</strong>. CPF Life Standard pays approx <strong style={{ color: '#fdf8f2' }}>{fmtSGD(Math.round(cpfMonthlyPayout))}/month</strong> from age 65 — capitalised as <strong style={{ color: '#a78bfa' }}>{fmtSGD(Math.round(cpfCap))}</strong> toward your corpus.
                </p>
              </div>

              <div style={{ marginTop: 10 }}>
                {[
                  { label: 'CPF OA (2.5%)', value: cpfOa, onChange: (v: number) => set('cpfOa', v), max: 500000 },
                  { label: 'CPF SA (4.0%)', value: cpfSa, onChange: (v: number) => set('cpfSa', v), max: 300000 },
                  { label: 'CPF MA (4.0%)', value: cpfMa, onChange: (v: number) => set('cpfMa', v), max: 100000 },
                ].map(({ label, value, onChange, max }) => (
                  <div key={label} style={{ marginBottom: 16 }}>
                    <SliderInput
                      label={label}
                      value={value} min={0} max={max} step={1000}
                      format={(v) => fmtSGD(v)}
                      onChange={onChange}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </GlassCard>

      {/* ── Reset ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => { setS({ ...props }); setSolvedFor('rate') }}
          style={{
            fontSize: 11, fontWeight: 600, padding: '7px 16px', borderRadius: 8,
            border: '1px solid rgba(196,168,130,0.2)', background: 'rgba(10,6,5,0.5)',
            color: 'rgba(253,248,242,0.5)', cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif",
          }}
        >
          ↩ Reset to profile defaults
        </button>
      </div>

      {/* ── AI Insight ── */}
      <AIInsightPanel
        tool="retirement"
        autoRefresh
        data={{
          currentAge,
          retirementAge,
          yearsToRetirement: yrs,
          monthlyInvestment,
          currentSavings,
          monthlyIncome,
          replacementRate: replacementRate !== null ? Math.round(replacementRate * 100) : null,
          requiredCorpus: Math.round(req),
          projectedCorpus: Math.round(proj.total),
          gap: Math.round(gap),
          onTrack,
          solvedRate: Math.round(solvedRate * 1000) / 10,
          solvedAge,
          solvedMonthly: Math.round(solvedMonthly),
          annualRate: Math.round(annualRate * 1000) / 10,
          inflationRate: Math.round(inflationRate * 1000) / 10,
          swr: Math.round(dividendYield * 1000) / 10,
          cpfMonthlyPayout: Math.round(cpfMonthlyPayout),
          depletionAge: depletionBase ?? null,
        }}
      />
    </div>
  )
}
