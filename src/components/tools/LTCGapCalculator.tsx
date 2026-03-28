'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'

// ─── Fixed assumptions ────────────────────────────────────────────────────────
const DEFAULT_DURATION_YEARS = 15
const LTC_INFLATION = 0.04
const DEFAULT_CARESHIELD_MONTHLY = 662
const AVG_LTC_MONTHLY = 2952

// ─── Derived calculations ─────────────────────────────────────────────────────
function calcTotalLTCCost(durationYears: number): number {
  let total = 0
  for (let year = 0; year < durationYears; year++) {
    total += AVG_LTC_MONTHLY * 12 * Math.pow(1 + LTC_INFLATION, year)
  }
  return Math.round(total)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatSGD(v: number): string {
  return `S$${Math.round(v).toLocaleString('en-SG')}`
}

// ─── Count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1400): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    startRef.current = null

    function step(timestamp: number) {
      if (startRef.current === null) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  return value
}

// ─── Dynamic helpers ──────────────────────────────────────────────────────────
function buildYearRows(coverage: number, durationYears: number) {
  return Array.from({ length: durationYears }, (_, i) => {
    const monthlyLTC = Math.round(AVG_LTC_MONTHLY * Math.pow(1 + LTC_INFLATION, i))
    const gap = monthlyLTC - coverage  // can be negative (surplus)
    return { year: i + 1, monthlyLTC, careshield: coverage, gap }
  })
}

function buildChartData(coverage: number, durationYears: number) {
  const totalLTC = calcTotalLTCCost(durationYears)
  const coverageTotal = coverage * 12 * durationYears
  const surplus = Math.max(0, coverageTotal - totalLTC)
  const gapTotal = Math.max(0, totalLTC - coverageTotal)
  if (surplus > 0) {
    return [
      { name: 'LTC Cost', value: totalLTC, fill: '#a89070' },
      { name: 'Coverage Surplus', value: surplus, fill: '#16a34a' },
    ]
  }
  return [
    { name: 'Your Coverage', value: Math.min(coverageTotal, totalLTC), fill: '#16a34a' },
    { name: 'Protection Gap', value: gapTotal, fill: '#b91c1c' },
  ]
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div
      style={{
        background: 'rgba(10,6,5,0.95)',
        border: '1px solid rgba(196,168,130,0.3)',
        borderRadius: 8,
        padding: '10px 16px',
        fontFamily: "'Cabinet Grotesk', sans-serif",
        fontSize: 13,
        color: '#fdf8f2',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      <p style={{ margin: 0, fontWeight: 700 }}>{label || payload[0]?.name}</p>
      <p style={{ margin: '4px 0 0', color: payload[0]?.payload?.fill ?? '#9b2040' }}>
        {formatSGD(payload[0]?.value)}
      </p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
interface LTCProps {
  initialLtcCoverage?: number  // pre-loaded from benefit_blocks (careshield/ltc policies)
}

export default function LTCGapCalculator({ initialLtcCoverage }: LTCProps = {}) {
  const [userCoverage, setUserCoverage] = useState(initialLtcCoverage ?? DEFAULT_CARESHIELD_MONTHLY)
  const [durationYears, setDurationYears] = useState(DEFAULT_DURATION_YEARS)
  const [showAssumptions, setShowAssumptions] = useState(false)

  // Sync if prop changes (e.g. parent fetches data after mount)
  useEffect(() => {
    if (initialLtcCoverage !== undefined) setUserCoverage(initialLtcCoverage)
  }, [initialLtcCoverage])

  // Dynamic calculations — all derived from userCoverage + durationYears
  const TOTAL_LTC_COST = useMemo(() => calcTotalLTCCost(durationYears), [durationYears])
  const monthlyGap = AVG_LTC_MONTHLY - userCoverage  // negative = surplus
  const coverageTotal = userCoverage * 12 * durationYears
  const totalGap = TOTAL_LTC_COST - coverageTotal  // negative = surplus
  const yearRows = useMemo(() => buildYearRows(userCoverage, durationYears), [userCoverage, durationYears])
  const chartData = useMemo(() => buildChartData(userCoverage, durationYears), [userCoverage, durationYears])

  const absMonthlyGap = Math.abs(monthlyGap)
  const animatedGap = useCountUp(absMonthlyGap, 1400)
  const isSurplus = monthlyGap < 0
  const isFullyCovered = monthlyGap === 0
  const gapReduction = DEFAULT_CARESHIELD_MONTHLY < userCoverage && AVG_LTC_MONTHLY > DEFAULT_CARESHIELD_MONTHLY
    ? Math.round(((userCoverage - DEFAULT_CARESHIELD_MONTHLY) / (AVG_LTC_MONTHLY - DEFAULT_CARESHIELD_MONTHLY)) * 100)
    : 0

  const cardStyle: React.CSSProperties = {
    background: 'rgba(122,28,46,0.06)',
    border: '1px solid rgba(196,168,130,0.15)',
    borderRadius: 12,
    padding: '1.5rem',
    backdropFilter: 'blur(12px)',
  }

  const statLabelStyle: React.CSSProperties = {
    fontFamily: "'Cabinet Grotesk', sans-serif",
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(253,248,242,0.55)',
    marginBottom: '0.4rem',
  }

  const statValueStyle: React.CSSProperties = {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#fdf8f2',
    lineHeight: 1.1,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Headline stat ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          ...cardStyle,
          textAlign: 'center',
          padding: '2.5rem 2rem',
          background: 'rgba(122,28,46,0.10)',
          borderColor: 'rgba(196,168,130,0.25)',
        }}
      >
        <p
          style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontSize: '0.8rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(253,248,242,0.55)',
            marginBottom: '0.75rem',
          }}
        >
          {isSurplus ? 'Monthly Coverage Surplus' : isFullyCovered ? 'Monthly Gap' : 'Monthly Protection Gap'}
        </p>
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '3.5rem',
            fontWeight: 700,
            color: isSurplus ? '#16a34a' : isFullyCovered ? '#d97706' : '#9b2040',
            lineHeight: 1,
            marginBottom: '0.75rem',
          }}
        >
          {isSurplus ? '+' : ''}S${animatedGap.toLocaleString('en-SG')}
          <span
            style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: '1.25rem',
              fontWeight: 500,
              color: 'rgba(253,248,242,0.55)',
              marginLeft: '0.4rem',
            }}
          >
            {isSurplus ? 'surplus/mo' : isFullyCovered ? 'fully covered' : 'per month'}
          </span>
        </div>
        <p
          style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontSize: '1rem',
            color: 'rgba(253,248,242,0.55)',
            margin: 0,
          }}
        >
          The monthly gap CareShield Life doesn&apos;t cover.
        </p>
      </motion.div>

      {/* ── Your coverage input ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05, ease: 'easeOut' }}
        style={cardStyle}
      >
        <p style={{ ...statLabelStyle, color: '#c4a882', marginBottom: '0.75rem' }}>
          Your CareShield Life + Supplement Payout
        </p>
        <p style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: '0.85rem', color: 'rgba(253,248,242,0.55)', marginBottom: '1rem' }}>
          Enter your total monthly payout including any ElderShield or CareShield supplements.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(253,248,242,0.07)' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: 'linear-gradient(90deg, rgba(155,32,64,0.5), #16a34a)',
                width: `${Math.min(100, ((userCoverage - 600) / (5000 - 600)) * 100)}%`,
                transition: 'width 0.1s',
              }} />
            </div>
            <input
              type="range" min={600} max={5000} step={50} value={userCoverage}
              onChange={(e) => setUserCoverage(Number(e.target.value))}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
            />
          </div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 700, color: '#fdf8f2', minWidth: 120, textAlign: 'right' }}>
            {formatSGD(userCoverage)}/mo
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: '0.7rem', color: 'rgba(253,248,242,0.3)' }}>S$600</span>
          <span style={{ fontSize: '0.7rem', color: 'rgba(253,248,242,0.3)' }}>S$5,000</span>
        </div>
        {gapReduction > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: '1rem', padding: '12px 16px',
              background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)',
              borderRadius: 10,
            }}
          >
            <p style={{ fontSize: '0.85rem', color: '#16a34a', margin: 0, fontWeight: 600, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Your supplement erases {Math.min(100, gapReduction)}% of the shortfall — {monthlyGap > 0 ? `${formatSGD(monthlyGap)}/mo still uncovered` : 'gap fully covered!'}
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* ── Care duration slider ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
        style={cardStyle}
      >
        <p style={{ ...statLabelStyle, color: '#c4a882', marginBottom: '0.75rem' }}>
          Expected Care Duration
        </p>
        <p style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: '0.85rem', color: 'rgba(253,248,242,0.55)', marginBottom: '1rem' }}>
          CareShield Life pays for life, but care costs depend on how long you need support. Adjust to see the total impact.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(253,248,242,0.07)' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: 'linear-gradient(90deg, rgba(155,32,64,0.5), #d97706)',
                width: `${((durationYears - 5) / (30 - 5)) * 100}%`,
                transition: 'width 0.1s',
              }} />
            </div>
            <input
              type="range" min={5} max={30} step={1} value={durationYears}
              onChange={(e) => setDurationYears(Number(e.target.value))}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
            />
          </div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 700, color: '#fdf8f2', minWidth: 100, textAlign: 'right' }}>
            {durationYears} years
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: '0.7rem', color: 'rgba(253,248,242,0.3)' }}>5 years</span>
          <span style={{ fontSize: '0.7rem', color: 'rgba(253,248,242,0.3)' }}>30 years</span>
        </div>
      </motion.div>

      {/* ── 3 summary stat cards ── */}
      <div className="grid-3col" style={{ gap: '1rem' }}>
        {[
          {
            label: 'Total LTC Cost',
            sublabel: `${durationYears} years, inflation-adjusted`,
            value: formatSGD(TOTAL_LTC_COST),
            color: '#fdf8f2',
            delay: 0.1,
          },
          {
            label: 'Your Coverage',
            sublabel: `${formatSGD(userCoverage)}/month × ${durationYears} years`,
            value: formatSGD(coverageTotal),
            color: '#16a34a',
            delay: 0.2,
          },
          {
            label: 'Protection Gap',
            sublabel: totalGap > 0 ? 'Total uncovered cost' : 'Fully covered!',
            value: totalGap > 0 ? formatSGD(totalGap) : 'S$0',
            color: totalGap > 0 ? '#b91c1c' : '#16a34a',
            delay: 0.3,
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: stat.delay, ease: 'easeOut' }}
            style={cardStyle}
          >
            <p style={statLabelStyle}>{stat.label}</p>
            <p style={{ ...statValueStyle, color: stat.color }}>{stat.value}</p>
            <p
              style={{
                fontFamily: "'Cabinet Grotesk', sans-serif",
                fontSize: '0.8rem',
                color: 'rgba(253,248,242,0.55)',
                margin: '0.25rem 0 0',
              }}
            >
              {stat.sublabel}
            </p>
          </motion.div>
        ))}
      </div>

      {/* ── Bar chart ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
        style={cardStyle}
      >
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.1rem',
            fontWeight: 700,
            color: '#fdf8f2',
            marginBottom: '0.25rem',
          }}
        >
          Where Your LTC Costs Go
        </p>
        <p
          style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontSize: '0.85rem',
            color: 'rgba(253,248,242,0.55)',
            marginBottom: '1.5rem',
          }}
        >
          Over {durationYears} years, CareShield Life covers only a fraction of total care costs.
        </p>

        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart
            data={chartData}
            margin={{ top: 16, right: 24, left: 16, bottom: 8 }}
          >
            <XAxis
              dataKey="name"
              tick={{
                fontFamily: "'Cabinet Grotesk', sans-serif",
                fontSize: 13,
                fill: 'rgba(253,248,242,0.35)',
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) =>
                v >= 1000 ? `S$${(v / 1000).toFixed(0)}K` : `S$${v}`
              }
              tick={{
                fontFamily: "'Cabinet Grotesk', sans-serif",
                fontSize: 12,
                fill: 'rgba(253,248,242,0.35)',
              }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={TOTAL_LTC_COST}
              stroke="#9b2040"
              strokeDasharray="6 3"
              strokeWidth={2}
              label={{
                value: `Total Cost ${formatSGD(TOTAL_LTC_COST)}`,
                position: 'insideTopRight',
                fontFamily: "'Cabinet Grotesk', sans-serif",
                fontSize: 11,
                fill: '#c4a882',
                fontWeight: 600,
              }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={120}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>

        {/* Manual legend */}
        <div
          style={{
            display: 'flex',
            gap: '1.5rem',
            justifyContent: 'center',
            marginTop: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          {[
            { color: '#16a34a', label: 'CareShield Life covers' },
            { color: '#b91c1c', label: 'Protection gap (uncovered)' },
            { color: '#9b2040', label: `Total LTC cost (${durationYears} yrs)` },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontFamily: "'Cabinet Grotesk', sans-serif",
                fontSize: '0.8rem',
                color: 'rgba(253,248,242,0.55)',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: item.color,
                  flexShrink: 0,
                }}
              />
              {item.label}
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Year-by-year table ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.45, ease: 'easeOut' }}
        style={cardStyle}
      >
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.1rem',
            fontWeight: 700,
            color: '#fdf8f2',
            marginBottom: '0.25rem',
          }}
        >
          Year-by-Year Cost Breakdown
        </p>
        <p
          style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontSize: '0.85rem',
            color: 'rgba(253,248,242,0.55)',
            marginBottom: '1.25rem',
          }}
        >
          LTC costs rise with inflation each year. CareShield stays flat. The gap widens.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: '0.875rem',
            }}
          >
            <thead>
              <tr>
                {['Year', 'Monthly LTC Cost', 'CareShield Payout', 'Monthly Gap'].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: h === 'Year' ? 'left' : 'right',
                        padding: '0.6rem 0.75rem',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'rgba(253,248,242,0.55)',
                        borderBottom: '2px solid rgba(196,168,130,0.15)',
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {yearRows.map((row, i) => (
                <tr
                  key={row.year}
                  style={{
                    background: i % 2 === 0 ? 'transparent' : 'rgba(122,28,46,0.04)',
                  }}
                >
                  <td
                    style={{
                      padding: '0.6rem 0.75rem',
                      color: '#fdf8f2',
                      fontWeight: 600,
                    }}
                  >
                    Year {row.year}
                  </td>
                  <td
                    style={{
                      padding: '0.6rem 0.75rem',
                      textAlign: 'right',
                      color: '#fdf8f2',
                    }}
                  >
                    {formatSGD(row.monthlyLTC)}
                  </td>
                  <td
                    style={{
                      padding: '0.6rem 0.75rem',
                      textAlign: 'right',
                      color: '#16a34a',
                      fontWeight: 600,
                    }}
                  >
                    {formatSGD(row.careshield)}
                  </td>
                  <td
                    style={{
                      padding: '0.6rem 0.75rem',
                      textAlign: 'right',
                      color: '#b91c1c',
                      fontWeight: 700,
                    }}
                  >
                    {formatSGD(row.gap)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td
                  colSpan={4}
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderTop: '2px solid rgba(196,168,130,0.15)',
                    fontFamily: "'Cabinet Grotesk', sans-serif",
                    fontSize: '0.78rem',
                    color: 'rgba(253,248,242,0.55)',
                    fontStyle: 'italic',
                  }}
                >
                  Monthly LTC cost inflated at 4% per annum over {durationYears} years. Your coverage: {formatSGD(userCoverage)}/month. CareShield Life pays for life while severely disabled.
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.div>

      {/* ── CTA section ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.55, ease: 'easeOut' }}
        style={{
          background: 'rgba(196,168,130,0.10)',
          borderRadius: 12,
          padding: '2rem',
          border: '1px solid rgba(196,168,130,0.25)',
        }}
      >
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.35rem',
            fontWeight: 700,
            color: '#fdf8f2',
            marginBottom: '0.75rem',
            lineHeight: 1.3,
          }}
        >
          {monthlyGap > 0 ? 'Close the remaining gap with a supplement.' : 'Your coverage fully protects you.'}
        </p>
        <p
          style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontSize: '1rem',
            color: 'rgba(253,248,242,0.70)',
            margin: 0,
            lineHeight: 1.6,
            maxWidth: '680px',
          }}
        >
          {monthlyGap > 0 ? (
            <>
              At your current coverage of {formatSGD(userCoverage)}/month, there&apos;s still a{' '}
              <strong style={{ color: '#fdf8f2' }}>{formatSGD(monthlyGap)}/month</strong> shortfall.
              Over a decade of care, that compounds to{' '}
              <strong style={{ color: '#fdf8f2' }}>{formatSGD(totalGap)}</strong> out of pocket.
            </>
          ) : (
            <>
              At {formatSGD(userCoverage)}/month, your coverage exceeds average LTC costs.
              You&apos;re well-protected against long-term care expenses.
            </>
          )}
        </p>
      </motion.div>

      {/* ── Assumptions panel ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.65, ease: 'easeOut' }}
        style={{
          ...cardStyle,
          background: 'rgba(122,28,46,0.04)',
          borderColor: 'rgba(196,168,130,0.12)',
        }}
      >
        <button
          onClick={() => setShowAssumptions((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontSize: '0.85rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(253,248,242,0.55)',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              transition: 'transform 0.2s',
              transform: showAssumptions ? 'rotate(90deg)' : 'rotate(0deg)',
              fontSize: '0.75rem',
            }}
          >
            ▶
          </span>
          Assumptions &amp; Sources
        </button>

        {showAssumptions && (
          <div
            style={{
              marginTop: '1rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {[
              {
                label: 'Average LTC Cost',
                value: 'S$2,952/month',
                source: 'Singlife LTC White Paper',
              },
              {
                label: 'CareShield Base Payout',
                value: 'S$662/month',
                source: 'Ministry of Health, Singapore',
              },
              {
                label: 'Care Duration',
                value: `${durationYears} years (adjustable)`,
                source: 'Industry standard assumption',
              },
              {
                label: 'Cost Inflation',
                value: '4% per annum',
                source: 'Singapore healthcare CPI trend',
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(122,28,46,0.06)',
                  borderRadius: 8,
                  border: '1px solid rgba(196,168,130,0.15)',
                }}
              >
                <p
                  style={{
                    fontFamily: "'Cabinet Grotesk', sans-serif",
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'rgba(253,248,242,0.55)',
                    margin: '0 0 0.2rem',
                  }}
                >
                  {item.label}
                </p>
                <p
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#fdf8f2',
                    margin: '0 0 0.2rem',
                  }}
                >
                  {item.value}
                </p>
                <p
                  style={{
                    fontFamily: "'Cabinet Grotesk', sans-serif",
                    fontSize: '0.75rem',
                    color: 'rgba(253,248,242,0.55)',
                    margin: 0,
                    fontStyle: 'italic',
                  }}
                >
                  {item.source}
                </p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
