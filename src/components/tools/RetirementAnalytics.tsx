'use client'

import { useState, useMemo } from 'react'
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts'
import SliderInput from '@/components/ui/SliderInput'
import AIInsightPanel from '@/components/ui/AIInsightPanel'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  cpfMa: number  // Medisave — NOT in retirement corpus
}

// ─── Formatters ───────────────────────────────────────────────────────────────

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

// ─── Math helpers ─────────────────────────────────────────────────────────────

function projectedCorpus(
  savings: number, pmt: number, rate: number, years: number,
  cpfTotal: number, cpfRate: number, swr: number
): number {
  const r = rate / 12, n = years * 12
  const fvSav = savings * Math.pow(1 + r, n)
  const fvPmt = r > 0 ? pmt * ((Math.pow(1 + r, n) - 1) / r) : pmt * n
  const cpfFV = cpfTotal * Math.pow(1 + cpfRate, years)
  // CPF Life Standard: ~$650/mo per $100K RA (0.0065 per $ per month)
  const cpfMonthly = cpfFV * 0.0065
  const cpfCap = swr > 0 ? (cpfMonthly * 12) / swr : 0
  return fvSav + fvPmt + cpfCap
}

function requiredCorpus(desiredMonthly: number, inflation: number, years: number, swr: number): number {
  const inflAdj = desiredMonthly * Math.pow(1 + inflation, years)
  return swr > 0 ? (inflAdj * 12) / swr : inflAdj * 300
}

function solvePMT(gap: number, rate: number, years: number): number {
  const r = rate / 12, n = years * 12
  if (r === 0) return n > 0 ? gap / n : 0
  return Math.max(0, gap * r / (Math.pow(1 + r, n) - 1))
}

function solveAge(
  currentAge: number, savings: number, pmt: number, rate: number,
  cpfTotal: number, inflation: number, desiredMonthly: number, swr: number
): number {
  for (let age = currentAge + 1; age <= 85; age++) {
    const yrs = age - currentAge
    if (projectedCorpus(savings, pmt, rate, yrs, cpfTotal, 0.035, swr) >= requiredCorpus(desiredMonthly, inflation, yrs, swr))
      return age
  }
  return 85
}

function solveReturn(
  currentAge: number, savings: number, pmt: number, retirementAge: number,
  cpfTotal: number, inflation: number, desiredMonthly: number, swr: number
): number {
  const yrs = Math.max(1, retirementAge - currentAge)
  const req = requiredCorpus(desiredMonthly, inflation, yrs, swr)
  let lo = 0.001, hi = 0.30
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (projectedCorpus(savings, pmt, mid, yrs, cpfTotal, 0.035, swr) >= req) hi = mid; else lo = mid
  }
  return (lo + hi) / 2
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

function ChartTip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: number }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(42,31,26,0.12)',
      borderRadius: 10, padding: '10px 14px', fontFamily: "'Cabinet Grotesk', sans-serif",
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 11,
    }}>
      <p style={{ fontWeight: 700, color: '#a89070', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Age {label}</p>
      {payload.filter(p => p.value != null).map((p) => (
        <p key={p.name} style={{ margin: '2px 0', color: '#2a1f1a', display: 'flex', justifyContent: 'space-between', gap: 14 }}>
          <span><span style={{ color: p.color, marginRight: 5 }}>■</span>{p.name}</span>
          <strong>{fmt(p.value)}</strong>
        </p>
      ))}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(42,31,26,0.07)',
      borderRadius: 16, padding: '24px 28px',
      boxShadow: '0 2px 12px rgba(42,31,26,0.04)', ...style,
    }}>
      {children}
    </div>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 6px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
      {children}
    </p>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#2a1f1a', margin: 0, letterSpacing: '-0.01em' }}>
      {children}
    </h2>
  )
}

function Explain({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(196,168,130,0.08)', borderLeft: '3px solid #c4a882',
      borderRadius: '0 8px 8px 0', padding: '10px 14px',
      fontSize: 12, color: '#6b5c52', lineHeight: 1.7,
      fontFamily: "'Cabinet Grotesk', sans-serif",
    }}>
      {children}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RetirementAnalytics(props: Props) {
  const [s, setS] = useState({ ...props })
  const [showCPF, setShowCPF] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const [showCPFDetail, setShowCPFDetail] = useState(false)

  function set<K extends keyof typeof s>(k: K, v: (typeof s)[K]) {
    setS(prev => ({ ...prev, [k]: v }))
  }

  const {
    currentAge, monthlyIncome, currentSavings, monthlyInvestment, retirementAge,
    desiredMonthlyIncome, inflationRate, dividendYield, annualRate,
    cpfOa, cpfSa, cpfMa,
  } = s

  // CPF for retirement = OA + SA only (MA = Medisave, healthcare only)
  const cpfRetirementTotal = cpfOa + cpfSa
  const yrs = Math.max(1, retirementAge - currentAge)

  const rates = {
    pessimistic: Math.max(0.01, annualRate - 0.02),
    base: annualRate,
    optimistic: annualRate + 0.02,
  }

  // Base-case corpus components
  const r = annualRate / 12, n = yrs * 12
  const fvSav = currentSavings * Math.pow(1 + r, n)
  const fvPmt = r > 0 ? monthlyInvestment * ((Math.pow(1 + r, n) - 1) / r) : monthlyInvestment * n
  const cpfFVAtRetirement = cpfRetirementTotal * Math.pow(1.035, yrs)
  const cpfMonthlyPayout = cpfFVAtRetirement * 0.0065
  const cpfCapitalized = showCPF && dividendYield > 0 ? (cpfMonthlyPayout * 12) / dividendYield : 0

  const projCorpus = fvSav + fvPmt + (showCPF ? cpfCapitalized : 0)
  const reqCorpus = requiredCorpus(desiredMonthlyIncome, inflationRate, yrs, dividendYield)
  const gap = reqCorpus - projCorpus
  const onTrack = gap <= 0
  const fundedPct = reqCorpus > 0 ? Math.min(150, (projCorpus / reqCorpus) * 100) : 0

  // Scenario projections
  const scenarioProj = useMemo(() => {
    const calc = (rate: number) => {
      const rr = rate / 12, nn = yrs * 12
      const sv = currentSavings * Math.pow(1 + rr, nn)
      const pm = rr > 0 ? monthlyInvestment * ((Math.pow(1 + rr, nn) - 1) / rr) : monthlyInvestment * nn
      return sv + pm + (showCPF ? cpfCapitalized : 0)
    }
    return {
      pessimistic: calc(rates.pessimistic),
      base: projCorpus,
      optimistic: calc(rates.optimistic),
    }
  }, [s, showCPF, yrs])

  // Trinity levers
  const rawGap = Math.max(0, reqCorpus - fvSav - (showCPF ? cpfCapitalized : 0))
  const trinityPMT = Math.ceil(solvePMT(rawGap, annualRate, yrs))
  const trinityAge = solveAge(currentAge, currentSavings, monthlyInvestment, annualRate, showCPF ? cpfRetirementTotal : 0, inflationRate, desiredMonthlyIncome, dividendYield)
  const trinityReturn = solveReturn(currentAge, currentSavings, monthlyInvestment, retirementAge, showCPF ? cpfRetirementTotal : 0, inflationRate, desiredMonthlyIncome, dividendYield)

  // Income replacement
  const replacementRate = monthlyIncome > 0 ? desiredMonthlyIncome / monthlyIncome : null

  // Chart data
  const chartData = useMemo(() => {
    const data = []
    let postBase = 0, postPess = 0, postOpt = 0, retired = false

    for (let age = currentAge; age <= 90; age++) {
      const yr = age - currentAge
      let cBase: number, cPess: number, cOpt: number

      if (age < retirementAge) {
        const nb = yr * 12
        const cpfYr = showCPF && dividendYield > 0
          ? (cpfRetirementTotal * Math.pow(1.035, yr) * 0.0065 * 12) / dividendYield : 0
        const fv = (rate: number) => {
          const rr = rate / 12
          return currentSavings * Math.pow(1 + rr, nb) + (rr > 0 ? monthlyInvestment * ((Math.pow(1 + rr, nb) - 1) / rr) : monthlyInvestment * nb) + cpfYr
        }
        cBase = fv(rates.base); cPess = fv(rates.pessimistic); cOpt = fv(rates.optimistic)
      } else {
        if (!retired) {
          const nb = yrs * 12
          const cpfCap = showCPF && dividendYield > 0 ? (cpfRetirementTotal * Math.pow(1.035, yrs) * 0.0065 * 12) / dividendYield : 0
          const fv = (rate: number) => {
            const rr = rate / 12
            return currentSavings * Math.pow(1 + rr, nb) + (rr > 0 ? monthlyInvestment * ((Math.pow(1 + rr, nb) - 1) / rr) : monthlyInvestment * nb) + cpfCap
          }
          postBase = fv(rates.base); postPess = fv(rates.pessimistic); postOpt = fv(rates.optimistic)
          retired = true
        }
        const annualWithdrawal = desiredMonthlyIncome * Math.pow(1 + inflationRate, yr) * 12
        const cpfAnnual = showCPF ? cpfMonthlyPayout * 12 : 0
        const netW = Math.max(0, annualWithdrawal - cpfAnnual)
        postBase = Math.max(0, postBase * (1 + rates.base) - netW)
        postPess = Math.max(0, postPess * (1 + rates.pessimistic) - netW)
        postOpt  = Math.max(0, postOpt  * (1 + rates.optimistic)  - netW)
        cBase = postBase; cPess = postPess; cOpt = postOpt
      }

      const req = age < retirementAge
        ? requiredCorpus(desiredMonthlyIncome, inflationRate, retirementAge - age, dividendYield)
        : null

      data.push({ age, base: Math.round(cBase), pessimistic: Math.round(cPess), optimistic: Math.round(cOpt), required: req !== null ? Math.round(req) : null })
    }
    return data
  }, [s, showCPF])

  const depletionBase = chartData.find((d, i) => i > 0 && d.base === 0 && chartData[i - 1].base > 0)?.age
  const depletionPess = chartData.find((d, i) => i > 0 && d.pessimistic === 0 && chartData[i - 1].pessimistic > 0)?.age

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Cabinet Grotesk', sans-serif" }}>

      {/* ── 1. Snapshot ── */}
      <div style={{
        background: onTrack
          ? 'linear-gradient(135deg, rgba(22,163,74,0.06), rgba(22,163,74,0.02))'
          : 'linear-gradient(135deg, rgba(122,28,46,0.08), rgba(196,168,130,0.04))',
        border: `1px solid ${onTrack ? 'rgba(22,163,74,0.2)' : 'rgba(122,28,46,0.15)'}`,
        borderRadius: 16, padding: '24px 28px',
      }}>
        {/* Row 1: headline + badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <Eyebrow>Retirement Snapshot</Eyebrow>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#2a1f1a', margin: 0, letterSpacing: '-0.01em' }}>
              Retire at {retirementAge} · {fmtSGD(desiredMonthlyIncome)}/mo
              {replacementRate !== null && (
                <span style={{
                  fontSize: 13, fontWeight: 500, marginLeft: 10,
                  color: replacementRate > 0.9 ? '#d97706' : replacementRate < 0.5 ? '#3b82f6' : '#16a34a',
                  fontFamily: "'Cabinet Grotesk', sans-serif",
                }}>
                  — {Math.round(replacementRate * 100)}% income replacement
                </span>
              )}
            </h2>
          </div>
          <div style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, alignSelf: 'flex-start',
            background: onTrack ? 'rgba(22,163,74,0.12)' : 'rgba(122,28,46,0.12)',
            color: onTrack ? '#16a34a' : '#7a1c2e',
            border: `1px solid ${onTrack ? 'rgba(22,163,74,0.25)' : 'rgba(122,28,46,0.2)'}`,
          }}>
            {onTrack ? '✓ On Track' : '⚠ Shortfall'}
          </div>
        </div>

        {/* Row 2: 3 key metrics */}
        <div className="grid-3col" style={{ gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Required', value: fmtSGD(reqCorpus), sub: `${fmtSGD(desiredMonthlyIncome)}/mo × 12 ÷ ${fmtPct(dividendYield)} SWR`, color: '#2a1f1a' },
            { label: 'Projected', value: fmtSGD(projCorpus), sub: `Savings + investments${showCPF ? ' + CPF Life' : ''} at ${fmtPct(annualRate)}`, color: '#2a1f1a' },
            { label: onTrack ? 'Surplus' : 'Shortfall', value: fmtSGD(Math.abs(gap)), sub: onTrack ? 'You\'re ahead — stay invested' : `Close this gap to retire at ${retirementAge}`, color: onTrack ? '#16a34a' : '#7a1c2e' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} style={{ background: 'rgba(253,248,242,0.7)', borderRadius: 10, padding: '14px 16px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a89070', margin: '0 0 4px' }}>{label}</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color, margin: '0 0 3px' }}>{value}</p>
              <p style={{ fontSize: 10, color: '#a89070', margin: 0, lineHeight: 1.5 }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Row 3: progress bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: '#a89070' }}>
              {depletionBase
                ? `Funds last until age ${depletionBase} (base)${depletionPess && depletionPess < depletionBase ? ` · age ${depletionPess} (conservative)` : ''}`
                : 'Funds last beyond age 90 in all scenarios ✓'}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: onTrack ? '#16a34a' : '#7a1c2e' }}>{Math.round(fundedPct)}% funded</span>
          </div>
          <div style={{ height: 7, borderRadius: 4, background: 'rgba(42,31,26,0.1)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: `${Math.min(100, fundedPct)}%`,
              background: onTrack
                ? 'linear-gradient(90deg, rgba(22,163,74,0.5), #16a34a)'
                : 'linear-gradient(90deg, rgba(122,28,46,0.4), #7a1c2e)',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Row 4: corpus breakdown chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Savings growth', value: fvSav, icon: '💼', color: '#7a1c2e' },
            { label: 'Monthly investments', value: fvPmt, icon: '📈', color: '#c4a882' },
            ...(showCPF && cpfCapitalized > 0 ? [{ label: 'CPF Life floor', value: cpfCapitalized, icon: '🏛', color: '#16a34a' }] : []),
          ].map(({ label, value, icon, color }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(42,31,26,0.07)',
              borderRadius: 8, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 13 }}>{icon}</span>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a89070', margin: 0 }}>{label}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color, margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>{fmtSGD(value)}</p>
              </div>
              {projCorpus > 0 && (
                <span style={{ fontSize: 10, color: '#a89070', borderLeft: '1px solid rgba(42,31,26,0.08)', paddingLeft: 8 }}>
                  {Math.round((value / projCorpus) * 100)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. Explore — Chart + Primary Sliders ── */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <Eyebrow>Explore scenarios</Eyebrow>
            <SectionTitle>Adjust & See the Impact</SectionTitle>
          </div>
          <button
            onClick={() => setS({ ...props })}
            style={{
              fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 8,
              border: '1.5px solid rgba(42,31,26,0.14)', background: '#fff',
              color: '#a89070', cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif",
            }}
          >
            ↩ Reset
          </button>
        </div>

        {/* Chart + Sliders */}
        <div className="grid-2col" style={{ gap: 28, alignItems: 'start' }}>
          {/* Chart */}
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gBase" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7a1c2e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#7a1c2e" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gOpt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="gPess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,31,26,0.04)" />
                <XAxis dataKey="age" tick={{ fontSize: 10, fill: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 9, fill: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }} width={52} />
                <Tooltip content={<ChartTip />} />
                <ReferenceLine x={retirementAge} stroke="rgba(122,28,46,0.35)" strokeDasharray="5 3"
                  label={{ value: `Age ${retirementAge}`, position: 'top', fontSize: 9, fill: '#7a1c2e', fontFamily: "'Cabinet Grotesk', sans-serif" }} />
                {depletionBase && (
                  <ReferenceLine x={depletionBase} stroke="rgba(220,38,38,0.4)" strokeDasharray="3 3"
                    label={{ value: `Depletes ${depletionBase}`, position: 'top', fontSize: 9, fill: '#dc2626', fontFamily: "'Cabinet Grotesk', sans-serif" }} />
                )}
                <Area type="monotone" dataKey="optimistic" name="Optimistic" stroke="#16a34a" fill="url(#gOpt)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                <Area type="monotone" dataKey="base" name="Base" stroke="#7a1c2e" fill="url(#gBase)" strokeWidth={2.5} dot={false} />
                <Area type="monotone" dataKey="pessimistic" name="Conservative" stroke="#d97706" fill="url(#gPess)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                <Line type="monotone" dataKey="required" name="Target" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls={false} />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
              {[
                { color: '#7a1c2e', label: `Base (${fmtPct(rates.base)})`, dash: false },
                { color: '#16a34a', label: `Optimistic (+2%)`, dash: true },
                { color: '#d97706', label: `Conservative (−2%)`, dash: true },
                { color: '#ef4444', label: 'Target corpus', dash: true },
              ].map(({ color, label, dash }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6b5c52' }}>
                  <div style={{
                    width: 20, height: 2.5, borderRadius: 2, background: color, opacity: dash ? 0.7 : 1,
                    backgroundImage: dash ? `repeating-linear-gradient(90deg, ${color} 0, ${color} 5px, transparent 5px, transparent 9px)` : undefined,
                  }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Primary sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 4 }}>
            <SliderInput
              label="Monthly investment"
              value={monthlyInvestment} min={0} max={20000} step={50}
              format={(v) => fmtSGD(v)}
              onChange={(v) => set('monthlyInvestment', v)}
              tooltip="How much you invest from your income each month. This is the most powerful lever — every dollar you invest compounds over time."
            />
            <SliderInput
              label="Retirement age"
              value={retirementAge} min={45} max={75} step={1}
              format={(v) => `Age ${v}`}
              parse={(s) => parseInt(s.replace(/[^0-9]/g, ''), 10)}
              onChange={(v) => set('retirementAge', v)}
              tooltip="When you plan to stop working. Retiring later gives your investments more time to grow AND reduces the number of years your portfolio needs to last."
            />
            <SliderInput
              label="Desired monthly income"
              value={desiredMonthlyIncome} min={1000} max={30000} step={250}
              format={(v) => fmtSGD(v)}
              onChange={(v) => set('desiredMonthlyIncome', v)}
              tooltip="What you want to spend each month in today's dollars. We adjust this forward for inflation to find your required corpus at retirement."
            />

            {/* Scenario strip */}
            <div style={{ borderTop: '1px solid rgba(42,31,26,0.07)', paddingTop: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a89070', margin: '0 0 8px' }}>
                Scenario range
              </p>
              {([
                { key: 'pessimistic' as const, label: 'Conservative', rate: rates.pessimistic, color: '#d97706' },
                { key: 'base' as const, label: 'Base', rate: rates.base, color: '#7a1c2e' },
                { key: 'optimistic' as const, label: 'Optimistic', rate: rates.optimistic, color: '#16a34a' },
              ]).map(({ key, label, rate, color }) => {
                const proj = scenarioProj[key]
                const diff = reqCorpus - proj
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(42,31,26,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 3, height: 14, borderRadius: 2, background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: '#6b5c52' }}>{label}</span>
                      <span style={{ fontSize: 10, color: '#a89070' }}>{fmtPct(rate)}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#2a1f1a' }}>{fmtSGD(proj)}</span>
                      <span style={{ fontSize: 10, color: diff <= 0 ? '#16a34a' : '#7a1c2e', marginLeft: 6 }}>
                        {diff <= 0 ? `+${fmtSGD(-diff)}` : `-${fmtSGD(diff)}`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* ── 3. What It Takes — Trinity ── */}
      <Card style={{ borderLeft: '4px solid #7a1c2e' }}>
        <div style={{ marginBottom: 20 }}>
          <Eyebrow>The Investment Trinity</Eyebrow>
          <SectionTitle>Three levers. Pick any two.</SectionTitle>
          <p style={{ fontSize: 12, color: '#a89070', margin: '8px 0 0', lineHeight: 1.6 }}>
            Fix any two — the third is a consequence of the math.
            {' '}
            {onTrack
              ? `You're on track at ${fmtPct(annualRate)} returns, retiring at ${retirementAge}, investing ${fmtSGD(monthlyInvestment)}/mo.`
              : `To retire at ${retirementAge} with ${fmtSGD(desiredMonthlyIncome)}/mo, you need to move at least one lever below.`}
          </p>
        </div>

        <div className="grid-3col" style={{ gap: 14 }}>
          {[
            {
              icon: '💰', eyebrow: 'Lever 1 — Invest more',
              headline: onTrack ? `${fmtSGD(monthlyInvestment)}/mo` : `${fmtSGD(trinityPMT)}/mo`,
              body: onTrack
                ? `Your current ${fmtSGD(monthlyInvestment)}/mo is sufficient.`
                : `Invest ${fmtSGD(trinityPMT)}/mo to retire at ${retirementAge} at ${fmtPct(annualRate)} returns.`,
              badge: !onTrack ? `+${fmtSGD(trinityPMT - monthlyInvestment)}/mo more` : null,
              badgeColor: '#7a1c2e',
              borderColor: onTrack ? 'rgba(22,163,74,0.2)' : 'rgba(122,28,46,0.2)',
              bg: onTrack ? 'rgba(22,163,74,0.04)' : 'rgba(122,28,46,0.04)',
            },
            {
              icon: '⏳', eyebrow: 'Lever 2 — Wait longer',
              headline: `Age ${trinityAge}`,
              body: trinityAge === retirementAge
                ? `Retiring at ${retirementAge} works with your current investment rate.`
                : `Retire at ${trinityAge} — ${trinityAge - retirementAge} extra year${trinityAge - retirementAge !== 1 ? 's' : ''} of growth.`,
              badge: trinityAge > retirementAge ? `+${trinityAge - retirementAge} yr${trinityAge - retirementAge !== 1 ? 's' : ''}` : null,
              badgeColor: '#c4a882',
              borderColor: 'rgba(196,168,130,0.3)',
              bg: 'rgba(196,168,130,0.05)',
            },
            {
              icon: '📈', eyebrow: 'Lever 3 — Earn more',
              headline: `${fmtPct(trinityReturn)} p.a.`,
              body: trinityReturn <= annualRate
                ? `Your ${fmtPct(annualRate)} target is already sufficient.`
                : `Achieve ${fmtPct(trinityReturn)} p.a. returns to retire at ${retirementAge} investing ${fmtSGD(monthlyInvestment)}/mo.`,
              badge: trinityReturn > annualRate ? `+${fmtPct(trinityReturn - annualRate)} above target` : null,
              badgeColor: '#d97706',
              borderColor: 'rgba(217,119,6,0.2)',
              bg: 'rgba(217,119,6,0.04)',
            },
          ].map(({ icon, eyebrow, headline, body, badge, badgeColor, borderColor, bg }) => (
            <div key={eyebrow} style={{ background: bg, border: `2px solid ${borderColor}`, borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a89070', margin: 0 }}>{eyebrow}</p>
              </div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#2a1f1a', margin: '0 0 6px' }}>{headline}</p>
              <p style={{ fontSize: 12, color: '#a89070', margin: badge ? '0 0 8px' : '0', lineHeight: 1.5 }}>{body}</p>
              {badge && (
                <span style={{ fontSize: 11, fontWeight: 700, color: badgeColor, background: `${badgeColor}15`, padding: '3px 8px', borderRadius: 5 }}>{badge}</span>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(42,31,26,0.03)', borderRadius: 8 }}>
          <p style={{ fontSize: 12, color: '#6b5c52', margin: 0, lineHeight: 1.7 }}>
            <strong>The advisor's take:</strong> Investing {fmtSGD(trinityPMT)}/mo, retiring at {trinityAge}, or targeting {fmtPct(trinityReturn)} returns — you can pick any one. Most advisors recommend a blend: slightly more invested each month, a slightly longer horizon, and a diversified portfolio targeting {fmtPct(Math.min(0.08, (trinityReturn + annualRate) / 2))}.
          </p>
        </div>
      </Card>

      {/* ── 4. Details (expandable) ── */}
      <Card>
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
            width: 28, height: 28, borderRadius: '50%', background: 'rgba(42,31,26,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#a89070', flexShrink: 0,
          }}>
            {showDetails ? '−' : '+'}
          </div>
        </button>

        {showDetails && (
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* Advanced sliders */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a89070', margin: '0 0 16px' }}>
                Return & economic assumptions
              </p>
              <div className="grid-3col" style={{ gap: 28 }}>
                <div>
                  <SliderInput
                    label="Expected portfolio return"
                    value={annualRate} min={0.02} max={0.15} step={0.005}
                    format={(v) => `${(v * 100).toFixed(1)}%`}
                    parse={(s) => parseFloat(s.replace(/[^0-9.]/g, '')) / 100}
                    onChange={(v) => set('annualRate', v)}
                    tooltip="Annual return on your investments. SGX STI ETF has historically returned ~7–8%. A global index fund targets 7–10%. Higher returns require higher risk — be realistic."
                  />
                  {annualRate > 0.10 && (
                    <p style={{ fontSize: 11, color: '#d97706', fontWeight: 600, margin: '6px 0 0' }}>⚠ High assumption — implies significant portfolio risk</p>
                  )}
                </div>
                <div>
                  <SliderInput
                    label="Inflation rate"
                    value={inflationRate} min={0.01} max={0.07} step={0.005}
                    format={(v) => `${(v * 100).toFixed(1)}%`}
                    parse={(s) => parseFloat(s.replace(/[^0-9.]/g, '')) / 100}
                    onChange={(v) => set('inflationRate', v)}
                    tooltip="Singapore's long-run CPI has averaged 2–3% p.a. Inflation means your desired income in retirement needs to be larger in nominal terms. S$5,000 today costs more to fund 30 years from now."
                  />
                  {inflationRate < 0.02 && (
                    <p style={{ fontSize: 11, color: '#d97706', fontWeight: 600, margin: '6px 0 0' }}>⚠ Below Singapore's historical average of ~2–3%</p>
                  )}
                </div>
                <SliderInput
                  label="Safe withdrawal rate (SWR)"
                  value={dividendYield} min={0.02} max={0.10} step={0.005}
                  format={(v) => `${(v * 100).toFixed(1)}%`}
                  parse={(s) => parseFloat(s.replace(/[^0-9.]/g, '')) / 100}
                  onChange={(v) => set('dividendYield', v)}
                  tooltip="The 4% rule: withdraw 4% of your portfolio per year and it should last 30+ years. 3% is more conservative. 5% depletes faster. This rate directly sets how large your required corpus must be."
                />
              </div>
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(196,168,130,0.06)', borderRadius: 8, borderLeft: '3px solid #c4a882' }}>
                <p style={{ fontSize: 12, color: '#6b5c52', margin: 0, lineHeight: 1.7 }}>
                  <strong>How these connect:</strong> <em>Desired income ÷ SWR</em> = required corpus.
                  <em> Current savings + monthly investments growing at the return rate</em> = projected corpus.
                  Inflation makes the target grow every year you delay starting.
                </p>
              </div>
            </div>

            {/* CPF */}
            <div>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: 12 }}
                onClick={() => setShowCPFDetail(v => !v)}
              >
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a89070', margin: 0 }}>
                  CPF breakdown
                </p>
                <span style={{ fontSize: 14, color: '#a89070' }}>{showCPFDetail ? '−' : '+'}</span>
              </div>

              <div className="grid-3col" style={{ gap: 12, marginBottom: 12 }}>
                {[
                  { label: 'OA Balance', value: fmtSGD(cpfOa), rate: '2.5% p.a.', color: '#7a1c2e', note: 'Ordinary Account — housing, investments. 2.5% guaranteed.' },
                  { label: 'SA Balance', value: fmtSGD(cpfSa), rate: '4% p.a.', color: '#c4a882', note: 'Special Account — retirement only. 4% guaranteed. Transfers to RA at 55.' },
                  { label: 'CPF Life est.', value: `${fmtSGD(Math.round(cpfMonthlyPayout))}/mo`, rate: 'from age 65', color: '#16a34a', note: `Projected RA: ${fmtSGD(Math.round(cpfFVAtRetirement))}. ~$650/mo per $100K RA (Standard plan).` },
                ].map(({ label, value, rate, color, note }) => (
                  <div key={label} style={{ background: 'rgba(253,248,242,0.7)', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(42,31,26,0.06)' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a89070', margin: '0 0 3px' }}>{label}</p>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color, margin: '0 0 2px' }}>{value}</p>
                    <p style={{ fontSize: 10, fontWeight: 600, color: '#c4a882', margin: 0 }}>{rate}</p>
                    {showCPFDetail && <p style={{ fontSize: 11, color: '#a89070', margin: '6px 0 0', lineHeight: 1.5 }}>{note}</p>}
                  </div>
                ))}
              </div>

              {cpfMa > 0 && (
                <div style={{ padding: '8px 14px', background: 'rgba(59,130,246,0.04)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.12)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>🏥</span>
                  <p style={{ fontSize: 12, margin: 0, color: '#6b5c52' }}>
                    <strong style={{ color: '#3b82f6' }}>Medisave (MA): {fmtSGD(cpfMa)}</strong> — healthcare reserve only, excluded from retirement corpus
                  </p>
                </div>
              )}

              {showCPFDetail && (
                <Explain>
                  <strong>How CPF feeds into this plan:</strong><br />
                  1. OA + SA compound at their respective rates until 55, when both transfer to your Retirement Account (RA).<br />
                  2. RA grows to an estimated <strong>{fmtSGD(Math.round(cpfFVAtRetirement))}</strong> by retirement (blended 3.5%).<br />
                  3. CPF Life Standard pays approximately <strong>{fmtSGD(Math.round(cpfMonthlyPayout))}/month</strong> from age 65 for life — your guaranteed income floor.<br />
                  4. This floor is worth <strong>{fmtSGD(Math.round(cpfCapitalized))}</strong> as a capitalised corpus — so your investments only need to cover <strong>{fmtSGD(Math.max(0, reqCorpus - cpfCapitalized))}</strong>.
                </Explain>
              )}

              {/* CPF toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 12 }}>
                <input
                  type="checkbox" checked={showCPF}
                  onChange={(e) => setShowCPF(e.target.checked)}
                  style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#7a1c2e' }}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6b5c52' }}>Include CPF Life payout in retirement corpus</span>
              </label>
            </div>

          </div>
        )}
      </Card>

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
          requiredCorpus: Math.round(reqCorpus),
          projectedCorpus: Math.round(projCorpus),
          gap: Math.round(gap),
          onTrack,
          trinityPMT,
          trinityAge,
          trinityReturn: Math.round(trinityReturn * 1000) / 10,
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
