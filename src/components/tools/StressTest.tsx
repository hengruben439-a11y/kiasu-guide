'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import AIInsightPanel from '@/components/ui/AIInsightPanel'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Event templates ──────────────────────────────────────────────────────────

const EVENT_TEMPLATES: Record<EventType, {
  label: string; color: string; icon: string; description: string
  defaultIncomeLoss: number; defaultDuration: number; defaultExtra: number
  insuranceTypes: BenefitBlock['benefit_type'][]
}> = {
  job_loss: {
    label: 'Job Loss', color: '#d97706', icon: '💼',
    description: 'Total income stops. Living expenses continue. No insurance applies directly.',
    defaultIncomeLoss: 1.0, defaultDuration: 1, defaultExtra: 0, insuranceTypes: [],
  },
  early_ci: {
    label: 'Early Critical Illness', color: '#f59e0b', icon: '🧬',
    description: 'Reduced income due to treatment. Early CI policy triggers a lump-sum payout.',
    defaultIncomeLoss: 0.5, defaultDuration: 2, defaultExtra: 2000, insuranceTypes: ['eci'],
  },
  advanced_ci: {
    label: 'Advanced Critical Illness', color: '#ea580c', icon: '🏥',
    description: 'Severe illness. Full income loss. Advanced CI + Early CI may both pay out.',
    defaultIncomeLoss: 1.0, defaultDuration: 5, defaultExtra: 5000, insuranceTypes: ['aci', 'eci'],
  },
  tpd: {
    label: 'Total Permanent Disability', color: '#dc2626', icon: '♿',
    description: 'Permanent loss of income. TPD + CareShield + PA all apply. Long-term horizon.',
    defaultIncomeLoss: 1.0, defaultDuration: 30, defaultExtra: 3000, insuranceTypes: ['tpd', 'careshield', 'pa'],
  },
  death: {
    label: 'Death', color: '#1e1e2e', icon: '🕊️',
    description: 'Death benefit pays out. Shows what dependants have to live on.',
    defaultIncomeLoss: 1.0, defaultDuration: 30, defaultExtra: 0, insuranceTypes: ['death'],
  },
  disability_partial: {
    label: 'Partial Disability', color: '#7c3aed', icon: '🦽',
    description: 'Reduced capacity. PA or partial CI may apply. Some income retained.',
    defaultIncomeLoss: 0.4, defaultDuration: 3, defaultExtra: 1000, insuranceTypes: ['pa', 'eci'],
  },
  custom: {
    label: 'Custom Event', color: '#6b7280', icon: '⚙️',
    description: 'Define your own scenario with custom income loss, duration, and payouts.',
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

// ─── Simulation engine ────────────────────────────────────────────────────────

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
  simYears = 40
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

    const lumpSumThisYear = activeEvents
      .filter(e => e.age === age)
      .reduce((s, e) => s + e.coverageApplied, 0)
    const monthlyBenefits = activeEvents.reduce((s, e) => s + e.monthlyBenefit * 12, 0)
    const insuranceReceived = lumpSumThisYear + monthlyBenefits

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

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function ChartTip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; dataKey: string }>; label?: number }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid rgba(42,31,26,0.12)', borderRadius: 10, padding: '12px 16px', fontFamily: "'Cabinet Grotesk', sans-serif", boxShadow: '0 4px 16px rgba(0,0,0,0.08)', minWidth: 200 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#a89070', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Age {label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12, margin: '3px 0' }}>
          <span style={{ color: p.color }}>■ {p.name}</span>
          <strong style={{ color: '#2a1f1a' }}>{fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ event, onUpdate, onRemove, maxAge }: {
  event: ScenarioEvent
  onUpdate: (u: Partial<ScenarioEvent>) => void
  onRemove: () => void
  maxAge: number
}) {
  const [expanded, setExpanded] = useState(false)
  const tmpl = EVENT_TEMPLATES[event.type]
  const borderColor = tmpl.color

  const field = (label: string, node: React.ReactNode) => (
    <div key={label}>
      <label style={{ fontSize: 11, fontWeight: 600, color: '#a89070', display: 'block', marginBottom: 4, fontFamily: "'Cabinet Grotesk', sans-serif" }}>{label}</label>
      {node}
    </div>
  )

  const inp = (v: string | number, onChange: (s: string) => void, type = 'number', extra = {}) => (
    <input
      type={type} value={v}
      onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1.5px solid rgba(42,31,26,0.12)', fontSize: 12, fontFamily: "'Cabinet Grotesk', sans-serif", boxSizing: 'border-box' as const }}
      {...extra}
    />
  )

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
      style={{ border: `2px solid ${borderColor}25`, borderLeft: `4px solid ${borderColor}`, borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
      <div onClick={() => setExpanded(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer' }}>
        <span style={{ fontSize: 20 }}>{tmpl.icon}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#2a1f1a', margin: '0 0 2px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>{event.label}</p>
          <p style={{ fontSize: 11, color: '#a89070', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Age {event.age} · {event.durationYears}yr · {Math.round(event.incomeLossPct * 100)}% income loss
            {event.coverageApplied > 0 && ` · ${fmt(event.coverageApplied)} lump sum`}
            {event.monthlyBenefit > 0 && ` · ${fmtSGD(event.monthlyBenefit)}/mo benefit`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${borderColor}18`, color: borderColor }}>{tmpl.label}</span>
          <button onClick={e => { e.stopPropagation(); onRemove() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a89070', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(42,31,26,0.06)' }}>
              <div className="grid-3col" style={{ gap: 14, paddingTop: 14 }}>
                {field('Event Label', inp(event.label, v => onUpdate({ label: v }), 'text'))}
                {field('Onset Age', inp(event.age, v => onUpdate({ age: parseInt(v) || event.age }), 'number'))}
                {field('Duration (years)', inp(event.durationYears, v => onUpdate({ durationYears: parseFloat(v) || 1 })))}
                {field('Income Loss (%)', inp(Math.round(event.incomeLossPct * 100), v => onUpdate({ incomeLossPct: Math.min(1, parseInt(v) / 100 || 0) })))}
                {field('Extra Monthly Expense (S$)', inp(event.extraExpenseMonthly, v => onUpdate({ extraExpenseMonthly: parseInt(v) || 0 })))}
                {field('Insurance Lump Sum (S$)', inp(event.coverageApplied, v => onUpdate({ coverageApplied: parseInt(v) || 0 })))}
                {field('Monthly Insurance Benefit (S$)', inp(event.monthlyBenefit, v => onUpdate({ monthlyBenefit: parseInt(v) || 0 })))}
              </div>
              <p style={{ fontSize: 11, color: '#a89070', margin: '12px 0 0', lineHeight: 1.6, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                {tmpl.description}
                {tmpl.insuranceTypes.length > 0 && <> Policies that typically apply: <strong>{tmpl.insuranceTypes.join(', ').toUpperCase()}</strong>.</>}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function StressTest({
  monthly_income, monthly_expenses, liquid_savings,
  cpf_oa, cpf_sa, cpf_ma,
  monthly_investment, inflation_rate, currentAge,
  benefitBlocks = [],
}: Props) {
  const [events, setEvents] = useState<ScenarioEvent[]>([])
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [chartMode, setChartMode] = useState<'liquid' | 'cashflow'>('liquid')

  const baseline = useMemo(() =>
    simulate(currentAge, monthly_income, monthly_expenses, liquid_savings, monthly_investment, inflation_rate, []),
  [monthly_income, monthly_expenses, liquid_savings, monthly_investment, inflation_rate, currentAge])

  const stressed = useMemo(() =>
    simulate(currentAge, monthly_income, monthly_expenses, liquid_savings, monthly_investment, inflation_rate, events),
  [events, monthly_income, monthly_expenses, liquid_savings, monthly_investment, inflation_rate, currentAge])

  const chartData = useMemo(() =>
    baseline.map((b, i) => ({
      age: b.age,
      baseline: b.liquidAssets,
      stressed: stressed[i]?.liquidAssets ?? 0,
      insuranceHelp: stressed[i]?.insuranceReceived ?? 0,
      cashflow: stressed[i]?.cashFlow ?? 0,
    })),
  [baseline, stressed])

  const baseDepletionAge = baseline.find(y => y.liquidAssets === 0)?.age
  const stressDepletionAge = stressed.find(y => y.liquidAssets === 0)?.age
  const totalInsuranceHelp = stressed.reduce((s, y) => s + y.insuranceReceived, 0)
  const worstCashFlow = events.length > 0 ? Math.min(...stressed.map(y => y.cashFlow)) : 0
  const worstYear = stressed.find(y => y.cashFlow === worstCashFlow)

  const addEvent = useCallback((type: EventType) => {
    const tmpl = EVENT_TEMPLATES[type]
    const relevant = benefitBlocks.filter(b => b.enabled && (tmpl.insuranceTypes as string[]).includes(b.benefit_type))
    const lumpSum = relevant.filter(b => b.payout_mode !== 'monthly').reduce((s, b) => s + b.coverage, 0)
    const monthly = relevant.filter(b => b.payout_mode === 'monthly').reduce((s, b) => s + b.coverage, 0)
    const newEvent: ScenarioEvent = {
      id: genId(), type, age: currentAge + 10,
      durationYears: tmpl.defaultDuration, incomeLossPct: tmpl.defaultIncomeLoss,
      extraExpenseMonthly: tmpl.defaultExtra, coverageApplied: lumpSum,
      monthlyBenefit: monthly, label: tmpl.label,
    }
    setEvents(prev => [...prev, newEvent])
    setShowAddMenu(false)
  }, [currentAge, benefitBlocks])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: "'Cabinet Grotesk', sans-serif" }}>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #2a1f1a 0%, #3d2d25 100%)', borderRadius: 16, padding: '28px 32px', color: '#fdf8f2' }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 8px' }}>Financial Stress Test</p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#fdf8f2', margin: '0 0 10px' }}>What happens when life doesn&apos;t go to plan?</h2>
        <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.65)', margin: '0 0 20px', lineHeight: 1.7 }}>
          Add life events to your timeline. Watch your financial runway shrink — then see how your insurance coverage extends it.
          Build the scenario layer by layer to make the risk undeniably visible.
        </p>
        <div className="grid-3col" style={{ gap: 12 }}>
          {[
            { label: 'Liquid Assets', value: fmtSGD(liquid_savings) },
            { label: 'Monthly Net', value: fmtSGD(monthly_income - monthly_expenses) },
            { label: 'Policies on File', value: benefitBlocks.length > 0 ? `${benefitBlocks.filter(b => b.enabled).length} active` : 'None loaded' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'rgba(253,248,242,0.08)', borderRadius: 10, padding: '12px 16px' }}>
              <p style={{ fontSize: 10, color: '#c4a882', margin: '0 0 4px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#fdf8f2', margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Event Builder */}
      <div style={{ background: '#fff', border: '1px solid rgba(42,31,26,0.07)', borderRadius: 16, padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 4px' }}>Scenario Builder</p>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#2a1f1a', margin: 0 }}>Your Life Events</h3>
          </div>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowAddMenu(v => !v)} style={{ padding: '9px 18px', borderRadius: 9, fontSize: 13, fontWeight: 700, background: '#7a1c2e', color: '#fdf8f2', border: 'none', cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              + Add Event
            </button>
            {showAddMenu && (
              <div style={{ position: 'absolute', right: 0, top: '110%', zIndex: 100, background: '#fff', border: '1px solid rgba(42,31,26,0.12)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', padding: 8, minWidth: 280 }}>
                {(Object.entries(EVENT_TEMPLATES) as [EventType, typeof EVENT_TEMPLATES[EventType]][]).map(([key, tmpl]) => (
                  <button key={key} onClick={() => addEvent(key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 14px', borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: "'Cabinet Grotesk', sans-serif" }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(42,31,26,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{ fontSize: 18 }}>{tmpl.icon}</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#2a1f1a', margin: '0 0 1px' }}>{tmpl.label}</p>
                      <p style={{ fontSize: 10, color: '#a89070', margin: 0 }}>{tmpl.description.split('.')[0]}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(253,248,242,0.6)', borderRadius: 12, border: '1.5px dashed rgba(196,168,130,0.4)' }}>
            <p style={{ fontSize: 28, margin: '0 0 10px' }}>🎯</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#2a1f1a', margin: '0 0 6px', fontFamily: "'Playfair Display', serif" }}>Build your stress scenario</p>
            <p style={{ fontSize: 12, color: '#a89070', margin: 0, lineHeight: 1.7 }}>Add a life event — job loss, critical illness, TPD — and see what it does to your financial runway. Then add your insurance coverage to see how much it helps.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AnimatePresence>
              {events.map(e => (
                <EventCard key={e.id} event={e}
                  onUpdate={u => setEvents(prev => prev.map(ev => ev.id === e.id ? { ...ev, ...u } : ev))}
                  onRemove={() => setEvents(prev => prev.filter(ev => ev.id !== e.id))}
                  maxAge={currentAge + 60}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Runway metrics */}
      {events.length > 0 && (
        <div className="grid-4col" style={{ gap: 14 }}>
          {[
            { label: 'Baseline Runway', value: baseDepletionAge ? `Age ${baseDepletionAge}` : 'Age 90+', sub: 'No adverse events', color: '#16a34a', icon: '📈' },
            { label: 'Stressed Runway', value: stressDepletionAge ? `Age ${stressDepletionAge}` : 'Age 90+', sub: `With ${events.length} event${events.length !== 1 ? 's' : ''}`, color: stressDepletionAge && stressDepletionAge < 80 ? '#dc2626' : '#d97706', icon: '⚡' },
            { label: 'Insurance Payouts', value: totalInsuranceHelp > 0 ? fmt(totalInsuranceHelp) : 'S$0', sub: 'Total across all events', color: '#7a1c2e', icon: '🛡️' },
            { label: 'Worst Annual Cash Flow', value: fmt(worstCashFlow), sub: worstYear ? `At age ${worstYear.age}` : '—', color: worstCashFlow < 0 ? '#dc2626' : '#16a34a', icon: worstCashFlow < 0 ? '🔴' : '🟢' },
          ].map(({ label, value, sub, color, icon }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid rgba(42,31,26,0.07)', borderRadius: 14, padding: '20px 22px', boxShadow: '0 2px 8px rgba(42,31,26,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a89070', margin: 0 }}>{label}</p>
                <span style={{ fontSize: 18 }}>{icon}</span>
              </div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color, margin: '0 0 4px' }}>{value}</p>
              <p style={{ fontSize: 11, color: '#a89070', margin: 0 }}>{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div style={{ background: '#fff', border: '1px solid rgba(42,31,26,0.07)', borderRadius: 16, padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 4px' }}>Financial Runway</p>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#2a1f1a', margin: 0 }}>
              {events.length === 0 ? 'Baseline (no events)' : 'Baseline vs. Stressed Scenario'}
            </h3>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ key: 'liquid', label: 'Liquid Assets' }, { key: 'cashflow', label: 'Cash Flow' }].map(({ key, label }) => (
              <button key={key} onClick={() => setChartMode(key as 'liquid' | 'cashflow')}
                style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: chartMode === key ? '1.5px solid #7a1c2e' : '1.5px solid rgba(42,31,26,0.12)', background: chartMode === key ? 'rgba(122,28,46,0.08)' : '#fff', color: chartMode === key ? '#7a1c2e' : '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="gBL" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gST" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#dc2626" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,31,26,0.04)" />
            <XAxis dataKey="age" tick={{ fontSize: 10, fill: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }} width={60} />
            <Tooltip content={<ChartTip />} />
            <ReferenceLine y={0} stroke="rgba(220,38,38,0.4)" strokeDasharray="4 4" />
            {events.map(e => (
              <ReferenceLine key={e.id} x={e.age} stroke={EVENT_TEMPLATES[e.type].color} strokeDasharray="4 3"
                label={{ value: EVENT_TEMPLATES[e.type].icon, position: 'top', fontSize: 14 }} />
            ))}
            {chartMode === 'liquid' ? (
              <>
                <Area type="monotone" dataKey="baseline" name="Baseline" stroke="#16a34a" fill="url(#gBL)" strokeWidth={2} dot={false} />
                {events.length > 0 && <>
                  <Area type="monotone" dataKey="stressed" name="Stressed" stroke="#dc2626" fill="url(#gST)" strokeWidth={2} dot={false} />
                  <Bar dataKey="insuranceHelp" name="Insurance" fill="#7a1c2e" opacity={0.6} barSize={5} />
                </>}
              </>
            ) : (
              <Bar dataKey="cashflow" name="Annual Cash Flow" fill="#7a1c2e" opacity={0.75} barSize={8} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Year-by-year table */}
      {events.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid rgba(42,31,26,0.07)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '18px 28px', borderBottom: '1px solid rgba(42,31,26,0.06)', background: '#fdf8f2' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 4px' }}>Step-by-Step</p>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#2a1f1a', margin: 0 }}>Year-by-Year Breakdown</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              <thead>
                <tr style={{ background: 'rgba(253,248,242,0.8)' }}>
                  {['Age', 'Income/yr', 'Expenses/yr', 'Insurance', 'Cash Flow', 'Liquid Assets'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#a89070', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stressed.slice(0, 25).map((yr, i) => {
                  const eventYear = events.some(e => yr.age >= e.age && yr.age < e.age + e.durationYears)
                  return (
                    <tr key={yr.age} style={{ borderTop: '1px solid rgba(42,31,26,0.04)', background: eventYear ? 'rgba(122,28,46,0.03)' : i % 2 === 0 ? 'transparent' : 'rgba(253,248,242,0.5)' }}>
                      <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 700, color: '#2a1f1a' }}>{yr.age}{eventYear && <span style={{ marginLeft: 6, fontSize: 10 }}>⚡</span>}</td>
                      <td style={{ padding: '8px 16px', textAlign: 'right', color: '#16a34a' }}>{fmt(yr.incomeAnnual)}</td>
                      <td style={{ padding: '8px 16px', textAlign: 'right', color: '#dc2626' }}>{fmt(yr.expensesAnnual)}</td>
                      <td style={{ padding: '8px 16px', textAlign: 'right', color: '#7a1c2e', fontWeight: yr.insuranceReceived > 0 ? 700 : 400 }}>{yr.insuranceReceived > 0 ? `+${fmt(yr.insuranceReceived)}` : '—'}</td>
                      <td style={{ padding: '8px 16px', textAlign: 'right', color: yr.cashFlow >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{fmt(yr.cashFlow)}</td>
                      <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 700, color: yr.liquidAssets <= 0 ? '#dc2626' : '#2a1f1a' }}>{yr.liquidAssets <= 0 ? '⛔ Depleted' : fmt(yr.liquidAssets)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Insurance impact callout */}
      {events.length > 0 && totalInsuranceHelp > 0 && (
        <div style={{ background: 'linear-gradient(135deg, rgba(122,28,46,0.06) 0%, rgba(196,168,130,0.04) 100%)', border: '1px solid rgba(122,28,46,0.15)', borderRadius: 16, padding: '24px 28px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7a1c2e', margin: '0 0 8px' }}>Insurance Impact</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#2a1f1a', margin: '0 0 12px' }}>
            Your policies contribute {fmtSGD(totalInsuranceHelp)} in this scenario
          </h3>
          <p style={{ fontSize: 13, color: '#6b5c52', margin: 0, lineHeight: 1.7 }}>
            {stressDepletionAge && baseDepletionAge && stressDepletionAge < baseDepletionAge
              ? `Even with ${fmtSGD(totalInsuranceHelp)} in insurance payouts, your runway shortens from age ${baseDepletionAge} to ${stressDepletionAge}. This illustrates why coverage levels matter — not just having a policy, but having the right amount.`
              : `Your insurance coverage is sufficient to keep you financially solvent through this stress scenario. The policies are working as designed.`
            }
          </p>
        </div>
      )}

      {/* AI Insight */}
      <AIInsightPanel
        tool="stress_test"
        autoRefresh={events.length > 0}
        data={{
          events: events.map(e => ({ type: e.type, age: e.age, duration: e.durationYears })),
          baselineRunway: baseDepletionAge ?? 'solvent to 90+',
          stressedRunway: stressDepletionAge ?? 'solvent to 90+',
          totalInsurancePayout: Math.round(totalInsuranceHelp),
          worstMonthlyCashFlow: Math.round(worstCashFlow),
          monthlyIncome: monthly_income,
          liquidSavings: liquid_savings,
        }}
        label="Analyse Stress Test"
      />
    </div>
  )
}
