'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import AIInsightPanel from '@/components/ui/AIInsightPanel'
import SliderInput from '@/components/ui/SliderInput'

interface Props {
  liquid_savings: number
  monthly_investment: number
  retirement_age: number
  target_return_rate: number
  desired_monthly_income: number
  dividend_yield: number
  currentAge: number
}

function formatSGD(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${Math.round(value).toLocaleString()}`
}

function formatSGDFull(value: number): string {
  return `$${Math.round(value).toLocaleString('en-SG')}`
}

function computePMT(corpus: number, savings: number, annualRate: number, years: number): number {
  if (years <= 0) return Infinity
  const r = annualRate / 12
  const n = years * 12
  if (r === 0) {
    return Math.max(0, (corpus - savings) / n)
  }
  const fvExisting = savings * Math.pow(1 + r, n)
  const numerator = (corpus - fvExisting) * r
  const denominator = Math.pow(1 + r, n) - 1
  if (denominator <= 0) return 0
  return Math.max(0, numerator / denominator)
}

function buildProjectionForScenario(
  savings: number,
  pmt: number,
  annualRate: number,
  totalYears: number,
  startOffset: number
): number[] {
  const r = annualRate / 12
  const data: number[] = []
  for (let yr = 0; yr <= totalYears; yr++) {
    if (yr <= startOffset) {
      // During the waiting period, savings sit idle (no contributions)
      const n = yr * 12
      const idleBalance =
        r === 0 ? savings : savings * Math.pow(1 + r, n)
      data.push(Math.round(idleBalance))
    } else {
      const yearsInvested = yr - startOffset
      const n = yearsInvested * 12
      const idleN = startOffset * 12
      const balanceAfterIdle =
        r === 0 ? savings : savings * Math.pow(1 + r, idleN)
      const fvSavings =
        r === 0 ? balanceAfterIdle : balanceAfterIdle * Math.pow(1 + r, n)
      const fvContrib =
        r === 0 ? pmt * n : pmt * ((Math.pow(1 + r, n) - 1) / r)
      data.push(Math.round(fvSavings + fvContrib))
    }
  }
  return data
}

function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0)
  const frameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)
  const startRef = useRef<number | null>(null)
  const startValueRef = useRef(0)
  const targetRef = useRef(target)

  useEffect(() => {
    startValueRef.current = value
    startRef.current = null
    targetRef.current = target
    if (frameRef.current) cancelAnimationFrame(frameRef.current)

    const step = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(startValueRef.current + (targetRef.current - startValueRef.current) * eased))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step)
      }
    }

    frameRef.current = requestAnimationFrame(step)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return value
}

const DELAY_SCENARIOS = [
  { years: 0, label: 'Invest Now', color: '#16a34a' },
  { years: 1, label: 'Wait 1 Year', color: '#d97706' },
  { years: 3, label: 'Wait 3 Years', color: '#ea580c' },
  { years: 5, label: 'Wait 5 Years', color: '#dc2626' },
]

const CARD_STYLES = [
  { bg: '#f0fdf4', border: '#86efac', badge: '#16a34a' },
  { bg: '#fffbeb', border: '#fcd34d', badge: '#d97706' },
  { bg: '#fff7ed', border: '#fdba74', badge: '#ea580c' },
  { bg: '#fef2f2', border: '#fca5a5', badge: '#dc2626' },
]

export default function CostOfWaiting({
  liquid_savings,
  retirement_age,
  target_return_rate,
  desired_monthly_income,
  dividend_yield,
  currentAge,
}: Props) {
  const [sliderDelay, setSliderDelay] = useState(0)

  const effectiveDividendYield = dividend_yield > 0 ? dividend_yield : 0.04
  const corpus = (desired_monthly_income * 12) / effectiveDividendYield
  const yearsToRetirement = Math.max(1, retirement_age - currentAge)
  const maxSlider = Math.min(10, yearsToRetirement - 1)

  const pmtNow = computePMT(corpus, liquid_savings, target_return_rate, yearsToRetirement)

  const scenarios = DELAY_SCENARIOS.map((s) => {
    const pmt = computePMT(corpus, liquid_savings, target_return_rate, yearsToRetirement - s.years)
    const extraPerMonth = s.years === 0 ? 0 : Math.max(0, pmt - pmtNow)
    const remainingYears = yearsToRetirement - s.years
    const totalExtra = extraPerMonth * 12 * (remainingYears > 0 ? remainingYears : 0)
    return { ...s, pmt, extraPerMonth, totalExtra }
  })

  const sliderPmt = computePMT(corpus, liquid_savings, target_return_rate, yearsToRetirement - sliderDelay)
  const sliderExtra = Math.max(0, sliderPmt - pmtNow)
  const animatedSliderExtra = useCountUp(Math.round(sliderExtra))

  // Build chart data
  const chartData = Array.from({ length: yearsToRetirement + 1 }, (_, i) => {
    const age = currentAge + i
    const row: Record<string, number | string> = { age }
    DELAY_SCENARIOS.forEach((s) => {
      const pmt = scenarios.find((sc) => sc.years === s.years)?.pmt ?? 0
      const projection = buildProjectionForScenario(
        liquid_savings,
        pmt === Infinity ? 0 : pmt,
        target_return_rate,
        yearsToRetirement,
        s.years
      )
      row[s.label] = projection[i] ?? 0
    })
    return row
  })

  const fiveYearExtra = scenarios[3]?.extraPerMonth ?? 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "'Playfair Display', serif", color: '#2a1f1a' }}
        >
          Cost of Waiting
        </h2>
        <p className="text-sm" style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Every year of delay costs more than you think. See the real price of waiting.
        </p>
      </div>

      {/* Required corpus callout */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl p-5 border"
        style={{ background: '#fdf8f2', borderColor: '#c4a882' }}
      >
        <p className="text-xs mb-1" style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Target retirement corpus &nbsp;({formatSGD(desired_monthly_income * 12)}/yr ÷&nbsp;
          {(effectiveDividendYield * 100).toFixed(1)}% yield)
        </p>
        <p
          className="text-3xl font-bold"
          style={{ color: '#7a1c2e', fontFamily: "'Playfair Display', serif" }}
        >
          {formatSGDFull(corpus)}
        </p>
      </motion.div>

      {/* Scenario cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {scenarios.map((s, i) => {
          const style = CARD_STYLES[i]
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              className="rounded-2xl p-4 border"
              style={{ background: style.bg, borderColor: style.border }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-2"
                style={{ color: s.color, fontFamily: "'Cabinet Grotesk', sans-serif" }}
              >
                {s.label}
              </p>
              <p
                className="text-xl font-bold"
                style={{ color: '#2a1f1a', fontFamily: "'Playfair Display', serif" }}
              >
                {s.pmt === Infinity ? 'Impossible' : formatSGDFull(s.pmt)}
                {s.pmt !== Infinity && (
                  <span
                    className="text-xs font-normal ml-1"
                    style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}
                  >
                    /mo
                  </span>
                )}
              </p>
              <div className="mt-2">
                {s.years === 0 ? (
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{
                      background: style.badge,
                      color: '#fff',
                      fontFamily: "'Cabinet Grotesk', sans-serif",
                    }}
                  >
                    Baseline
                  </span>
                ) : s.extraPerMonth > 0 ? (
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{
                      background: style.badge,
                      color: '#fff',
                      fontFamily: "'Cabinet Grotesk', sans-serif",
                    }}
                  >
                    +{formatSGDFull(s.extraPerMonth)}/mo extra
                  </span>
                ) : null}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Interactive delay slider */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-2xl p-6 border"
        style={{ background: '#fff8f0', borderColor: '#c4a882' }}
      >
        <div className="flex items-center justify-between mb-3">
          <p
            className="font-semibold text-base"
            style={{ color: '#2a1f1a', fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
            Delay simulator
          </p>
          <span
            className="text-xs px-3 py-1 rounded-full font-medium"
            style={{ background: '#7a1c2e', color: '#fff', fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
            {sliderDelay === 0
              ? 'Invest today'
              : `Wait ${sliderDelay} year${sliderDelay > 1 ? 's' : ''}`}
          </span>
        </div>

        <SliderInput
          label=""
          value={sliderDelay}
          min={0}
          max={maxSlider}
          step={1}
          format={(v) => (v === 0 ? 'Today' : `${v} yr${v > 1 ? 's' : ''}`)}
          onChange={setSliderDelay}
        />

        <AnimatePresence mode="wait">
          {sliderDelay > 0 ? (
            <motion.div
              key={`delay-${sliderDelay}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              className="text-center"
            >
              <p
                className="text-sm mb-1"
                style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}
              >
                Waiting{' '}
                <strong style={{ color: '#7a1c2e' }}>
                  {sliderDelay} year{sliderDelay > 1 ? 's' : ''}
                </strong>{' '}
                costs you an extra
              </p>
              <p
                className="text-4xl font-bold"
                style={{ color: '#dc2626', fontFamily: "'Playfair Display', serif" }}
              >
                {formatSGDFull(animatedSliderExtra)}
                <span
                  className="text-base font-normal ml-1"
                  style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}
                >
                  /month
                </span>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="now"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <p
                className="text-sm"
                style={{ color: '#16a34a', fontFamily: "'Cabinet Grotesk', sans-serif" }}
              >
                Investing today gives you the lowest possible required monthly contribution.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Key insight banner */}
      {fiveYearExtra > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="rounded-2xl p-5 border-l-4 flex items-start gap-3"
          style={{ background: '#fef2f2', borderLeftColor: '#dc2626' }}
        >
          <span className="text-2xl mt-0.5" aria-hidden>⏰</span>
          <div>
            <p
              className="font-bold text-base"
              style={{ color: '#dc2626', fontFamily: "'Playfair Display', serif" }}
            >
              Waiting 5 years costs you an extra {formatSGDFull(fiveYearExtra)}/month
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}
            >
              That&rsquo;s{' '}
              {formatSGDFull(scenarios[3]?.totalExtra ?? 0)} in additional contributions over the
              remaining investment window — money that could have been compounding instead.
            </p>
          </div>
        </motion.div>
      )}

      {/* AI Insight */}
      <AIInsightPanel
        tool="cost-of-waiting"
        autoRefresh
        data={{
          currentAge,
          delay: sliderDelay,
          pmtNow: Math.round(pmtNow),
          pmtDelayed: Math.round(sliderPmt),
          delta: Math.round(sliderExtra),
          targetCorpus: Math.round(corpus),
        }}
        label="Analyse the Cost of Delay"
      />

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="rounded-2xl border p-6"
        style={{ background: '#fff', borderColor: '#e8ddd0' }}
      >
        <p
          className="font-semibold mb-4"
          style={{ color: '#2a1f1a', fontFamily: "'Cabinet Grotesk', sans-serif" }}
        >
          Projected savings by scenario
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0e8e0" />
            <XAxis
              dataKey="age"
              label={{
                value: 'Age',
                position: 'insideBottomRight',
                offset: -8,
                fontSize: 12,
                fill: '#a89070',
              }}
              tick={{ fontSize: 11, fill: '#a89070' }}
            />
            <YAxis
              tickFormatter={(v) => formatSGD(v as number)}
              tick={{ fontSize: 11, fill: '#a89070' }}
              width={72}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [formatSGDFull(Number(value)), String(name ?? '')]}
              labelFormatter={(label) => `Age ${label}`}
              contentStyle={{
                background: '#fdf8f2',
                border: '1px solid #c4a882',
                borderRadius: 12,
                fontFamily: "'Cabinet Grotesk', sans-serif",
                fontSize: 13,
              }}
            />
            <Legend
              wrapperStyle={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: 12 }}
            />
            {DELAY_SCENARIOS.map((s) => (
              <Line
                key={s.label}
                type="monotone"
                dataKey={s.label}
                stroke={s.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  )
}
