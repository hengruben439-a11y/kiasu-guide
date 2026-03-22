'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import AIInsightPanel from '@/components/ui/AIInsightPanel'

interface Props {
  monthlyIncome: number
  monthlyExpenses: number
  liquidSavings: number
  cpfOa: number
  cpfSa: number
  cpfMa: number
  monthlyInvestment: number
  retirementAge: number
  desiredMonthlyIncome: number
  dividendYield: number
  targetReturnRate: number
  inflationRate: number
  currentAge: number | null
  totalCoverage: number
  userId: string
}

interface HistoryPoint {
  recorded_date: string
  score: number
}

function formatSGD(v: number): string {
  return `S$${Math.round(v).toLocaleString('en-SG')}`
}

function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0)
  const raf = useRef<number | null>(null)
  const start = useRef<number | null>(null)

  useEffect(() => {
    start.current = null
    const step = (timestamp: number) => {
      if (start.current === null) start.current = timestamp
      const progress = Math.min((timestamp - start.current) / duration, 1)
      setValue(Math.round(progress * target))
      if (progress < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, duration])

  return value
}

export default function FinancialHealthScore(props: Props) {
  const {
    monthlyIncome, monthlyExpenses, liquidSavings,
    cpfOa, cpfSa, cpfMa, monthlyInvestment,
    retirementAge, desiredMonthlyIncome, dividendYield,
    targetReturnRate, inflationRate, currentAge, totalCoverage, userId,
  } = props

  const [history, setHistory] = useState<HistoryPoint[]>([])

  // ─── Scoring ──────────────────────────────────────────────────────────────
  const annualIncome = monthlyIncome * 12
  const protection = annualIncome > 0
    ? Math.min(totalCoverage / (annualIncome * 10), 1) * 30
    : 0

  const age = currentAge ?? 35
  const yearsToRetirement = Math.max(0, retirementAge - age)
  const r = targetReturnRate / 12
  const n = yearsToRetirement * 12
  const cpfTotal = cpfOa + cpfSa + cpfMa
  const fvSavings = liquidSavings * Math.pow(1 + targetReturnRate, yearsToRetirement)
  const fvCpf = cpfTotal * Math.pow(1 + targetReturnRate, yearsToRetirement)
  const fvMonthly = monthlyInvestment > 0 && r > 0
    ? monthlyInvestment * ((Math.pow(1 + r, n) - 1) / r)
    : monthlyInvestment * n
  const projected = fvSavings + fvMonthly + fvCpf
  const inflationAdjMonthly = desiredMonthlyIncome * Math.pow(1 + inflationRate, yearsToRetirement)
  const required = dividendYield > 0
    ? (inflationAdjMonthly * 12) / dividendYield
    : inflationAdjMonthly * 240
  const retirement = required > 0
    ? Math.min(projected / required, 1) * 25
    : 0

  const liquidity = monthlyExpenses > 0
    ? Math.min(liquidSavings / (monthlyExpenses * 6), 1) * 20
    : 0

  const debt = monthlyIncome > monthlyExpenses ? 15 : 0

  const investment = monthlyIncome > 0
    ? Math.min(monthlyInvestment / (monthlyIncome * 0.2), 1) * 10
    : 0

  const total = Math.round(protection + retirement + liquidity + debt + investment)

  // ─── Threshold ────────────────────────────────────────────────────────────
  const threshold =
    total >= 86 ? { label: 'Strong', color: '#b59b5c' } :
    total >= 66 ? { label: 'On Track', color: '#2563eb' } :
    total >= 41 ? { label: 'Building', color: '#d97706' } :
                  { label: 'Needs Attention', color: '#dc2626' }

  // ─── Animated score ───────────────────────────────────────────────────────
  const displayScore = useCountUp(total, 1200)
  const circumference = 2 * Math.PI * 70
  const [ringProgress, setRingProgress] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setRingProgress(total / 100), 120)
    return () => clearTimeout(timer)
  }, [total])

  // ─── Record today's score + load history ──────────────────────────────────
  useEffect(() => {
    if (total === 0) return
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    // Upsert today's score (idempotent — unique on user_id, recorded_date)
    supabase.from('health_score_history').upsert(
      {
        user_id: userId,
        recorded_date: today,
        score: total,
        dim_protection: Math.round(protection),
        dim_retirement: Math.round(retirement),
        dim_liquidity: Math.round(liquidity),
        dim_debt: debt,
        dim_investment: Math.round(investment),
      },
      { onConflict: 'user_id,recorded_date' }
    ).then(() => {
      // Load last 12 data points for the chart
      supabase
        .from('health_score_history')
        .select('recorded_date, score')
        .eq('user_id', userId)
        .order('recorded_date', { ascending: true })
        .limit(12)
        .then(({ data }) => {
          if (data && data.length > 0) setHistory(data as HistoryPoint[])
        })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, userId])

  // ─── Dimensions ───────────────────────────────────────────────────────────
  const dimensions = [
    {
      name: 'Protection',
      score: Math.round(protection),
      max: 30,
      insight: annualIncome > 0
        ? `Coverage is ${(totalCoverage / annualIncome).toFixed(1)}× income — target is 10×`
        : 'Add your insurance policies to measure coverage',
    },
    {
      name: 'Retirement',
      score: Math.round(retirement),
      max: 25,
      insight: required > 0
        ? `Projected S$${(projected / 1e6).toFixed(2)}M vs required S$${(required / 1e6).toFixed(2)}M`
        : 'Set your retirement goals to calculate progress',
    },
    {
      name: 'Liquidity',
      score: Math.round(liquidity),
      max: 20,
      insight: monthlyExpenses > 0
        ? `${(liquidSavings / monthlyExpenses).toFixed(1)} months of expenses saved — target is 6`
        : 'Add your expenses to calculate emergency fund coverage',
    },
    {
      name: 'Debt Management',
      score: debt,
      max: 15,
      insight: monthlyIncome > monthlyExpenses
        ? 'Income exceeds expenses — no debt pressure detected'
        : 'Expenses exceed income — review your spending',
    },
    {
      name: 'Investment',
      score: Math.round(investment),
      max: 10,
      insight: monthlyIncome > 0
        ? `Investing ${((monthlyInvestment / monthlyIncome) * 100).toFixed(1)}% of income — target is 20%`
        : 'Add your monthly investment to calculate discipline score',
    },
  ]

  // ─── Action cards for weakest dimensions ─────────────────────────────────
  const sorted = [...dimensions].sort((a, b) => (a.score / a.max) - (b.score / b.max))
  const actionDims = total < 86 ? sorted.slice(0, 2) : []

  function actionText(d: typeof dimensions[0]): string {
    if (d.name === 'Protection') {
      const target = annualIncome * 10
      const gap = Math.max(0, target - totalCoverage)
      return gap > 0
        ? `Add S$${Math.round(gap / 1000)}K of life or TPD coverage to reach the recommended 10× income`
        : 'Review your existing policies to ensure coverage remains adequate'
    }
    if (d.name === 'Retirement') {
      const shortfall = Math.max(0, required - projected)
      if (shortfall <= 0) return 'You are on track — maintain your current contribution rate'
      const addMonthly = required > 0 && n > 0
        ? Math.max(0, shortfall * (r / (Math.pow(1 + r, n) - 1)))
        : 0
      return `Increase monthly contributions by ${formatSGD(addMonthly)} to close the retirement gap`
    }
    if (d.name === 'Liquidity') {
      const target = monthlyExpenses * 6
      const gap = Math.max(0, target - liquidSavings)
      return `Build ${formatSGD(gap)} more in liquid savings to reach a 6-month emergency buffer`
    }
    if (d.name === 'Debt Management') {
      return `Reduce monthly expenses by ${formatSGD(monthlyExpenses - monthlyIncome)} to bring your budget back into surplus`
    }
    if (d.name === 'Investment') {
      const target = monthlyIncome * 0.2
      const gap = Math.max(0, target - monthlyInvestment)
      return `Increase monthly investment by ${formatSGD(gap)} to reach the 20% income discipline target`
    }
    return ''
  }

  // ─── Benchmark cards ──────────────────────────────────────────────────────
  const savingsRate = monthlyIncome > 0
    ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100
    : 0
  const coverageMultiple = annualIncome > 0 ? totalCoverage / annualIncome : 0

  const card = {
    background: 'rgba(122,28,46,0.06)',
    border: '1px solid rgba(196,168,130,0.15)',
    borderRadius: 14,
    backdropFilter: 'blur(12px)',
  } as const

  function dimColor(score: number, max: number) {
    const pct = max > 0 ? score / max : 0
    return pct >= 0.8 ? '#16a34a' : pct >= 0.5 ? '#d97706' : '#dc2626'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Score ring + dimension bars ─────────────────────────────────── */}
      <div className="grid-score" style={{ gap: 20 }}>

        {/* Ring */}
        <div style={{ ...card, padding: '36px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 16px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Overall Score
          </p>

          <svg width={160} height={160} style={{ display: 'block' }}>
            {/* Track */}
            <circle cx={80} cy={80} r={70} fill="none" stroke="rgba(196,168,130,0.12)" strokeWidth={12} />
            {/* Animated progress */}
            <motion.circle
              cx={80} cy={80} r={70}
              fill="none"
              stroke={threshold.color}
              strokeWidth={12}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - ringProgress)}
              transform="rotate(-90 80 80)"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference * (1 - ringProgress) }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
            {/* Score number */}
            <text
              x={80} y={72}
              textAnchor="middle"
              fontFamily="'Playfair Display', serif"
              fontSize={52}
              fontWeight={700}
              fill={threshold.color}
            >
              {displayScore}
            </text>
            <text
              x={80} y={94}
              textAnchor="middle"
              fontFamily="'Cabinet Grotesk', sans-serif"
              fontSize={12}
              fill="rgba(253,248,242,0.55)"
            >
              / 100
            </text>
          </svg>

          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 18, fontWeight: 700,
            color: threshold.color, margin: '12px 0 0',
          }}>
            {threshold.label}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.55)', margin: '6px 0 0', textAlign: 'center', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Composite of 5 financial dimensions
          </p>
        </div>

        {/* Dimension bars */}
        <div style={{ ...card, padding: '28px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 4px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Score Breakdown
          </p>
          {dimensions.map((dim, i) => {
            const pct = dim.max > 0 ? (dim.score / dim.max) * 100 : 0
            const color = dimColor(dim.score, dim.max)
            return (
              <motion.div
                key={dim.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.35 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                    {dim.name}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                    {dim.score} <span style={{ color: 'rgba(253,248,242,0.55)', fontWeight: 400 }}>/ {dim.max}</span>
                  </span>
                </div>

                {/* Bar track */}
                <div style={{ height: 7, background: 'rgba(196,168,130,0.10)', borderRadius: 4, overflow: 'hidden', marginBottom: 5 }}>
                  <motion.div
                    style={{ height: '100%', borderRadius: 4, background: color }}
                    initial={{ width: '0%' }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.4 + i * 0.08, duration: 0.7, ease: 'easeOut' }}
                  />
                </div>

                <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.55)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  {dim.insight}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ── Action cards ─────────────────────────────────────────────────── */}
      {actionDims.length > 0 && (
        <div style={{ ...card, padding: '24px 28px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9b2040', margin: '0 0 16px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            What&apos;s Dragging You Down
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {actionDims.map((dim, i) => (
              <motion.div
                key={dim.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.35 }}
                style={{
                  background: 'rgba(122,28,46,0.08)',
                  border: '1px solid rgba(155,32,64,0.20)',
                  borderRadius: 12, padding: '18px 20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#9b2040', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                    {dim.name}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', background: 'rgba(220,38,38,0.10)', padding: '2px 8px', borderRadius: 20, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                    {dim.score}/{dim.max} pts
                  </span>
                </div>
                <p style={{ fontSize: 13, color: '#fdf8f2', margin: 0, lineHeight: 1.5, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  {actionText(dim)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Score history ──────────────────────────────────────────────────── */}
      <div style={{ ...card, padding: '24px 28px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 4px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Score History
        </p>
        <p style={{ fontSize: 13, fontFamily: "'Playfair Display', serif", fontWeight: 700, color: '#fdf8f2', margin: '0 0 16px' }}>
          Your progress over time
        </p>

        {history.length < 2 ? (
          <div style={{
            background: 'rgba(196,168,130,0.05)', border: '1px dashed rgba(196,168,130,0.20)',
            borderRadius: 10, padding: '20px 18px', textAlign: 'center',
          }}>
            <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.55)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              {history.length === 0
                ? 'Recording your first score now — check back tomorrow to see your trend.'
                : `${history.length} data point recorded. Come back after another session to see your trend.`}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={history} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="recorded_date"
                tick={{ fontSize: 10, fill: 'rgba(253,248,242,0.35)', fontFamily: "'Cabinet Grotesk', sans-serif" }}
                tickFormatter={(v: string) => {
                  const d = new Date(v)
                  return `${d.getDate()}/${d.getMonth() + 1}`
                }}
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'rgba(253,248,242,0.35)', fontFamily: "'Cabinet Grotesk', sans-serif" }} />
              <Tooltip
                formatter={(v: unknown) => [`${v} / 100`, 'Health Score']}
                labelFormatter={(l: unknown) => typeof l === 'string' ? new Date(l).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' }) : ''}
                contentStyle={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: 12, borderRadius: 8, background: 'rgba(10,6,5,0.95)', border: '1px solid rgba(196,168,130,0.3)', color: '#fdf8f2' }}
              />
              <ReferenceLine y={66} stroke="rgba(196,168,130,0.3)" strokeDasharray="4 3" label={{ value: 'On Track', position: 'insideTopRight', fontSize: 9, fill: '#c4a882', fontFamily: "'Cabinet Grotesk', sans-serif" }} />
              <Line
                type="monotone" dataKey="score" name="Health Score"
                stroke={threshold.color} strokeWidth={2.5} dot={{ fill: threshold.color, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Benchmark comparison ─────────────────────────────────────────── */}
      <div style={{ ...card, padding: '24px 28px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 16px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Singapore Benchmarks
        </p>
        <div className="grid-2col" style={{ gap: 14 }}>

          {/* Savings rate benchmark */}
          <div style={{
            background: 'rgba(122,28,46,0.06)', border: '1px solid rgba(196,168,130,0.12)',
            borderRadius: 12, padding: '18px 20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#fdf8f2', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif", lineHeight: 1.3 }}>
                MAS recommends saving<br />at least 20% of income
              </p>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                background: savingsRate >= 20 ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.10)',
                color: savingsRate >= 20 ? '#16a34a' : '#dc2626',
                fontFamily: "'Cabinet Grotesk', sans-serif",
                whiteSpace: 'nowrap',
              }}>
                {savingsRate >= 20 ? 'On track' : 'Below target'}
              </span>
            </div>
            <div style={{ height: 6, background: 'rgba(196,168,130,0.10)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: savingsRate >= 20 ? '#16a34a' : '#d97706',
                width: `${Math.min(100, Math.max(0, savingsRate / 30 * 100))}%`,
                transition: 'width 0.8s ease',
              }} />
            </div>
            <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.55)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Your rate: <strong style={{ color: '#fdf8f2' }}>{savingsRate.toFixed(1)}%</strong>
              {' · '}Target: 20%
            </p>
          </div>

          {/* Coverage benchmark */}
          <div style={{
            background: 'rgba(122,28,46,0.06)', border: '1px solid rgba(196,168,130,0.12)',
            borderRadius: 12, padding: '18px 20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#fdf8f2', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif", lineHeight: 1.3 }}>
                Recommended: 10× annual<br />income in life coverage
              </p>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                background: coverageMultiple >= 10 ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.10)',
                color: coverageMultiple >= 10 ? '#16a34a' : '#dc2626',
                fontFamily: "'Cabinet Grotesk', sans-serif",
                whiteSpace: 'nowrap',
              }}>
                {coverageMultiple >= 10 ? 'Adequate' : 'Under-covered'}
              </span>
            </div>
            <div style={{ height: 6, background: 'rgba(196,168,130,0.10)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: coverageMultiple >= 10 ? '#16a34a' : coverageMultiple >= 5 ? '#d97706' : '#dc2626',
                width: `${Math.min(100, (coverageMultiple / 10) * 100)}%`,
                transition: 'width 0.8s ease',
              }} />
            </div>
            <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.55)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Your coverage: <strong style={{ color: '#fdf8f2' }}>{coverageMultiple.toFixed(1)}×</strong>
              {' · '}Target: 10×
            </p>
          </div>
        </div>
      </div>

      <AIInsightPanel
        tool="health-score"
        data={{
          score: total,
          protection: Math.round(protection),
          retirement: Math.round(retirement),
          liquidity: Math.round(liquidity),
          debt,
          investment: Math.round(investment),
          threshold: threshold.label,
        }}
        autoRefresh
      />

    </div>
  )
}
