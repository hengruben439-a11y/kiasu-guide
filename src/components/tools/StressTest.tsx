'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  ComposedChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import AIInsightPanel from '@/components/ui/AIInsightPanel'

// ── Types ─────────────────────────────────────────────────────────────────────

type EventType = 'job_loss' | 'early_ci' | 'advanced_ci' | 'tpd' | 'death' | 'disability_partial' | 'custom'

interface ScenarioEvent {
  id: string
  type: EventType
  age: number
  durationYears: number
  incomeLossPct: number
  extraExpenseMonthly: number
  coverageApplied: number
  monthlyBenefit: number
  label: string
}

interface BenefitBlock {
  id: string
  benefit_type: 'death' | 'tpd' | 'eci' | 'aci' | 'hospitalisation' | 'pa' | 'careshield'
  coverage: number
  payout_mode: 'lump_sum' | 'monthly' | 'multipay' | null
  enabled: boolean
  policy_name: string | null
}

interface Props {
  monthly_income: number
  monthly_expenses: number
  liquid_savings: number
  cpf_oa: number
  cpf_sa: number
  cpf_ma: number
  monthly_investment: number
  inflation_rate: number
  currentAge: number
  benefitBlocks?: BenefitBlock[]
}

// ── Event templates ───────────────────────────────────────────────────────────

const EVENT_TEMPLATES: Record<EventType, {
  label: string; color: string; icon: string; description: string
  defaultIncomeLoss: number; defaultDuration: number; defaultExtra: number
  insuranceTypes: BenefitBlock['benefit_type'][]
}> = {
  job_loss: {
    label: 'Job Loss', color: '#f59e0b', icon: '💼',
    description: 'Total income stops. Living expenses continue.',
    defaultIncomeLoss: 1.0, defaultDuration: 1, defaultExtra: 0, insuranceTypes: [],
  },
  early_ci: {
    label: 'Early Critical Illness', color: '#f97316', icon: '🧬',
    description: 'Reduced income. Early CI lump-sum triggers.',
    defaultIncomeLoss: 0.5, defaultDuration: 2, defaultExtra: 2000, insuranceTypes: ['eci'],
  },
  advanced_ci: {
    label: 'Advanced Critical Illness', color: '#ef4444', icon: '🏥',
    description: 'Full income loss. ACI + ECI both pay out.',
    defaultIncomeLoss: 1.0, defaultDuration: 5, defaultExtra: 5000, insuranceTypes: ['aci', 'eci'],
  },
  tpd: {
    label: 'Total Permanent Disability', color: '#dc2626', icon: '♿',
    description: 'Permanent income loss. TPD + CareShield + PA apply.',
    defaultIncomeLoss: 1.0, defaultDuration: 30, defaultExtra: 3000, insuranceTypes: ['tpd', 'careshield', 'pa'],
  },
  death: {
    label: 'Death', color: '#7f1d1d', icon: '🕊️',
    description: 'Death benefit. Shows what dependants have left.',
    defaultIncomeLoss: 1.0, defaultDuration: 30, defaultExtra: 0, insuranceTypes: ['death'],
  },
  disability_partial: {
    label: 'Partial Disability', color: '#a78bfa', icon: '🦽',
    description: 'Reduced capacity. PA or partial CI may apply.',
    defaultIncomeLoss: 0.4, defaultDuration: 3, defaultExtra: 1000, insuranceTypes: ['pa', 'eci'],
  },
  custom: {
    label: 'Custom Event', color: '#6b7280', icon: '⚙️',
    description: 'Define your own scenario.',
    defaultIncomeLoss: 0.5, defaultDuration: 2, defaultExtra: 0, insuranceTypes: [],
  },
}

function genId() { return Math.random().toString(36).slice(2, 9) }

function fmt(v: number): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}S$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}S$${(abs / 1_000).toFixed(0)}K`
  return `${sign}S$${abs.toFixed(0)}`
}
function fmtSGD(v: number) { return `S$${Math.round(v).toLocaleString('en-SG')}` }

// ── Simulation ────────────────────────────────────────────────────────────────

interface SimYear {
  age: number
  liquidAssets: number
  incomeAnnual: number
  expensesAnnual: number
  insuranceReceived: number
  cashFlow: number
}

function simulate(
  startAge: number,
  monthlyIncome: number,
  monthlyExpenses: number,
  liquidSavings: number,
  monthlyInvestment: number,
  inflationRate: number,
  events: ScenarioEvent[],
  withInsurance: boolean,
  simYears = 45,
): SimYear[] {
  const results: SimYear[] = []
  let liquid = liquidSavings

  for (let yr = 0; yr < simYears; yr++) {
    const age = startAge + yr
    const inflFactor = Math.pow(1 + inflationRate, yr)
    const activeEvents = events.filter(e => age >= e.age && age < e.age + e.durationYears)

    const baseIncome = monthlyIncome * 12 * inflFactor
    const incomeLoss = Math.min(1, activeEvents.reduce((s, e) => s + e.incomeLossPct, 0))
    const incomeAnnual = baseIncome * (1 - incomeLoss)

    const baseExpenses = monthlyExpenses * 12 * inflFactor
    const extraExpenses = activeEvents.reduce((s, e) => s + e.extraExpenseMonthly * 12, 0)
    const expensesAnnual = baseExpenses + extraExpenses

    let insuranceReceived = 0
    if (withInsurance) {
      const lumpSum = activeEvents.filter(e => e.age === age).reduce((s, e) => s + e.coverageApplied, 0)
      const monthlyBenefits = activeEvents.reduce((s, e) => s + e.monthlyBenefit * 12, 0)
      insuranceReceived = lumpSum + monthlyBenefits
    }

    const investmentAnnual = incomeAnnual > expensesAnnual ? monthlyInvestment * 12 : 0
    const cashFlow = incomeAnnual - expensesAnnual + insuranceReceived - investmentAnnual

    liquid = Math.max(0, liquid * 1.025 + cashFlow)

    results.push({
      age, liquidAssets: Math.round(liquid),
      incomeAnnual: Math.round(incomeAnnual),
      expensesAnnual: Math.round(expensesAnnual),
      insuranceReceived: Math.round(insuranceReceived),
      cashFlow: Math.round(cashFlow),
    })
  }
  return results
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function ChartTip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>
  label?: number
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(10,6,5,0.95)', border: '1px solid rgba(196,168,130,0.2)',
      borderRadius: 10, padding: '12px 16px',
      fontFamily: "'Cabinet Grotesk', sans-serif",
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: 200,
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#c4a882', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Age {label}</p>
      {payload.filter(p => p.value != null).map((p) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12, margin: '3px 0' }}>
          <span style={{ color: p.color }}>■ {p.name}</span>
          <strong style={{ color: '#fdf8f2' }}>{fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

// ── GlassCard ─────────────────────────────────────────────────────────────────

function GlassCard({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(122,28,46,0.06)',
      border: '1px solid rgba(196,168,130,0.15)',
      borderRadius: 16, backdropFilter: 'blur(12px)',
      padding: '24px 28px', ...style,
    }}>
      {children}
    </div>
  )
}

// ── Event Card ────────────────────────────────────────────────────────────────

function EventCard({ event, onUpdate, onRemove }: {
  event: ScenarioEvent
  onUpdate: (u: Partial<ScenarioEvent>) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const tmpl = EVENT_TEMPLATES[event.type]

  const inp = (v: string | number, onChange: (s: string) => void, type = 'number') => (
    <input
      type={type} value={v}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '6px 10px', borderRadius: 7,
        border: '1px solid rgba(196,168,130,0.15)',
        background: 'rgba(10,6,5,0.6)',
        color: '#fdf8f2', fontSize: 12,
        fontFamily: "'Cabinet Grotesk', sans-serif",
        outline: 'none',
      }}
    />
  )

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
      style={{
        borderLeft: `3px solid ${tmpl.color}`,
        borderRadius: 12,
        background: 'rgba(10,6,5,0.5)',
        border: `1px solid ${tmpl.color}25`,
        borderLeftColor: tmpl.color,
        overflow: 'hidden',
      }}>
      <div onClick={() => setExpanded(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}>
        <span style={{ fontSize: 18 }}>{tmpl.icon}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#fdf8f2', margin: '0 0 2px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>{event.label}</p>
          <p style={{ fontSize: 10, color: 'rgba(253,248,242,0.45)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Age {event.age} · {event.durationYears}yr · {Math.round(event.incomeLossPct * 100)}% income loss
            {event.coverageApplied > 0 && ` · ${fmt(event.coverageApplied)} lump sum`}
            {event.monthlyBenefit > 0 && ` · ${fmtSGD(event.monthlyBenefit)}/mo benefit`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: `${tmpl.color}20`, color: tmpl.color }}>{tmpl.label}</span>
          <button onClick={e => { e.stopPropagation(); onRemove() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(253,248,242,0.3)', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(196,168,130,0.08)' }}>
              <div className="grid-3col" style={{ gap: 12, paddingTop: 14 }}>
                {[
                  { label: 'Event Label', node: inp(event.label, v => onUpdate({ label: v }), 'text') },
                  { label: 'Onset Age', node: inp(event.age, v => onUpdate({ age: parseInt(v) || event.age })) },
                  { label: 'Duration (years)', node: inp(event.durationYears, v => onUpdate({ durationYears: parseFloat(v) || 1 })) },
                  { label: 'Income Loss (%)', node: inp(Math.round(event.incomeLossPct * 100), v => onUpdate({ incomeLossPct: Math.min(1, parseInt(v) / 100 || 0) })) },
                  { label: 'Extra Monthly Expense', node: inp(event.extraExpenseMonthly, v => onUpdate({ extraExpenseMonthly: parseInt(v) || 0 })) },
                  { label: 'Insurance Lump Sum', node: inp(event.coverageApplied, v => onUpdate({ coverageApplied: parseInt(v) || 0 })) },
                  { label: 'Monthly Benefit', node: inp(event.monthlyBenefit, v => onUpdate({ monthlyBenefit: parseInt(v) || 0 })) },
                ].map(({ label, node }) => (
                  <div key={label}>
                    <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(196,168,130,0.6)', display: 'block', marginBottom: 4, fontFamily: "'Cabinet Grotesk', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</label>
                    {node}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.40)', margin: '12px 0 0', lineHeight: 1.6, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                {tmpl.description}
                {tmpl.insuranceTypes.length > 0 && <> Typical coverage: <strong style={{ color: '#c4a882' }}>{tmpl.insuranceTypes.join(', ').toUpperCase()}</strong>.</>}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function StressTest({
  monthly_income, monthly_expenses, liquid_savings,
  cpf_oa: _cpf_oa, cpf_sa: _cpf_sa, cpf_ma: _cpf_ma,
  monthly_investment, inflation_rate, currentAge,
  benefitBlocks = [],
}: Props) {
  const [events, setEvents] = useState<ScenarioEvent[]>([])
  const [showAddMenu, setShowAddMenu] = useState(false)

  const baseline = useMemo(() =>
    simulate(currentAge, monthly_income, monthly_expenses, liquid_savings, monthly_investment, inflation_rate, [], false),
  [monthly_income, monthly_expenses, liquid_savings, monthly_investment, inflation_rate, currentAge])

  const stressedNoInsurance = useMemo(() =>
    simulate(currentAge, monthly_income, monthly_expenses, liquid_savings, monthly_investment, inflation_rate, events, false),
  [events, monthly_income, monthly_expenses, liquid_savings, monthly_investment, inflation_rate, currentAge])

  const stressedWithInsurance = useMemo(() =>
    simulate(currentAge, monthly_income, monthly_expenses, liquid_savings, monthly_investment, inflation_rate, events, true),
  [events, monthly_income, monthly_expenses, liquid_savings, monthly_investment, inflation_rate, currentAge])

  const chartData = useMemo(() =>
    baseline.map((b, i) => ({
      age: b.age,
      baseline: b.liquidAssets,
      withoutInsurance: stressedNoInsurance[i]?.liquidAssets ?? 0,
      withInsurance: stressedWithInsurance[i]?.liquidAssets ?? 0,
    })),
  [baseline, stressedNoInsurance, stressedWithInsurance])

  const baseDepletionAge = baseline.find(y => y.liquidAssets === 0)?.age
  const noInsuranceDepletionAge = stressedNoInsurance.find(y => y.liquidAssets === 0)?.age
  const withInsuranceDepletionAge = stressedWithInsurance.find(y => y.liquidAssets === 0)?.age
  const totalInsuranceHelp = stressedWithInsurance.reduce((s, y) => s + y.insuranceReceived, 0)

  const yearsSaved = events.length > 0 && noInsuranceDepletionAge && withInsuranceDepletionAge
    ? withInsuranceDepletionAge - noInsuranceDepletionAge
    : noInsuranceDepletionAge && !withInsuranceDepletionAge
    ? 90 - noInsuranceDepletionAge
    : 0

  const addEvent = useCallback((type: EventType) => {
    const tmpl = EVENT_TEMPLATES[type]
    const relevant = benefitBlocks.filter(b => b.enabled && (tmpl.insuranceTypes as string[]).includes(b.benefit_type))
    const lumpSum = relevant.filter(b => b.payout_mode !== 'monthly').reduce((s, b) => s + b.coverage, 0)
    const monthly = relevant.filter(b => b.payout_mode === 'monthly').reduce((s, b) => s + b.coverage, 0)
    setEvents(prev => [...prev, {
      id: genId(), type, age: currentAge + 10,
      durationYears: tmpl.defaultDuration, incomeLossPct: tmpl.defaultIncomeLoss,
      extraExpenseMonthly: tmpl.defaultExtra, coverageApplied: lumpSum,
      monthlyBenefit: monthly, label: tmpl.label,
    }])
    setShowAddMenu(false)
  }, [currentAge, benefitBlocks])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Cabinet Grotesk', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 6px' }}>Stress Test</p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#fdf8f2', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          How long can you survive if everything stops?
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.50)', margin: 0 }}>
          Add life events to your timeline. Watch your runway shrink — then see what your insurance coverage actually saves.
        </p>
      </div>

      {/* Baseline stats */}
      <div className="grid-3col" style={{ gap: 14 }}>
        {[
          { label: 'Liquid Assets', value: fmtSGD(liquid_savings), icon: '💰', color: '#c4a882' },
          { label: 'Monthly Net Cashflow', value: fmtSGD(monthly_income - monthly_expenses), icon: '📊', color: monthly_income > monthly_expenses ? '#10b981' : '#ef4444' },
          { label: 'Policies Loaded', value: benefitBlocks.filter(b => b.enabled).length > 0 ? `${benefitBlocks.filter(b => b.enabled).length} active` : 'None', icon: '🛡️', color: '#a78bfa' },
        ].map(({ label, value, icon, color }) => (
          <GlassCard key={label} style={{ padding: '18px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.6)', margin: 0 }}>{label}</p>
              <span style={{ fontSize: 16 }}>{icon}</span>
            </div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color, margin: 0 }}>{value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Scenario Builder */}
      <GlassCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: events.length > 0 ? 20 : 0 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 4px' }}>Scenario Builder</p>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#fdf8f2', margin: 0 }}>Your Life Events</h3>
          </div>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowAddMenu(v => !v)} style={{
              padding: '8px 18px', borderRadius: 9, fontSize: 12, fontWeight: 700,
              background: '#9b2040', color: '#fdf8f2',
              border: 'none', cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif",
            }}>
              + Add Event
            </button>
            {showAddMenu && (
              <div style={{
                position: 'absolute', right: 0, top: '110%', zIndex: 200,
                background: 'rgba(10,6,5,0.97)',
                border: '1px solid rgba(196,168,130,0.2)',
                borderRadius: 12,
                boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
                padding: 8, minWidth: 280,
                backdropFilter: 'blur(20px)',
              }}>
                {(Object.entries(EVENT_TEMPLATES) as [EventType, typeof EVENT_TEMPLATES[EventType]][]).map(([key, tmpl]) => (
                  <button key={key} onClick={() => addEvent(key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                      padding: '10px 14px', borderRadius: 8, border: 'none',
                      background: 'none', cursor: 'pointer', textAlign: 'left',
                      fontFamily: "'Cabinet Grotesk', sans-serif",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(196,168,130,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{ fontSize: 18 }}>{tmpl.icon}</span>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#fdf8f2', margin: '0 0 1px' }}>{tmpl.label}</p>
                      <p style={{ fontSize: 10, color: 'rgba(253,248,242,0.40)', margin: 0 }}>{tmpl.description.split('.')[0]}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(10,6,5,0.4)', borderRadius: 12, border: '1.5px dashed rgba(196,168,130,0.2)', marginTop: 20 }}>
            <p style={{ fontSize: 26, margin: '0 0 10px' }}>🎯</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#fdf8f2', margin: '0 0 6px', fontFamily: "'Playfair Display', serif" }}>Build your stress scenario</p>
            <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.40)', margin: 0, lineHeight: 1.7, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
              Add a life event — job loss, critical illness, TPD, death — and see what it does to your financial runway. Then watch what your insurance coverage saves.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AnimatePresence>
              {events.map(e => (
                <EventCard key={e.id} event={e}
                  onUpdate={u => setEvents(prev => prev.map(ev => ev.id === e.id ? { ...ev, ...u } : ev))}
                  onRemove={() => setEvents(prev => prev.filter(ev => ev.id !== e.id))}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </GlassCard>

      {/* Runway metrics — only show when events exist */}
      {events.length > 0 && (
        <div className="grid-4col" style={{ gap: 14 }}>
          {[
            { label: 'Baseline Runway', value: baseDepletionAge ? `Age ${baseDepletionAge}` : 'Age 90+', sub: 'No adverse events', color: '#10b981' },
            { label: 'Without Insurance', value: noInsuranceDepletionAge ? `Age ${noInsuranceDepletionAge}` : 'Age 90+', sub: 'Stressed, uninsured', color: '#ef4444' },
            { label: 'With Insurance', value: withInsuranceDepletionAge ? `Age ${withInsuranceDepletionAge}` : 'Age 90+', sub: 'Stressed + coverage', color: '#9b2040' },
            {
              label: 'Insurance Saved',
              value: yearsSaved > 0 ? `${yearsSaved} years` : totalInsuranceHelp > 0 ? 'Solvent!' : 'S$0',
              sub: totalInsuranceHelp > 0 ? fmtSGD(totalInsuranceHelp) + ' total payouts' : 'No coverage loaded',
              color: yearsSaved > 0 ? '#a78bfa' : '#c4a882',
            },
          ].map(({ label, value, sub, color }) => (
            <GlassCard key={label} style={{ padding: '18px 22px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.6)', margin: '0 0 8px' }}>{label}</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color, margin: '0 0 4px' }}>{value}</p>
              <p style={{ fontSize: 10, color: 'rgba(253,248,242,0.40)', margin: 0 }}>{sub}</p>
            </GlassCard>
          ))}
        </div>
      )}

      {/* 3-line chart */}
      <GlassCard>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 4px' }}>Financial Runway</p>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#fdf8f2', margin: '0 0 20px' }}>
          {events.length === 0 ? 'Baseline (no events)' : 'Baseline vs. With & Without Insurance'}
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="gBL" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6b7280" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6b7280" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gWI" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9b2040" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#9b2040" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gNI" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,168,130,0.06)" />
            <XAxis dataKey="age" tick={{ fontSize: 9, fill: 'rgba(253,248,242,0.35)', fontFamily: "'Cabinet Grotesk', sans-serif" }} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 8, fill: 'rgba(253,248,242,0.35)', fontFamily: "'Cabinet Grotesk', sans-serif" }} width={60} />
            <Tooltip content={<ChartTip />} />
            <ReferenceLine y={0} stroke="rgba(239,68,68,0.35)" strokeDasharray="4 4" />
            {events.map(e => (
              <ReferenceLine key={e.id} x={e.age} stroke={EVENT_TEMPLATES[e.type].color} strokeDasharray="4 3"
                label={{ value: EVENT_TEMPLATES[e.type].icon, position: 'top', fontSize: 12 }} />
            ))}
            <Area type="monotone" dataKey="baseline" name="Baseline" stroke="#6b7280" fill="url(#gBL)" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
            {events.length > 0 && <>
              <Area type="monotone" dataKey="withoutInsurance" name="Without Insurance" stroke="#ef4444" fill="url(#gNI)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              <Area type="monotone" dataKey="withInsurance" name="With Insurance" stroke="#9b2040" fill="url(#gWI)" strokeWidth={2.5} dot={false} />
            </>}
          </ComposedChart>
        </ResponsiveContainer>

        <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
          {[
            { color: '#6b7280', label: 'Baseline (no events)', dash: true },
            { color: '#ef4444', label: 'Without Insurance', dash: true },
            { color: '#9b2040', label: 'With Insurance', dash: false },
          ].map(({ color, label, dash }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'rgba(253,248,242,0.45)' }}>
              <div style={{ width: 18, height: 2, borderRadius: 2, background: color }} />
              {label}
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Insurance saved callout — visceral */}
      {events.length > 0 && yearsSaved > 5 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(167,139,250,0.12), rgba(155,32,64,0.08))',
          border: '1px solid rgba(167,139,250,0.25)',
          borderRadius: 16, padding: '24px 28px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#a78bfa', margin: '0 0 10px' }}>Insurance Impact</p>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: '#fdf8f2', margin: '0 0 8px' }}>
            Your coverage saved you <span style={{ color: '#a78bfa' }}>{yearsSaved} years</span>
          </p>
          <p style={{ fontSize: 14, color: 'rgba(253,248,242,0.55)', margin: 0, lineHeight: 1.7 }}>
            Without your policies, your assets would deplete at age {noInsuranceDepletionAge}.
            With coverage, you survive to {withInsuranceDepletionAge ?? '90+'}.
            That's {fmtSGD(totalInsuranceHelp)} working for you when you need it most.
          </p>
        </div>
      )}

      {/* Year-by-year table */}
      {events.length > 0 && (
        <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(196,168,130,0.08)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 4px' }}>Step-by-Step</p>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#fdf8f2', margin: 0 }}>Year-by-Year Breakdown</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              <thead>
                <tr style={{ background: 'rgba(10,6,5,0.4)' }}>
                  {['Age', 'Income/yr', 'Expenses/yr', 'Insurance', 'Liquid (no ins.)', 'Liquid (with ins.)'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'right', fontSize: 9, fontWeight: 700, color: 'rgba(196,168,130,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(196,168,130,0.08)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stressedWithInsurance.slice(0, 25).map((yr, i) => {
                  const eventYear = events.some(e => yr.age >= e.age && yr.age < e.age + e.durationYears)
                  const noInsYr = stressedNoInsurance[i]
                  return (
                    <tr key={yr.age} style={{ background: eventYear ? 'rgba(155,32,64,0.08)' : i % 2 === 0 ? 'transparent' : 'rgba(10,6,5,0.2)', borderBottom: '1px solid rgba(196,168,130,0.04)' }}>
                      <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 700, color: '#fdf8f2' }}>{yr.age}{eventYear && <span style={{ marginLeft: 6, fontSize: 10 }}>⚡</span>}</td>
                      <td style={{ padding: '8px 16px', textAlign: 'right', color: '#10b981' }}>{fmt(yr.incomeAnnual)}</td>
                      <td style={{ padding: '8px 16px', textAlign: 'right', color: '#ef4444' }}>{fmt(yr.expensesAnnual)}</td>
                      <td style={{ padding: '8px 16px', textAlign: 'right', color: '#a78bfa', fontWeight: yr.insuranceReceived > 0 ? 700 : 400 }}>{yr.insuranceReceived > 0 ? `+${fmt(yr.insuranceReceived)}` : '—'}</td>
                      <td style={{ padding: '8px 16px', textAlign: 'right', color: (noInsYr?.liquidAssets ?? 0) <= 0 ? '#ef4444' : 'rgba(253,248,242,0.50)' }}>{(noInsYr?.liquidAssets ?? 0) <= 0 ? '⛔ Gone' : fmt(noInsYr?.liquidAssets ?? 0)}</td>
                      <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 700, color: yr.liquidAssets <= 0 ? '#ef4444' : '#fdf8f2' }}>{yr.liquidAssets <= 0 ? '⛔ Gone' : fmt(yr.liquidAssets)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      <AIInsightPanel
        tool="stress_test"
        autoRefresh={events.length > 0}
        data={{
          events: events.map(e => ({ type: e.type, age: e.age, duration: e.durationYears })),
          baselineRunway: baseDepletionAge ?? 'solvent to 90+',
          withoutInsuranceRunway: noInsuranceDepletionAge ?? 'solvent to 90+',
          withInsuranceRunway: withInsuranceDepletionAge ?? 'solvent to 90+',
          yearsSaved,
          totalInsurancePayout: Math.round(totalInsuranceHelp),
          monthlyIncome: monthly_income,
          liquidSavings: liquid_savings,
        }}
        label="Analyse Stress Test"
      />
    </div>
  )
}
