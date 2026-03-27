'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid,
} from 'recharts'
import SliderInput from '@/components/ui/SliderInput'
import AIInsightPanel from '@/components/ui/AIInsightPanel'
import {
  nominalDesiredAtRetirement, fvLumpSum,
  cpfLifeMonthly, medisaveProjected,
  requiredSavingsAtMilestone,
  requiredInvestmentCorpus, projectedInvestmentCorpus,
  solveForRateV2, solveForAgeV2, solveForMonthlyV2,
  buildWealthProjectionV2,
  type PassiveIncomeStream,
} from '@/lib/tools/retirement/calculations'
import {
  BarChart, Bar, Cell, LabelList,
} from 'recharts'

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
type SolvedFor = LockedField | 'none'
type RetirementMode = 'dividend' | 'drawdown'

let _streamId = 0
function newId() { return `stream_${++_streamId}` }

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtSGD(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `S$${(v / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `S$${Math.round(v / 1_000)}K`
  return `S$${Math.round(v).toLocaleString('en-SG')}`
}

function fmtFull(v: number): string {
  return `S$${Math.round(v).toLocaleString('en-SG')}`
}

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`
}

// ── Funding Ring ──────────────────────────────────────────────────────────────

function FundingRing({ pct, size = 120 }: { pct: number; size?: number }) {
  const r = size / 2 - 10
  const circ = 2 * Math.PI * r
  const filled = Math.min(1, pct) * circ
  const color = pct >= 1 ? '#10b981' : pct >= 0.75 ? '#f59e0b' : '#ef4444'
  const cx = size / 2

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(196,168,130,0.1)" strokeWidth={9} />
        <circle
          cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={9}
          strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
      }}>
        <span style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: Math.round(size * 0.2), fontWeight: 700, color, lineHeight: 1,
        }}>
          {Math.min(999, Math.round(pct * 100))}%
        </span>
        <span style={{ fontSize: 9, color: 'rgba(253,248,242,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          funded
        </span>
      </div>
    </div>
  )
}

// ── Feasibility helpers ───────────────────────────────────────────────────────

function rateColor(r: number) {
  return r <= 0.07 ? '#10b981' : r <= 0.09 ? '#f59e0b' : r <= 0.12 ? '#f97316' : '#ef4444'
}
function rateLabel(r: number) {
  return r <= 0.07 ? 'Achievable — broad index funds'
    : r <= 0.09 ? 'Stretched — active allocation needed'
    : r <= 0.12 ? 'Difficult — concentrated risk'
    : 'Unrealistic for most investors'
}
function ageColor(a: number) {
  return a >= 65 ? '#10b981' : a >= 60 ? '#f59e0b' : a >= 55 ? '#f97316' : '#ef4444'
}
function ageLabel(a: number) {
  return a >= 65 ? 'Comfortable timeline' : a >= 60 ? 'Slightly early — manageable'
    : a >= 55 ? 'Ambitious — requires discipline' : 'Very aggressive target'
}
function monthlyColor(m: number, income: number) {
  if (income <= 0) return '#f59e0b'
  const p = m / income
  return p < 0.1 ? '#f59e0b' : p <= 0.35 ? '#10b981' : p <= 0.5 ? '#f97316' : '#ef4444'
}
function monthlyLabel(m: number, income: number) {
  if (income <= 0) return 'Add income to your profile'
  const p = (m / income) * 100
  return p < 10 ? `${p.toFixed(0)}% of income — invest more`
    : p <= 35 ? `${p.toFixed(0)}% of income — healthy`
    : p <= 50 ? `${p.toFixed(0)}% of income — stretched`
    : `${p.toFixed(0)}% of income — unsustainable`
}

// ── Tri-lock Card ─────────────────────────────────────────────────────────────

function TriLockCard({
  fieldKey, solvedFor, onSolve,
  label, sublabel, solvedValue, userValue, displayValue,
  indicatorColor, indicatorLabel,
  sliderMin, sliderMax, sliderStep, sliderFormat, onSliderChange,
}: {
  fieldKey: LockedField; solvedFor: SolvedFor; onSolve: () => void
  label: string; sublabel: string; solvedValue: string
  userValue: number; displayValue: string
  indicatorColor: string; indicatorLabel: string
  sliderMin: number; sliderMax: number; sliderStep: number
  sliderFormat: (v: number) => string; onSliderChange: (v: number) => void
}) {
  const isSolved = solvedFor === fieldKey
  const isManual = solvedFor === 'none'
  const pct = sliderMax > sliderMin ? ((userValue - sliderMin) / (sliderMax - sliderMin)) * 100 : 0

  return (
    <div style={{
      background: isSolved ? 'rgba(155,32,64,0.1)' : 'rgba(196,168,130,0.03)',
      border: `1px solid ${isSolved ? 'rgba(155,32,64,0.3)' : 'rgba(196,168,130,0.1)'}`,
      borderRadius: 12, padding: '16px 18px', transition: 'background 0.2s, border-color 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: isSolved ? '#c4a882' : 'rgba(253,248,242,0.75)', margin: '0 0 2px' }}>{label}</p>
          <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.3)', margin: 0 }}>{sublabel}</p>
        </div>
        {!isManual && (
          <button
            onClick={!isSolved ? onSolve : undefined}
            disabled={isSolved}
            style={{
              padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              border: `1px solid ${isSolved ? 'rgba(155,32,64,0.35)' : 'rgba(196,168,130,0.2)'}`,
              background: isSolved ? 'rgba(155,32,64,0.18)' : 'rgba(196,168,130,0.05)',
              color: isSolved ? '#c4a882' : 'rgba(196,168,130,0.55)',
              cursor: isSolved ? 'default' : 'pointer', transition: 'all 0.15s',
              flexShrink: 0, whiteSpace: 'nowrap',
            }}
          >
            {isSolved ? '⟳ Solving' : 'Solve for →'}
          </button>
        )}
      </div>

      {isSolved && !isManual ? (
        <div>
          <p style={{
            fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700,
            color: '#c4a882', margin: '0 0 8px', animation: 'pulse-glow 2s ease-in-out infinite',
          }}>
            {solvedValue}
          </p>
          <span style={{
            display: 'inline-block', padding: '2px 10px', borderRadius: 20,
            background: `${indicatorColor}18`, color: indicatorColor,
            border: `1px solid ${indicatorColor}40`, fontSize: 10, fontWeight: 600,
          }}>
            {indicatorLabel}
          </span>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: '#fdf8f2' }}>
              {displayValue}
            </span>
            <span style={{
              display: 'inline-block', padding: '2px 10px', borderRadius: 20,
              background: `${indicatorColor}18`, color: indicatorColor,
              border: `1px solid ${indicatorColor}40`, fontSize: 10, fontWeight: 600,
            }}>
              {indicatorLabel}
            </span>
          </div>
          <div style={{ position: 'relative', height: 5, borderRadius: 3, background: 'rgba(253,248,242,0.07)' }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`,
              borderRadius: 3, background: 'linear-gradient(90deg, rgba(155,32,64,0.5), #9b2040)',
              transition: 'width 0.05s',
            }} />
            <input
              type="range" min={sliderMin} max={sliderMax} step={sliderStep} value={userValue}
              onChange={(e) => onSliderChange(Number(e.target.value))}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
            />
            <div style={{
              position: 'absolute', top: '50%', left: `${pct}%`,
              transform: 'translate(-50%, -50%)',
              width: 13, height: 13, borderRadius: '50%',
              background: '#0a0605', border: '2.5px solid #9b2040',
              boxShadow: '0 0 8px rgba(155,32,64,0.5)',
              pointerEvents: 'none', transition: 'left 0.05s',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 9, color: 'rgba(196,168,130,0.3)' }}>{sliderFormat(sliderMin)}</span>
            <span style={{ fontSize: 9, color: 'rgba(196,168,130,0.3)' }}>{sliderFormat(sliderMax)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Procrastination Chart ─────────────────────────────────────────────────────

interface ProcrastPoint {
  delay: number; label: string
  monthlyNeeded: number; extraPerMonth: number
  totalPaid: number; totalExtra: number
}

function ProcrastTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number; payload: ProcrastPoint }>; label?: string
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: 'rgba(10,6,5,0.97)', border: '1px solid rgba(196,168,130,0.2)',
      borderRadius: 10, padding: '12px 16px', fontFamily: "'Cabinet Grotesk', sans-serif", minWidth: 220,
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 8px' }}>
        {d.delay === 0 ? 'Start Investing Now' : `Delay ${d.delay} year${d.delay > 1 ? 's' : ''}`}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ fontSize: 12, color: 'rgba(253,248,242,0.55)' }}>Monthly needed</span>
          <span style={{ fontSize: 12, color: '#fdf8f2', fontWeight: 700 }}>S${d.monthlyNeeded.toLocaleString()}/mo</span>
        </div>
        {d.extraPerMonth > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ fontSize: 12, color: 'rgba(253,248,242,0.55)' }}>Extra vs now</span>
            <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 700 }}>+S${d.extraPerMonth.toLocaleString()}/mo</span>
          </div>
        )}
        <div style={{ borderTop: '1px solid rgba(196,168,130,0.1)', marginTop: 4, paddingTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ fontSize: 12, color: 'rgba(253,248,242,0.55)' }}>Total invested</span>
            <span style={{ fontSize: 12, color: 'rgba(253,248,242,0.7)', fontWeight: 600 }}>
              S${(d.totalPaid / 1000).toFixed(0)}K
            </span>
          </div>
          {d.totalExtra > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 2 }}>
              <span style={{ fontSize: 12, color: 'rgba(253,248,242,0.55)' }}>Extra total paid</span>
              <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
                +S${(d.totalExtra / 1000).toFixed(0)}K
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ProcrastinationChart({
  data, baseMonthlyNeeded, effectiveYears, effectiveRate,
}: {
  data: ProcrastPoint[]
  baseMonthlyNeeded: number
  effectiveYears: number
  effectiveRate: number
}) {
  const worst = data[data.length - 1]
  const extraYears = worst?.delay ?? 0
  const extraMonthly = worst?.extraPerMonth ?? 0

  return (
    <div style={{
      background: 'rgba(122,28,46,0.06)', border: '1px solid rgba(196,168,130,0.15)',
      borderRadius: 16, overflow: 'hidden',
    }}>
      {/* Gradient header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(155,32,64,0.28) 0%, rgba(122,28,46,0.14) 55%, rgba(245,158,11,0.08) 100%)',
        borderBottom: '1px solid rgba(196,168,130,0.1)',
        padding: '22px 28px',
      }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 6px' }}>
          The Cost of Procrastination
        </p>
        <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.5)', margin: '0 0 16px', lineHeight: 1.5, maxWidth: 560 }}>
          Every year you delay, compound interest works against you — you lose growth time and must invest more each month to hit the same target by the same retirement age.
        </p>

        {extraMonthly > 0 && (
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Start now card */}
            <div style={{
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 12, padding: '12px 18px',
            }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(16,185,129,0.8)', margin: '0 0 4px' }}>Start now</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#10b981', margin: '0 0 2px' }}>
                S${Math.round(baseMonthlyNeeded).toLocaleString()}/mo
              </p>
              <p style={{ fontSize: 10, color: 'rgba(253,248,242,0.4)', margin: 0 }}>for {effectiveYears} years</p>
            </div>

            <span style={{ fontSize: 20, color: 'rgba(253,248,242,0.15)', flexShrink: 0 }}>→</span>

            {/* Worst delay card */}
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 12, padding: '12px 18px',
            }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(239,68,68,0.8)', margin: '0 0 4px' }}>Wait {extraYears} yr{extraYears > 1 ? 's' : ''}</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#ef4444', margin: '0 0 2px' }}>
                S${Math.round(baseMonthlyNeeded + extraMonthly).toLocaleString()}/mo
              </p>
              <p style={{ fontSize: 10, color: 'rgba(253,248,242,0.4)', margin: 0 }}>
                for {effectiveYears - extraYears} years{' '}
                <span style={{ color: '#ef4444', fontWeight: 700 }}>+S${extraMonthly.toLocaleString()}/mo more</span>
              </p>
            </div>

            <div style={{ padding: '8px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10 }}>
              <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(239,68,68,0.6)', margin: '0 0 3px' }}>Extra total paid</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#ef4444', margin: 0 }}>
                +S${((worst?.totalExtra ?? 0) / 1000).toFixed(0)}K
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Chart + breakdown */}
      <div className="grid-procrastination" style={{ padding: '22px 28px', gap: 24, alignItems: 'start' }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.5)', margin: '0 0 12px' }}>
            Monthly investment needed to retire on time
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 20, right: 4, bottom: 0, left: 0 }} barCategoryGap="25%">
              <CartesianGrid stroke="rgba(196,168,130,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'rgba(253,248,242,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `S$${Math.round(v / 1000)}K`} tick={{ fill: 'rgba(253,248,242,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} width={64} />
              <Tooltip content={<ProcrastTooltip />} cursor={{ fill: 'rgba(196,168,130,0.05)' }} />
              <ReferenceLine y={baseMonthlyNeeded} stroke="rgba(16,185,129,0.4)" strokeDasharray="5 3" label={{ value: 'Start now', fill: 'rgba(16,185,129,0.6)', fontSize: 10, position: 'insideTopRight' }} />
              <Bar dataKey="monthlyNeeded" radius={[6, 6, 0, 0]}>
                {data.map((entry) => {
                  const pct = data.length > 1 ? entry.delay / (data.length - 1) : 0
                  const r = Math.round(155 + pct * 84)
                  const g = Math.round(32 - pct * 32)
                  const b = Math.round(64 - pct * 64)
                  const color = entry.delay === 0 ? '#10b981' : `rgb(${r},${g},${b})`
                  return <Cell key={entry.delay} fill={color} />
                })}
                <LabelList dataKey="monthlyNeeded" position="top" formatter={(v: unknown) => `S$${Math.round((v as number) / 1000)}K`} style={{ fill: 'rgba(253,248,242,0.5)', fontSize: 10 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Right: cost breakdown cards */}
        <div style={{ minWidth: 210 }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.5)', margin: '0 0 10px' }}>
            Extra cost of waiting
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.filter(d => d.delay > 0).map((row) => {
              const pct = data.length > 1 ? row.delay / (data.length - 1) : 0
              const cr = Math.round(155 + pct * 84)
              const cg = Math.round(32 - pct * 32)
              const cb = Math.round(64 - pct * 64)
              const remainingYears = effectiveYears - row.delay
              return (
                <div key={row.delay} style={{
                  background: `rgba(${cr},${cg},${cb},0.1)`,
                  border: `1px solid rgba(${cr},${cg},${cb},0.28)`,
                  borderRadius: 8, padding: '8px 12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(253,248,242,0.75)' }}>
                      Wait {row.delay} yr{row.delay > 1 ? 's' : ''}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: `rgb(${cr},${cg},${cb})` }}>
                      +S${row.extraPerMonth.toLocaleString()}/mo
                    </span>
                  </div>
                  <p style={{ fontSize: 10, color: 'rgba(253,248,242,0.38)', margin: 0 }}>
                    invest {remainingYears} yrs · +S${(row.totalExtra / 1000).toFixed(0)}K extra total
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Chart Tooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ dataKey: string; name: string; value: number; color?: string; payload: Record<string, number | null> }>
  label?: number
}) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{
      background: 'rgba(10,6,5,0.97)', border: '1px solid rgba(196,168,130,0.2)',
      borderRadius: 10, padding: '12px 16px', fontFamily: "'Cabinet Grotesk', sans-serif", minWidth: 200,
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 8px' }}>
        Age {label}
      </p>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
          <span style={{ fontSize: 12, color: 'rgba(253,248,242,0.55)' }}>{p.name}</span>
          <span style={{ fontSize: 12, color: p.color ?? '#fdf8f2', fontWeight: 600 }}>
            {p.dataKey.endsWith('Income') || p.dataKey === 'totalPassiveIncome'
              ? `S$${Math.round(p.value).toLocaleString()}/mo`
              : fmtSGD(p.value)}
          </span>
        </div>
      ))}
      {d?.required != null && (
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(196,168,130,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ fontSize: 12, color: 'rgba(253,248,242,0.55)' }}>Target</span>
            <span style={{ fontSize: 12, color: '#c4a882', fontWeight: 600 }}>{fmtSGD(d.required as number)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Collapsible Section ───────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  eyebrow,
  badge,
  defaultOpen = false,
  children
}: {
  title: string
  eyebrow?: string
  badge?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{
      background: 'rgba(122,28,46,0.06)',
      border: '1px solid rgba(196,168,130,0.15)',
      borderRadius: 16,
      backdropFilter: 'blur(12px)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div>
          {eyebrow && (
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 4px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              {eyebrow}
            </p>
          )}
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#fdf8f2', margin: 0 }}>
            {title}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {badge && !open && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: 'rgba(253,248,242,0.5)',
              padding: '3px 10px', borderRadius: 20,
              background: 'rgba(196,168,130,0.08)', border: '1px solid rgba(196,168,130,0.12)',
              fontFamily: "'Cabinet Grotesk', sans-serif",
            }}>
              {badge}
            </span>
          )}
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ color: '#c4a882', fontSize: 14, lineHeight: 1 }}
          >
            ▼
          </motion.span>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 24px 24px' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function RetirementAnalytics({
  currentAge,
  monthlyIncome,
  currentSavings: initSavings,
  monthlyInvestment: initMonthly,
  retirementAge: initRetAge,
  desiredMonthlyIncome: initDesired,
  inflationRate: initInflation,
  dividendYield: initDY,
  annualRate: initRate,
  cpfOa,
  cpfSa,
  cpfMa,
}: Props) {
  // ── Goal inputs ──────────────────────────────────────────────────────────
  const [desiredMonthly, setDesiredMonthly] = useState(initDesired || 5000)
  const [dividendYield, setDividendYield] = useState(initDY || 0.04)
  const [inflation, setInflation] = useState(initInflation || 0.03)
  const [savings, setSavings] = useState(initSavings || 0)
  const [includeCpf, setIncludeCpf] = useState(true)
  const [showCpfDetail, setShowCpfDetail] = useState(false)

  // ── Tri-lock ─────────────────────────────────────────────────────────────
  const [solvedFor, setSolvedFor] = useState<SolvedFor>('rate')
  const [rate, setRate] = useState(initRate || 0.06)
  const [retAge, setRetAge] = useState(initRetAge || 65)
  const [monthly, setMonthly] = useState(initMonthly || 1000)

  // ── Retirement mode ───────────────────────────────────────────────────────
  const [retirementMode, setRetirementMode] = useState<RetirementMode>('dividend')
  const [fundTotalReturn, setFundTotalReturn] = useState(0.08)
  const [fundFees, setFundFees] = useState(0.015)
  const [drawdownMonthly, setDrawdownMonthly] = useState(initDesired || 5000)

  // ── Passive income streams ────────────────────────────────────────────────
  const [passiveStreams, setPassiveStreams] = useState<PassiveIncomeStream[]>([])
  const [passiveMode, setPassiveMode] = useState<'goal' | 'bonus'>('goal')
  const [showMilestones, setShowMilestones] = useState(false)
  const [showProcrastination, setShowProcrastination] = useState(false)

  function addStream() {
    setPassiveStreams(s => [...s, { id: newId(), name: 'Rental Income', monthlyAmount: 1000, startAge: retAge }])
  }
  function removeStream(id: string) {
    setPassiveStreams(s => s.filter(x => x.id !== id))
  }
  function updateStream(id: string, patch: Partial<PassiveIncomeStream>) {
    setPassiveStreams(s => s.map(x => x.id === id ? { ...x, ...patch } : x))
  }

  // ── Derived calculations ──────────────────────────────────────────────────
  const d = useMemo(() => {
    const userYears = Math.max(1, retAge - currentAge)

    const passiveAtUserRetAge = passiveStreams
      .filter(s => s.startAge <= retAge)
      .reduce((sum, s) => sum + s.monthlyAmount, 0)
    const passiveForCalc = passiveMode === 'goal' ? passiveAtUserRetAge : 0

    // Required investment corpus for the user's locked inputs
    const reqForUserYears = requiredInvestmentCorpus(
      desiredMonthly, inflation, userYears, dividendYield,
      cpfOa, cpfSa, includeCpf, passiveForCalc,
      retirementMode, drawdownMonthly,
    )

    // Actual funded % — always based on user's actual locked inputs, never the solved values
    const actualProjected = projectedInvestmentCorpus(savings, monthly, rate, userYears)
    const actualFundedPct = reqForUserYears > 0 ? actualProjected / reqForUserYears : 0

    // Tri-lock solvers
    const solvedRate = solveForRateV2(savings, monthly, userYears, reqForUserYears)
    const solvedAge = solveForAgeV2(
      currentAge, savings, monthly, rate,
      desiredMonthly, inflation, dividendYield, cpfOa, cpfSa, includeCpf,
      passiveMode === 'goal' ? passiveStreams : [], retirementMode, drawdownMonthly,
    )
    const solvedMonthly = solveForMonthlyV2(savings, rate, userYears, reqForUserYears)

    // Effective values
    const effectiveRate = solvedFor === 'rate' ? solvedRate : rate
    const effectiveRetAge = solvedFor === 'time' ? solvedAge : retAge
    const effectiveMonthly = solvedFor === 'monthly' ? solvedMonthly : monthly
    const effectiveYears = Math.max(1, effectiveRetAge - currentAge)

    // Post-retirement helpers
    const netGrowthRate = fundTotalReturn - dividendYield - fundFees

    // CPF Life at effective retirement
    const cpfMonthlyAtRetirement = includeCpf ? cpfLifeMonthly(cpfOa, cpfSa, effectiveYears) : 0

    // Nominal desired at effective retirement
    const nominalAtRetirement = nominalDesiredAtRetirement(desiredMonthly, inflation, effectiveYears)

    // Passive income at effective retirement
    const passiveAtEffectiveRet = passiveStreams
      .filter(s => s.startAge <= effectiveRetAge)
      .reduce((sum, s) => sum + s.monthlyAmount, 0)

    // Required from portfolio (after CPF + passive) at effective retirement
    const effectiveReq = requiredInvestmentCorpus(
      desiredMonthly, inflation, effectiveYears, dividendYield,
      cpfOa, cpfSa, includeCpf,
      passiveMode === 'goal' ? passiveAtEffectiveRet : 0,
      retirementMode, drawdownMonthly,
    )
    const effectiveProjected = projectedInvestmentCorpus(savings, effectiveMonthly, effectiveRate, effectiveYears)

    // Income at retirement
    const portfolioIncomeAtRetirement = retirementMode === 'dividend'
      ? effectiveProjected * dividendYield / 12
      : drawdownMonthly
    const totalIncomeAtRetirement = portfolioIncomeAtRetirement + cpfMonthlyAtRetirement + passiveAtEffectiveRet

    // Depletion simulation (drawdown mode or negative netGrowthRate)
    let depletionAge: number | null = null
    if (retirementMode === 'drawdown') {
      let balance = effectiveProjected
      const annualDraw = (drawdownMonthly > 0 ? drawdownMonthly : desiredMonthly) * 12
      for (let yr = 0; yr <= 50; yr++) {
        if (balance <= 0) { depletionAge = effectiveRetAge + yr; break }
        balance = balance * (1 + effectiveRate) - annualDraw
      }
    } else if (netGrowthRate < 0) {
      let balance = effectiveProjected
      for (let yr = 0; yr <= 50; yr++) {
        if (balance <= 0) { depletionAge = effectiveRetAge + yr; break }
        balance = balance * (1 + netGrowthRate)
      }
    }

    // Medisave
    const medisave = medisaveProjected(cpfMa, effectiveYears)

    // Income replacement rate
    const incomeReplacementRate = monthlyIncome > 0 ? desiredMonthly / monthlyIncome : 0

    // Milestone tracker
    const milestones: Array<{
      age: number; yearsAway: number; requiredSavings: number; projectedSavings: number; onTrack: boolean
    }> = []
    for (let mAge = Math.ceil((currentAge + 1) / 5) * 5; mAge < effectiveRetAge; mAge += 5) {
      const yearsAway = mAge - currentAge
      const yearsLeft = effectiveRetAge - mAge
      if (yearsLeft <= 0) continue
      const reqSav = requiredSavingsAtMilestone(effectiveReq, effectiveMonthly, effectiveRate, yearsLeft)
      const projSav = projectedInvestmentCorpus(savings, effectiveMonthly, effectiveRate, yearsAway)
      milestones.push({ age: mAge, yearsAway, requiredSavings: reqSav, projectedSavings: projSav, onTrack: projSav >= reqSav })
    }

    const chartData = buildWealthProjectionV2(
      currentAge, effectiveRetAge, savings, effectiveMonthly, effectiveRate,
      desiredMonthly, inflation, dividendYield,
      cpfOa, cpfSa, cpfMa, includeCpf,
      retirementMode, fundTotalReturn, fundFees, drawdownMonthly,
      passiveStreams,
      passiveMode === 'goal' ? passiveStreams : [],
    )

    // ── Procrastination chart ──────────────────────────────────────────────
    // "What if I waited N years to start investing?"
    // Savings still grow during the delay, but you lose N years of contributions.
    const baseMonthlyNeeded = solveForMonthlyV2(savings, effectiveRate, effectiveYears, effectiveReq)
    const maxDelay = Math.min(10, effectiveYears - 2)
    const procrastinationData: Array<{
      delay: number; label: string
      monthlyNeeded: number; extraPerMonth: number
      totalPaid: number; totalExtra: number
    }> = []
    for (let delay = 0; delay <= Math.max(0, maxDelay); delay++) {
      const delaySavings = fvLumpSum(savings, effectiveRate, delay)
      const delayYears = effectiveYears - delay
      if (delayYears <= 0) break
      const monthlyNeeded = solveForMonthlyV2(delaySavings, effectiveRate, delayYears, effectiveReq)
      procrastinationData.push({
        delay,
        label: delay === 0 ? 'Now' : `+${delay}yr`,
        monthlyNeeded: Math.round(monthlyNeeded),
        extraPerMonth: Math.max(0, Math.round(monthlyNeeded - baseMonthlyNeeded)),
        totalPaid: Math.round(monthlyNeeded * delayYears * 12),
        totalExtra: Math.max(0, Math.round(monthlyNeeded * delayYears * 12 - baseMonthlyNeeded * effectiveYears * 12)),
      })
    }

    return {
      solvedRate, solvedAge, solvedMonthly,
      effectiveRate, effectiveRetAge, effectiveMonthly, effectiveYears,
      actualFundedPct,
      effectiveReq, effectiveProjected,
      netGrowthRate, cpfMonthlyAtRetirement, nominalAtRetirement,
      passiveAtEffectiveRet, portfolioIncomeAtRetirement, totalIncomeAtRetirement,
      depletionAge, medisave, incomeReplacementRate,
      milestones, chartData, baseMonthlyNeeded, procrastinationData,
    }
  }, [
    desiredMonthly, dividendYield, inflation, savings, includeCpf,
    solvedFor, rate, retAge, monthly,
    retirementMode, fundTotalReturn, fundFees, drawdownMonthly,
    passiveStreams, passiveMode, currentAge, monthlyIncome, cpfOa, cpfSa, cpfMa,
  ])

  const verdictColor = d.actualFundedPct >= 1 ? '#10b981' : d.actualFundedPct >= 0.75 ? '#f59e0b' : '#ef4444'
  const verdictText = d.actualFundedPct >= 1 ? 'On Track' : d.actualFundedPct >= 0.75 ? 'At Risk' : 'Off Track'

  // AI context
  const aiContext = `
Retirement plan for age ${currentAge}. Retiring at ${d.effectiveRetAge} (${d.effectiveYears} yrs).
Goal: S$${Math.round(desiredMonthly).toLocaleString()}/mo today → S$${Math.round(d.nominalAtRetirement).toLocaleString()} nominal.
Inflation: ${fmtPct(inflation)}. Dividend yield: ${fmtPct(dividendYield)}.
Funded: ${Math.round(d.actualFundedPct * 100)}% (actual inputs). Required corpus: ${fmtFull(d.effectiveReq)}. Projected: ${fmtFull(d.effectiveProjected)}.
Tri-lock (solving for ${solvedFor}): rate ${fmtPct(d.effectiveRate)}, retire age ${d.effectiveRetAge}, invest ${fmtFull(d.effectiveMonthly)}/mo.
CPF Life: S$${Math.round(d.cpfMonthlyAtRetirement).toLocaleString()}/mo. Mode: ${retirementMode}.
${retirementMode === 'dividend' ? `Fund: ${fmtPct(fundTotalReturn)} total return, ${fmtPct(fundFees)} fees, ${fmtPct(d.netGrowthRate)} net NAV growth.` : `Drawdown: S$${Math.round(drawdownMonthly).toLocaleString()}/mo.`}
Total passive income at retirement: S$${Math.round(d.totalIncomeAtRetirement).toLocaleString()}/mo.
Income (S$${Math.round(monthlyIncome).toLocaleString()}/mo), replacement ${Math.round(d.incomeReplacementRate * 100)}%.
${d.depletionAge ? `Corpus depletes ~age ${d.depletionAge}.` : 'Corpus self-sustaining.'}
  `.trim()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: "'Cabinet Grotesk', sans-serif" }}>

      {/* ── 1. Verdict Banner (ALWAYS VISIBLE) ──────────────────────────────── */}
      <div style={{
        background: 'rgba(122,28,46,0.06)', border: '1px solid rgba(196,168,130,0.15)',
        borderRadius: 18, padding: '28px 32px', backdropFilter: 'blur(12px)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', left: -60, top: -60, width: 240, height: 240,
          background: `radial-gradient(circle, ${verdictColor}12 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
        {/* Plain-English verdict sentence */}
        <div style={{ position: 'relative', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid rgba(196,168,130,0.1)' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 8px' }}>
            Your Retirement Position
          </p>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#fdf8f2', margin: '0 0 6px', lineHeight: 1.4 }}>
            You need{' '}
            <span style={{ color: verdictColor }}>{fmtSGD(d.effectiveReq)}</span>
            {' '}by age {d.effectiveRetAge}. You&apos;re projected to reach{' '}
            <span style={{ color: verdictColor }}>{fmtSGD(d.effectiveProjected)}</span>.
          </p>
          <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.55)', margin: 0 }}>
            You&apos;re{' '}
            <strong style={{ color: verdictColor }}>{Math.round(d.actualFundedPct * 100)}% of the way there</strong>
            {d.actualFundedPct < 1
              ? ` — a ${fmtSGD(Math.abs(d.effectiveProjected - d.effectiveReq))} gap at current pace.`
              : ' — your plan is on track.'
            }
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap', position: 'relative' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <FundingRing pct={d.actualFundedPct} size={124} />
            <p style={{ fontSize: 10, color: 'rgba(253,248,242,0.35)', margin: 0, textAlign: 'center', maxWidth: 120, lineHeight: 1.5 }}>
              Projected ÷ Required corpus, using your actual inputs
            </p>
          </div>

          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-block', padding: '3px 12px', borderRadius: 20,
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                background: `${verdictColor}18`, color: verdictColor, border: `1px solid ${verdictColor}40`,
              }}>
                {verdictText}
              </span>
              <span style={{ fontSize: 13, color: 'rgba(253,248,242,0.4)' }}>
                {d.effectiveYears} years to retirement · Age {d.effectiveRetAge}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
              {[
                { label: 'Required corpus', value: fmtSGD(d.effectiveReq), dim: true },
                { label: 'Projected corpus', value: fmtSGD(d.effectiveProjected), dim: false },
                {
                  label: d.effectiveProjected >= d.effectiveReq ? 'Surplus' : 'Gap',
                  value: fmtSGD(Math.abs(d.effectiveProjected - d.effectiveReq)),
                  color: d.effectiveProjected >= d.effectiveReq ? '#10b981' : '#ef4444',
                },
              ].map(({ label, value, dim, color }) => (
                <div key={label}>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.55)', margin: '0 0 3px' }}>{label}</p>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: color ?? (dim ? 'rgba(253,248,242,0.5)' : '#fdf8f2'), margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="retirement-inflation-panel" style={{ minWidth: 210 }}>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.55)', margin: '0 0 6px' }}>Inflation Reality</p>
            <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.6)', margin: '0 0 3px' }}>S${Math.round(desiredMonthly).toLocaleString()}/mo today becomes</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: '#c4a882', fontWeight: 700, margin: '0 0 16px' }}>
              S${Math.round(d.nominalAtRetirement).toLocaleString()}/mo
            </p>
            {d.depletionAge && d.depletionAge <= 90 ? (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px' }}>
                <p style={{ fontSize: 11, color: '#ef4444', margin: 0, fontWeight: 600 }}>⚠ Corpus runs out ~age {d.depletionAge}</p>
              </div>
            ) : d.effectiveProjected >= d.effectiveReq ? (
              <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '8px 12px' }}>
                <p style={{ fontSize: 11, color: '#10b981', margin: 0, fontWeight: 600 }}>✓ Corpus self-sustaining</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── 2. Your Goals (COLLAPSIBLE, collapsed) ──────────────────────────── */}
      <CollapsibleSection
        title="Your Goals"
        eyebrow="Step 1 · Settings"
        badge={`S$${Math.round(desiredMonthly).toLocaleString()}/mo target`}
        defaultOpen={false}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SliderInput
            label="Desired Monthly Income"
            value={desiredMonthly} min={500} max={20000} step={500}
            format={(v) => `S$${v.toLocaleString()}/mo`}
            tooltip="How much monthly income (in today's dollars) you want at retirement."
            onChange={setDesiredMonthly}
          />
          <SliderInput
            label="Dividend Yield / SWR"
            value={dividendYield} min={0.02} max={0.10} step={0.005}
            format={(v) => `${(v * 100).toFixed(1)}%`}
            tooltip="The annual % your portfolio pays out as income. This determines how large a corpus you need — lower yield = larger corpus needed."
            onChange={setDividendYield}
          />
          <SliderInput
            label="Inflation Rate"
            value={inflation} min={0.01} max={0.06} step={0.005}
            format={(v) => `${(v * 100).toFixed(1)}%`}
            tooltip="Singapore's long-run average is ~2–3%. This inflates the income you'll need at retirement."
            onChange={setInflation}
          />
          {monthlyIncome > 0 && (
            <div style={{ padding: '10px 14px', background: 'rgba(196,168,130,0.04)', border: '1px solid rgba(196,168,130,0.1)', borderRadius: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.45)', margin: '0 0 3px' }}>Monthly Income</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#fdf8f2', margin: 0 }}>S${Math.round(monthlyIncome).toLocaleString()}</p>
            </div>
          )}

          {/* CPF toggle */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showCpfDetail ? 12 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setIncludeCpf(!includeCpf)}
                  style={{
                    width: 36, height: 20, borderRadius: 10, border: 'none',
                    background: includeCpf ? '#9b2040' : 'rgba(196,168,130,0.15)',
                    cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 2, left: includeCpf ? 18 : 2,
                    width: 16, height: 16, borderRadius: '50%', background: '#fdf8f2', transition: 'left 0.2s',
                  }} />
                </button>
                <span style={{ fontSize: 13, fontWeight: 600, color: includeCpf ? '#fdf8f2' : 'rgba(253,248,242,0.4)' }}>
                  Include CPF Life
                </span>
              </div>
              {(cpfOa > 0 || cpfSa > 0) && (
                <button
                  onClick={() => setShowCpfDetail(!showCpfDetail)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#c4a882', padding: 0 }}
                >
                  {showCpfDetail ? '▲ hide' : '▼ details'}
                </button>
              )}
            </div>
            {showCpfDetail && includeCpf && (
              <div style={{ background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 10, padding: '12px 14px', marginTop: 8 }}>
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a78bfa', margin: '0 0 10px' }}>CPF Breakdown</p>
                {[{ l: 'OA', v: cpfOa }, { l: 'SA', v: cpfSa }, { l: 'MA (Medisave)', v: cpfMa }].map(({ l, v }) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'rgba(253,248,242,0.5)' }}>{l}</span>
                    <span style={{ fontSize: 12, color: '#fdf8f2', fontWeight: 600 }}>S${Math.round(v).toLocaleString()}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(167,139,250,0.15)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#a78bfa' }}>Est. CPF Life</span>
                  <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600 }}>S${Math.round(d.cpfMonthlyAtRetirement).toLocaleString()}/mo</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* ── 3. The Retirement Equation (COLLAPSIBLE, open) ──────────────────── */}
      <CollapsibleSection
        title="The Retirement Equation"
        eyebrow="Step 2 · Tri-Lock Calculator"
        badge={`Solving for ${solvedFor}`}
        defaultOpen={true}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.4)', margin: 0 }}>
            {solvedFor === 'none'
              ? 'Manual mode — set all three yourself. Funding % updates in real time.'
              : 'Lock two variables — we solve the third. Funding % shows your actual position.'}
          </p>
          <button
            onClick={() => setSolvedFor(solvedFor === 'none' ? 'rate' : 'none')}
            style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 10, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0, marginLeft: 16,
              border: `1px solid ${solvedFor === 'none' ? 'rgba(16,185,129,0.4)' : 'rgba(196,168,130,0.2)'}`,
              background: solvedFor === 'none' ? 'rgba(16,185,129,0.12)' : 'rgba(196,168,130,0.05)',
              color: solvedFor === 'none' ? '#10b981' : 'rgba(196,168,130,0.6)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {solvedFor === 'none' ? '✓ Manual' : 'Manual'}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TriLockCard
            fieldKey="rate" solvedFor={solvedFor} onSolve={() => setSolvedFor('rate' as SolvedFor)}
            label="Accumulation Rate" sublabel="Annual return during working years"
            solvedValue={fmtPct(d.solvedRate)} userValue={rate} displayValue={fmtPct(rate)}
            indicatorColor={rateColor(solvedFor === 'rate' ? d.solvedRate : rate)}
            indicatorLabel={rateLabel(solvedFor === 'rate' ? d.solvedRate : rate)}
            sliderMin={0.01} sliderMax={0.20} sliderStep={0.005}
            sliderFormat={(v) => `${(v * 100).toFixed(1)}%`} onSliderChange={setRate}
          />
          <TriLockCard
            fieldKey="time" solvedFor={solvedFor} onSolve={() => setSolvedFor('time' as SolvedFor)}
            label="Planned Retirement Age" sublabel="The year you stop working"
            solvedValue={`Age ${d.solvedAge}`} userValue={retAge} displayValue={`Age ${retAge}`}
            indicatorColor={ageColor(solvedFor === 'time' ? d.solvedAge : retAge)}
            indicatorLabel={ageLabel(solvedFor === 'time' ? d.solvedAge : retAge)}
            sliderMin={currentAge + 5} sliderMax={75} sliderStep={1}
            sliderFormat={(v) => `Age ${v}`} onSliderChange={setRetAge}
          />
          <TriLockCard
            fieldKey="monthly" solvedFor={solvedFor} onSolve={() => setSolvedFor('monthly' as SolvedFor)}
            label="Monthly Investment" sublabel="Regular contribution to your portfolio"
            solvedValue={fmtSGD(d.solvedMonthly)} userValue={monthly} displayValue={fmtSGD(monthly)}
            indicatorColor={monthlyColor(solvedFor === 'monthly' ? d.solvedMonthly : monthly, monthlyIncome)}
            indicatorLabel={monthlyLabel(solvedFor === 'monthly' ? d.solvedMonthly : monthly, monthlyIncome)}
            sliderMin={0} sliderMax={Math.max(10000, monthlyIncome * 0.8)} sliderStep={100}
            sliderFormat={(v) => `S$${v.toLocaleString()}/mo`} onSliderChange={setMonthly}
          />
        </div>
      </CollapsibleSection>

      {/* ── 4. Retirement Strategy (COLLAPSIBLE, collapsed) ─────────────────── */}
      <CollapsibleSection
        title="Retirement Strategy"
        eyebrow="Step 3 · Distribution"
        badge={retirementMode === 'dividend' ? 'Dividend Income' : 'Capital Drawdown'}
        defaultOpen={false}
      >
        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {([
            { key: 'dividend', label: 'Dividend / Yield Income', desc: 'Live off portfolio dividends, NAV grows' },
            { key: 'drawdown', label: 'Capital Drawdown', desc: 'Withdraw a fixed amount each month' },
          ] as const).map(({ key, label, desc }) => (
            <button
              key={key}
              onClick={() => setRetirementMode(key)}
              style={{
                flex: 1, minWidth: 160, padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
                background: retirementMode === key ? 'rgba(155,32,64,0.18)' : 'rgba(196,168,130,0.04)',
                border: `1.5px solid ${retirementMode === key ? 'rgba(155,32,64,0.4)' : 'rgba(196,168,130,0.12)'}`,
                textAlign: 'left', transition: 'all 0.15s',
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 700, color: retirementMode === key ? '#c4a882' : 'rgba(253,248,242,0.6)', margin: '0 0 3px' }}>{label}</p>
              <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.35)', margin: 0 }}>{desc}</p>
            </button>
          ))}
        </div>

        {/* Mode-specific inputs */}
        {retirementMode === 'dividend' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <SliderInput
              label="Fund Total Return (p.a.)"
              value={fundTotalReturn} min={0.03} max={0.18} step={0.005}
              format={(v) => `${(v * 100).toFixed(1)}%`}
              tooltip="Total return of the dividend fund before fees and payouts."
              onChange={setFundTotalReturn}
            />
            <SliderInput
              label="Fund Fees (p.a.)"
              value={fundFees} min={0} max={0.03} step={0.0025}
              format={(v) => `${(v * 100).toFixed(2)}%`}
              tooltip="Annual management / expense ratio of the fund."
              onChange={setFundFees}
            />
            {/* Net growth computed display */}
            <div style={{ padding: '10px 0' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(253,248,242,0.7)', margin: '0 0 6px' }}>Net NAV Growth Rate</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: d.netGrowthRate >= 0 ? '#10b981' : '#ef4444' }}>
                {fmtPct(d.netGrowthRate)}
              </p>
              <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.35)', margin: 0 }}>
                = {fmtPct(fundTotalReturn)} return − {fmtPct(dividendYield)} yield − {fmtPct(fundFees)} fees
              </p>
              {d.netGrowthRate < 0 && (
                <p style={{ fontSize: 11, color: '#f97316', margin: '6px 0 0' }}>
                  ⚠ Negative NAV growth — corpus will shrink over time
                </p>
              )}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 340 }}>
            <SliderInput
              label="Monthly Drawdown Amount"
              value={drawdownMonthly} min={500} max={30000} step={500}
              format={(v) => `S$${v.toLocaleString()}/mo`}
              tooltip="Fixed monthly withdrawal from your corpus after retirement."
              onChange={setDrawdownMonthly}
            />
          </div>
        )}

        {/* Income at retirement summary */}
        <div style={{ marginTop: 20, padding: '14px 18px', background: 'rgba(196,168,130,0.05)', border: '1px solid rgba(196,168,130,0.12)', borderRadius: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.55)', margin: '0 0 10px' }}>
            Estimated Monthly Income at Retirement (Age {d.effectiveRetAge})
          </p>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: retirementMode === 'dividend' ? 'Portfolio Dividends' : 'Drawdown', value: d.portfolioIncomeAtRetirement, color: '#9b2040' },
              { label: 'CPF Life', value: d.cpfMonthlyAtRetirement, color: '#a78bfa' },
              { label: 'Other Passive', value: d.passiveAtEffectiveRet, color: '#f59e0b' },
              { label: 'Total', value: d.totalIncomeAtRetirement, color: '#10b981' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.5)', margin: '0 0 3px' }}>{label}</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color, margin: 0 }}>
                  S${Math.round(value).toLocaleString()}/mo
                </p>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {/* ── 5. Additional Passive Income (COLLAPSIBLE, collapsed) ───────────── */}
      <CollapsibleSection
        title="Additional Passive Income"
        eyebrow="Streams"
        badge={passiveStreams.length > 0 ? `${passiveStreams.length} stream${passiveStreams.length > 1 ? 's' : ''}, S$${passiveStreams.reduce((s, x) => s + x.monthlyAmount, 0).toLocaleString()}/mo` : 'None added'}
        defaultOpen={false}
      >
        <div style={{ marginBottom: passiveStreams.length > 0 ? 16 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.4)', margin: 0 }}>
              Rental income, side business, annuity, etc. — add when they start.
            </p>
            <button
              onClick={addStream}
              style={{
                padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: 'rgba(155,32,64,0.2)', border: '1px solid rgba(155,32,64,0.35)',
                color: '#c4a882', cursor: 'pointer', flexShrink: 0, marginLeft: 16,
              }}
            >
              + Add Stream
            </button>
          </div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {([
              { key: 'goal', label: 'Factors Into Goal', desc: 'Reduces the portfolio you need to build' },
              { key: 'bonus', label: 'Treated as Bonus', desc: 'Goal unchanged — passive income is extra on top' },
            ] as const).map(({ key, label, desc }) => (
              <button
                key={key}
                onClick={() => setPassiveMode(key)}
                style={{
                  flex: 1, minWidth: 160, padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                  background: passiveMode === key ? 'rgba(155,32,64,0.15)' : 'rgba(196,168,130,0.04)',
                  border: `1.5px solid ${passiveMode === key ? 'rgba(155,32,64,0.35)' : 'rgba(196,168,130,0.1)'}`,
                  textAlign: 'left', transition: 'all 0.15s',
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 700, color: passiveMode === key ? '#c4a882' : 'rgba(253,248,242,0.5)', margin: '0 0 2px' }}>{label}</p>
                <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.3)', margin: 0 }}>{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {passiveStreams.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {passiveStreams.map((stream) => (
              <div key={stream.id} className="grid-stream" style={{
                background: 'rgba(196,168,130,0.04)', border: '1px solid rgba(196,168,130,0.1)',
                borderRadius: 10, padding: '14px 16px',
                gap: 12, alignItems: 'center',
              }}>
                <input
                  value={stream.name}
                  onChange={(e) => updateStream(stream.id, { name: e.target.value })}
                  placeholder="Stream name"
                  style={{
                    background: 'rgba(10,6,5,0.5)', border: '1px solid rgba(196,168,130,0.2)',
                    borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#fdf8f2',
                    fontFamily: "'Cabinet Grotesk', sans-serif", outline: 'none',
                  }}
                />
                <div>
                  <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.5)', margin: '0 0 3px' }}>Monthly S$</p>
                  <input
                    type="number" min={0} step={100}
                    value={stream.monthlyAmount}
                    onChange={(e) => updateStream(stream.id, { monthlyAmount: Number(e.target.value) })}
                    style={{
                      width: '100%', background: 'rgba(10,6,5,0.5)', border: '1px solid rgba(196,168,130,0.2)',
                      borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#fdf8f2',
                      fontFamily: "'Cabinet Grotesk', sans-serif", outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.5)', margin: '0 0 3px' }}>Starts at Age</p>
                  <input
                    type="number" min={currentAge} max={90} step={1}
                    value={stream.startAge}
                    onChange={(e) => updateStream(stream.id, { startAge: Number(e.target.value) })}
                    style={{
                      width: '100%', background: 'rgba(10,6,5,0.5)', border: '1px solid rgba(196,168,130,0.2)',
                      borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#fdf8f2',
                      fontFamily: "'Cabinet Grotesk', sans-serif", outline: 'none',
                    }}
                  />
                </div>
                <button
                  onClick={() => removeStream(stream.id)}
                  style={{
                    width: 36, height: 36, borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)',
                    background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                    cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* ── 6. Wealth Journey Chart (Step 4 — ALWAYS VISIBLE) ──────────────── */}
      <div style={{
        background: 'rgba(122,28,46,0.06)', border: '1px solid rgba(196,168,130,0.15)',
        borderRadius: 16, padding: '24px 28px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 4px' }}>
              Step 4 · Wealth Journey Chart
            </p>
            <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.4)', margin: 0 }}>
              Portfolio NAV (left axis) · Monthly income streams post-retirement (right axis, dashed lines)
            </p>
            <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.28)', margin: '3px 0 0' }}>
              Optimistic assumes +2% p.a. above your rate · Pessimistic assumes −2% p.a. · Reflects market uncertainty over {d.effectiveYears} years
            </p>
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { color: '#10b981', label: 'Optimistic NAV', dashed: false },
              { color: '#9b2040', label: 'Base NAV', dashed: false },
              { color: '#6b7280', label: 'Pessimistic NAV', dashed: true },
              { color: '#c4a882', label: 'Required corpus', dashed: true },
            ].map(({ color, label, dashed }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 18, height: 0, borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${color}` }} />
                <span style={{ fontSize: 10, color: 'rgba(253,248,242,0.4)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={d.chartData} margin={{ top: 4, right: 80, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradBase" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9b2040" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#9b2040" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradOpt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(196,168,130,0.05)" />
            <XAxis dataKey="age" tick={{ fill: 'rgba(253,248,242,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              yAxisId="left"
              tickFormatter={(v) => fmtSGD(v)}
              tick={{ fill: 'rgba(253,248,242,0.3)', fontSize: 10 }}
              axisLine={false} tickLine={false} width={76}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(v) => `S$${Math.round(v / 1000)}K`}
              tick={{ fill: 'rgba(253,248,242,0.25)', fontSize: 10 }}
              axisLine={false} tickLine={false} width={60}
            />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine yAxisId="left" x={d.effectiveRetAge} stroke="rgba(196,168,130,0.25)" strokeDasharray="4 4" label={{ value: 'Retire', fill: 'rgba(196,168,130,0.5)', fontSize: 10, position: 'top' }} />
            <Area yAxisId="left" type="monotone" dataKey="optimistic" name="Optimistic" fill="url(#gradOpt)" stroke="#10b981" strokeWidth={1.5} dot={false} />
            <Area yAxisId="left" type="monotone" dataKey="base" name="Base" fill="url(#gradBase)" stroke="#9b2040" strokeWidth={2} dot={false} />
            <Line yAxisId="left" type="monotone" dataKey="pessimistic" name="Pessimistic" stroke="#6b7280" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
            <Line yAxisId="left" type="monotone" dataKey="required" name="Required corpus" stroke="#c4a882" strokeWidth={1.5} dot={false} strokeDasharray="6 3" connectNulls={false} />
            {/* Income lines — right axis, post-retirement only */}
            <Line yAxisId="right" type="monotone" dataKey="portfolioIncome" name={retirementMode === 'dividend' ? 'Dividend income' : 'Drawdown'} stroke="#9b2040" strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls={false} />
            <Line yAxisId="right" type="monotone" dataKey="cpfIncome" name="CPF Life" stroke="#a78bfa" strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls={false} />
            {passiveStreams.length > 0 && (
              <Line yAxisId="right" type="monotone" dataKey="otherPassiveIncome" name="Other passive" stroke="#0ea5e9" strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls={false} />
            )}
            {/* totalPassiveIncome omitted from chart — visible in tooltip only */}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── 7. Cost of Procrastination (toggle show/hide) ──────────────────── */}
      {d.procrastinationData.length > 1 && (
        <div>
          <button
            onClick={() => setShowProcrastination(!showProcrastination)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 24px',
              background: 'rgba(122,28,46,0.06)',
              border: '1px solid rgba(196,168,130,0.15)',
              borderRadius: showProcrastination ? '16px 16px 0 0' : 16,
              cursor: 'pointer',
              backdropFilter: 'blur(12px)',
              transition: 'border-radius 0.2s',
            }}
          >
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 4px', fontFamily: "'Cabinet Grotesk', sans-serif", textAlign: 'left' }}>
                What If You Wait?
              </p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#fdf8f2', margin: 0, textAlign: 'left' }}>
                The Cost of Procrastination
              </p>
            </div>
            <motion.span
              animate={{ rotate: showProcrastination ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ color: '#c4a882', fontSize: 14, lineHeight: 1, flexShrink: 0, marginLeft: 16 }}
            >
              ▼
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {showProcrastination && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                <ProcrastinationChart
                  data={d.procrastinationData}
                  baseMonthlyNeeded={d.baseMonthlyNeeded}
                  effectiveYears={d.effectiveYears}
                  effectiveRate={d.effectiveRate}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── 8. Reality Cards ───────────────────────────────────────────────── */}
      <div className="grid-4col" style={{ gap: 14 }}>
        {[
          {
            label: 'Income Replacement',
            value: monthlyIncome > 0 ? `${Math.round(d.incomeReplacementRate * 100)}%` : '—',
            sub: monthlyIncome > 0 ? `S$${Math.round(desiredMonthly).toLocaleString()} on S$${Math.round(monthlyIncome).toLocaleString()} income` : 'Add income to profile',
            color: d.incomeReplacementRate >= 0.7 ? '#10b981' : d.incomeReplacementRate >= 0.5 ? '#f59e0b' : '#ef4444',
            icon: '🎯',
          },
          {
            label: 'CPF Life Floor',
            value: cpfOa > 0 || cpfSa > 0 ? `S$${Math.round(d.cpfMonthlyAtRetirement).toLocaleString()}/mo` : 'Not set',
            sub: includeCpf && d.cpfMonthlyAtRetirement > 0 && d.totalIncomeAtRetirement > 0
              ? `${Math.round(d.cpfMonthlyAtRetirement / d.totalIncomeAtRetirement * 100)}% of total income`
              : 'Update CPF in profile',
            color: '#a78bfa',
            icon: '🇸🇬',
          },
          {
            label: 'Retirement Runway',
            value: d.depletionAge && d.depletionAge <= 90 ? `${d.depletionAge - d.effectiveRetAge} yrs` : '∞',
            sub: d.depletionAge && d.depletionAge <= 90 ? `Corpus runs out ~age ${d.depletionAge}` : 'Corpus sustains at this rate',
            color: d.depletionAge && d.depletionAge <= 90 ? '#ef4444' : '#10b981',
            icon: '⏳',
          },
          {
            label: 'Medisave at Retirement',
            value: cpfMa > 0 ? fmtSGD(d.medisave) : 'Not set',
            sub: cpfMa > 0 ? 'MA at 4% p.a. — healthcare only' : 'Update CPF MA in profile',
            color: '#0ea5e9',
            icon: '🏥',
          },
        ].map(({ label, value, sub, color, icon }) => (
          <div key={label} style={{
            background: 'rgba(122,28,46,0.06)', border: '1px solid rgba(196,168,130,0.15)',
            borderRadius: 14, padding: '18px 20px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, ${color}50)` }} />
            <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.55)', margin: '0 0 4px' }}>{label}</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color, margin: '0 0 4px' }}>{value}</p>
            <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.4)', margin: 0, lineHeight: 1.5 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── 9. Milestone Tracker (COLLAPSIBLE, collapsed) ──────────────────── */}
      {d.milestones.length > 0 && (
        <div style={{
          background: 'rgba(122,28,46,0.06)', border: '1px solid rgba(196,168,130,0.15)',
          borderRadius: 16, overflow: 'hidden',
        }}>
          <button
            onClick={() => setShowMilestones(!showMilestones)}
            style={{
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 2px' }}>Milestone Tracker</p>
              <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.4)', margin: 0 }}>Are you building wealth fast enough? Every 5 years.</p>
            </div>
            <motion.span
              animate={{ rotate: showMilestones ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ color: '#c4a882', fontSize: 14, lineHeight: 1, flexShrink: 0, marginLeft: 16 }}
            >
              ▼
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {showMilestones && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ borderTop: '1px solid rgba(196,168,130,0.08)', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                    <thead>
                      <tr>
                        {['Age', 'Years Away', 'Savings Needed', 'Projected', 'Status'].map((h) => (
                          <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.45)', borderBottom: '1px solid rgba(196,168,130,0.08)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {d.milestones.map((m, i) => (
                        <tr key={m.age} style={{ borderBottom: i < d.milestones.length - 1 ? '1px solid rgba(196,168,130,0.05)' : 'none' }}>
                          <td style={{ padding: '12px 20px', fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#fdf8f2' }}>{m.age}</td>
                          <td style={{ padding: '12px 20px', fontSize: 13, color: 'rgba(253,248,242,0.45)' }}>{m.yearsAway} yrs</td>
                          <td style={{ padding: '12px 20px', fontSize: 13, color: 'rgba(253,248,242,0.65)', fontWeight: 600 }}>{fmtSGD(m.requiredSavings)}</td>
                          <td style={{ padding: '12px 20px', fontSize: 13, color: '#fdf8f2', fontWeight: 600 }}>{fmtSGD(m.projectedSavings)}</td>
                          <td style={{ padding: '12px 20px' }}>
                            <span style={{
                              display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                              background: m.onTrack ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                              color: m.onTrack ? '#10b981' : '#ef4444',
                              border: `1px solid ${m.onTrack ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                            }}>
                              {m.onTrack ? '✓ On track' : '✗ Behind'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── 10. AI Insight Panel (ALWAYS VISIBLE) ──────────────────────────── */}
      <AIInsightPanel
        tool="retirement"
        label="Analyse My Retirement Plan"
        data={{
          currentAge, retirementAge: d.effectiveRetAge, yearsToRetirement: d.effectiveYears,
          desiredMonthly, nominalAtRetirement: Math.round(d.nominalAtRetirement),
          inflation: fmtPct(inflation), dividendYield: fmtPct(dividendYield),
          requiredCorpus: Math.round(d.effectiveReq), projectedCorpus: Math.round(d.effectiveProjected),
          fundedPct: Math.round(d.actualFundedPct * 100),
          gap: Math.round(d.effectiveProjected - d.effectiveReq),
          accumulationRate: fmtPct(d.effectiveRate), monthlyInvestment: Math.round(d.effectiveMonthly),
          retirementMode, netGrowthRate: fmtPct(d.netGrowthRate),
          cpfLifeMonthly: Math.round(d.cpfMonthlyAtRetirement),
          totalPassiveIncomeAtRetirement: Math.round(d.totalIncomeAtRetirement),
          monthlyIncome, incomeReplacementRate: Math.round(d.incomeReplacementRate * 100),
          depletionAge: d.depletionAge ?? null, currentSavings: Math.round(savings),
        }}
      />
    </div>
  )
}
