'use client'

import { useEffect, useRef, useState } from 'react'
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
  Legend,
} from 'recharts'

// ─── Fixed assumptions ────────────────────────────────────────────────────────
const DURATION_YEARS = 10
const LTC_INFLATION = 0.04
const CARESHIELD_MONTHLY = 662
const AVG_LTC_MONTHLY = 2952

// ─── Derived calculations ─────────────────────────────────────────────────────
function calcTotalLTCCost(): number {
  let total = 0
  for (let year = 0; year < DURATION_YEARS; year++) {
    total += AVG_LTC_MONTHLY * 12 * Math.pow(1 + LTC_INFLATION, year)
  }
  return Math.round(total)
}

const TOTAL_LTC_COST = calcTotalLTCCost()                          // ~$425,304
const CARESHIELD_TOTAL = CARESHIELD_MONTHLY * 12 * DURATION_YEARS // ~$79,440
const MONTHLY_GAP = AVG_LTC_MONTHLY - CARESHIELD_MONTHLY          // $2,290
const ANNUAL_GAP = MONTHLY_GAP * 12
const TOTAL_GAP = TOTAL_LTC_COST - CARESHIELD_TOTAL

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

// ─── Year-by-year table data ──────────────────────────────────────────────────
const yearRows = Array.from({ length: DURATION_YEARS }, (_, i) => {
  const monthlyLTC = Math.round(AVG_LTC_MONTHLY * Math.pow(1 + LTC_INFLATION, i))
  const gap = monthlyLTC - CARESHIELD_MONTHLY
  return {
    year: i + 1,
    monthlyLTC,
    careshield: CARESHIELD_MONTHLY,
    gap,
  }
})

// ─── Chart data ───────────────────────────────────────────────────────────────
const chartData = [
  {
    name: 'CareShield Life',
    value: CARESHIELD_TOTAL,
    fill: '#16a34a',
  },
  {
    name: 'Protection Gap',
    value: TOTAL_GAP,
    fill: '#b91c1c',
  },
]

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e8ddd4',
        borderRadius: 8,
        padding: '10px 16px',
        fontFamily: "'Cabinet Grotesk', sans-serif",
        fontSize: 13,
        color: '#2a1f1a',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      <p style={{ margin: 0, fontWeight: 700 }}>{label || payload[0]?.name}</p>
      <p style={{ margin: '4px 0 0', color: payload[0]?.payload?.fill ?? '#7a1c2e' }}>
        {formatSGD(payload[0]?.value)}
      </p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LTCGapCalculator() {
  const animatedGap = useCountUp(MONTHLY_GAP, 1400)
  const [showAssumptions, setShowAssumptions] = useState(false)

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e8ddd4',
    borderRadius: 12,
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  }

  const statLabelStyle: React.CSSProperties = {
    fontFamily: "'Cabinet Grotesk', sans-serif",
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#a89070',
    marginBottom: '0.4rem',
  }

  const statValueStyle: React.CSSProperties = {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#2a1f1a',
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
          background: 'linear-gradient(135deg, #fff 0%, #fdf8f2 100%)',
          borderColor: '#c4a882',
        }}
      >
        <p
          style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontSize: '0.8rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#a89070',
            marginBottom: '0.75rem',
          }}
        >
          Monthly Protection Gap
        </p>
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '3.5rem',
            fontWeight: 700,
            color: '#7a1c2e',
            lineHeight: 1,
            marginBottom: '0.75rem',
          }}
        >
          S${animatedGap.toLocaleString('en-SG')}
          <span
            style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: '1.25rem',
              fontWeight: 500,
              color: '#a89070',
              marginLeft: '0.4rem',
            }}
          >
            per month
          </span>
        </div>
        <p
          style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontSize: '1rem',
            color: '#a89070',
            margin: 0,
          }}
        >
          The monthly gap CareShield Life doesn&apos;t cover.
        </p>
      </motion.div>

      {/* ── 3 summary stat cards ── */}
      <div className="grid-3col" style={{ gap: '1rem' }}>
        {[
          {
            label: 'Total LTC Cost',
            sublabel: '10 years, inflation-adjusted',
            value: formatSGD(TOTAL_LTC_COST),
            color: '#2a1f1a',
            delay: 0.1,
          },
          {
            label: 'CareShield Covers',
            sublabel: `S$${CARESHIELD_MONTHLY}/month × 10 years`,
            value: formatSGD(CARESHIELD_TOTAL),
            color: '#16a34a',
            delay: 0.2,
          },
          {
            label: 'Protection Gap',
            sublabel: 'Total uncovered cost',
            value: formatSGD(TOTAL_GAP),
            color: '#b91c1c',
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
                color: '#a89070',
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
            color: '#2a1f1a',
            marginBottom: '0.25rem',
          }}
        >
          Where Your LTC Costs Go
        </p>
        <p
          style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontSize: '0.85rem',
            color: '#a89070',
            marginBottom: '1.5rem',
          }}
        >
          Over 10 years, CareShield Life covers only a fraction of total care costs.
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
                fill: '#a89070',
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
                fill: '#a89070',
              }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={TOTAL_LTC_COST}
              stroke="#7a1c2e"
              strokeDasharray="6 3"
              strokeWidth={2}
              label={{
                value: `Total Cost ${formatSGD(TOTAL_LTC_COST)}`,
                position: 'insideTopRight',
                fontFamily: "'Cabinet Grotesk', sans-serif",
                fontSize: 11,
                fill: '#7a1c2e',
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
            { color: '#7a1c2e', label: 'Total LTC cost (10 yrs)' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontFamily: "'Cabinet Grotesk', sans-serif",
                fontSize: '0.8rem',
                color: '#a89070',
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
            color: '#2a1f1a',
            marginBottom: '0.25rem',
          }}
        >
          Year-by-Year Cost Breakdown
        </p>
        <p
          style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontSize: '0.85rem',
            color: '#a89070',
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
                        color: '#a89070',
                        borderBottom: '2px solid #e8ddd4',
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
                    background: i % 2 === 0 ? 'transparent' : '#fdf8f2',
                  }}
                >
                  <td
                    style={{
                      padding: '0.6rem 0.75rem',
                      color: '#2a1f1a',
                      fontWeight: 600,
                    }}
                  >
                    Year {row.year}
                  </td>
                  <td
                    style={{
                      padding: '0.6rem 0.75rem',
                      textAlign: 'right',
                      color: '#2a1f1a',
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
                    borderTop: '2px solid #e8ddd4',
                    fontFamily: "'Cabinet Grotesk', sans-serif",
                    fontSize: '0.78rem',
                    color: '#a89070',
                    fontStyle: 'italic',
                  }}
                >
                  Monthly LTC cost inflated at 4% per annum. CareShield base payout is fixed at S$662/month.
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
          background: 'linear-gradient(135deg, #c4a882 0%, #d4b892 100%)',
          borderRadius: 12,
          padding: '2rem',
          border: '1px solid #b09060',
        }}
      >
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.35rem',
            fontWeight: 700,
            color: '#2a1f1a',
            marginBottom: '0.75rem',
            lineHeight: 1.3,
          }}
        >
          This is the gap a CareShield supplement covers.
        </p>
        <p
          style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontSize: '1rem',
            color: '#3a2a1a',
            margin: 0,
            lineHeight: 1.6,
            maxWidth: '680px',
          }}
        >
          A CareShield supplement can fill this S$2,290/month gap, ensuring care costs never
          become a financial burden on your family. Without it, the shortfall compounds year
          after year — reaching{' '}
          <strong>{formatSGD(TOTAL_GAP)}</strong> over a decade of care.
        </p>
      </motion.div>

      {/* ── Assumptions panel ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.65, ease: 'easeOut' }}
        style={{
          ...cardStyle,
          background: '#fdf8f2',
          borderColor: '#e8ddd4',
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
            color: '#a89070',
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
                value: '10 years',
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
                  background: '#fff',
                  borderRadius: 8,
                  border: '1px solid #e8ddd4',
                }}
              >
                <p
                  style={{
                    fontFamily: "'Cabinet Grotesk', sans-serif",
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#a89070',
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
                    color: '#2a1f1a',
                    margin: '0 0 0.2rem',
                  }}
                >
                  {item.value}
                </p>
                <p
                  style={{
                    fontFamily: "'Cabinet Grotesk', sans-serif",
                    fontSize: '0.75rem',
                    color: '#a89070',
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
