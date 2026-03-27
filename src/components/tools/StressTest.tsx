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
  simYears = 50,
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
  cpf_oa, cpf_sa, cpf_ma,
  monthly_investment, inflation_rate, currentAge,
  benefitBlocks = [],
}: Props) {
  // Include CPF balances as part of effective liquid savings
  const effectiveSavings = liquid_savings + cpf_oa + cpf_sa + cpf_ma
  const [events, setEvents] = useState<ScenarioEvent[]>([])
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showChart, setShowChart] = useState(true)
  const [showTable, setShowTable] = useState(false)
  const [showAllYears, setShowAllYears] = useState(false)

  const baseline = useMemo(() =>
    simulate(currentAge, monthly_income, monthly_expenses, effectiveSavings, monthly_investment, inflation_rate, [], false),
  [monthly_income, monthly_expenses, effectiveSavings, monthly_investment, inflation_rate, currentAge])

  const stressedNoInsurance = useMemo(() =>
    simulate(currentAge, monthly_income, monthly_expenses, effectiveSavings, monthly_investment, inflation_rate, events, false),
  [events, monthly_income, monthly_expenses, effectiveSavings, monthly_investment, inflation_rate, currentAge])

  const stressedWithInsurance = useMemo(() =>
    simulate(currentAge, monthly_income, monthly_expenses, effectiveSavings, monthly_investment, inflation_rate, events, true),
  [events, monthly_income, monthly_expenses, effectiveSavings, monthly_investment, inflation_rate, currentAge])

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

  // Per-event impact analysis — ranked by severity (enhanced with insurance sim)
  const eventImpacts = useMemo(() => {
    if (events.length === 0) return []
    const baseDepletion = baseline.find(y => y.liquidAssets === 0)?.age ?? currentAge + 90
    return events.map(event => {
      const soloNoIns = simulate(currentAge, monthly_income, monthly_expenses, effectiveSavings, monthly_investment, inflation_rate, [event], false)
      const soloWithIns = simulate(currentAge, monthly_income, monthly_expenses, effectiveSavings, monthly_investment, inflation_rate, [event], true)
      const depletionAge = soloNoIns.find(y => y.liquidAssets === 0)?.age ?? currentAge + 90
      const depletionAgeWithIns = soloWithIns.find(y => y.liquidAssets === 0)?.age ?? currentAge + 90
      const runwayYears = depletionAge - currentAge
      const baseRunway = baseDepletion - currentAge
      const impactYears = baseRunway - runwayYears
      const yearsSavedByIns = depletionAgeWithIns - depletionAge
      const severity: 'critical' | 'attention' | 'good' =
        runwayYears < 3 ? 'critical' : runwayYears < 6 ? 'attention' : 'good'

      const tmpl = EVENT_TEMPLATES[event.type]
      let recommendation: string
      switch (event.type) {
        case 'job_loss':
          recommendation = 'Build emergency fund to 6+ months of expenses'
          break
        case 'early_ci':
        case 'advanced_ci':
          recommendation = 'Add CI coverage for lump-sum payout on diagnosis'
          break
        case 'tpd':
          recommendation = 'Increase TPD coverage to match income replacement'
          break
        case 'death':
          recommendation = 'Ensure death benefit covers dependants\' needs (10× income)'
          break
        case 'disability_partial':
          recommendation = 'PA or partial CI cover can offset reduced income'
          break
        default:
          recommendation = impactYears > 5 ? 'Review emergency fund and insurance coverage' : 'Monitor and adjust as needed'
      }

      return {
        id: event.id,
        label: event.label,
        type: event.type,
        icon: tmpl.icon,
        color: tmpl.color,
        age: event.age,
        depletionAge,
        depletionAgeWithIns,
        yearsSavedByIns,
        runwayYears,
        impactYears,
        severity,
        recommendation,
      }
    }).sort((a, b) => a.runwayYears - b.runwayYears)
  }, [events, baseline, currentAge, monthly_income, monthly_expenses, liquid_savings, monthly_investment, inflation_rate])

  // Derive first event for narrative
  const firstEvent = events.length > 0 ? events.reduce((a, b) => a.age < b.age ? a : b) : null
  const firstEventAge = firstEvent?.age ?? currentAge
  const firstEventLabel = firstEvent?.label ?? ''

  // Timeline bar segment computation
  const maxAge = currentAge + 45
  const totalSpan = maxAge - currentAge

  const workingYears = firstEvent ? Math.max(0, firstEventAge - currentAge) : 0
  const eventDuration = firstEvent ? firstEvent.durationYears : 0
  const noInsDepAge = noInsuranceDepletionAge ?? maxAge
  const withInsDepAge = withInsuranceDepletionAge ?? maxAge
  const uninsuredRunway = Math.max(0, noInsDepAge - (firstEventAge + eventDuration))
  const insuranceExtension = Math.max(0, withInsDepAge - noInsDepAge)
  const remainingYears = Math.max(0, totalSpan - workingYears - eventDuration - uninsuredRunway - insuranceExtension)

  // Filtered table years
  const tableYears = useMemo(() => {
    if (showAllYears) return stressedWithInsurance
    const eventAges = events.flatMap(e => {
      const ages: number[] = []
      for (let a = e.age - 2; a <= e.age + e.durationYears + 2; a++) {
        ages.push(a)
      }
      return ages
    })
    const eventAgeSet = new Set(eventAges)
    return stressedWithInsurance.filter(yr => eventAgeSet.has(yr.age))
  }, [stressedWithInsurance, events, showAllYears])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Cabinet Grotesk', sans-serif" }}>

      {/* ── Section 1: Header + Baseline Stats ─────────────────────────────── */}
      <div style={{ marginBottom: 4 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 6px' }}>Step 1 · Your Financial Base</p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#fdf8f2', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          How long can you survive if everything stops?
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.50)', margin: 0 }}>
          Add life events to your timeline. Watch your runway shrink — then see what your insurance coverage actually saves.
        </p>
      </div>

      <div className="grid-3col" style={{ gap: 14 }}>
        {[
          { label: 'Liquid Assets', value: fmtSGD(liquid_savings), icon: '💰', color: '#c4a882', delay: 0 },
          { label: 'Monthly Net Cashflow', value: fmtSGD(monthly_income - monthly_expenses), icon: '📊', color: monthly_income > monthly_expenses ? '#10b981' : '#ef4444', delay: 0.1 },
          { label: 'Policies Loaded', value: benefitBlocks.filter(b => b.enabled).length > 0 ? `${benefitBlocks.filter(b => b.enabled).length} active` : 'None', icon: '🛡️', color: '#a78bfa', delay: 0.2 },
        ].map(({ label, value, icon, color, delay }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay }}
          >
            <GlassCard style={{ padding: '18px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.6)', margin: 0 }}>{label}</p>
                <span style={{ fontSize: 16 }}>{icon}</span>
              </div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color, margin: 0 }}>{value}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* ── Section 2: Scenario Builder ────────────────────────────────────── */}
      <GlassCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: events.length > 0 ? 20 : 0 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 4px' }}>Step 2 · Scenario Builder</p>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#fdf8f2', margin: 0 }}>Choose a Life Event to Stress Test</h3>
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

      {/* ── Section 3: YOUR FINANCIAL STORY ────────────────────────────────── */}
      {events.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
            {/* Gradient header */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(155,32,64,0.20) 0%, rgba(122,28,46,0.08) 100%)',
              padding: '28px 32px',
              borderBottom: '1px solid rgba(196,168,130,0.1)',
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 10px' }}>Step 3 · Your Results</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#fdf8f2', margin: 0, lineHeight: 1.4 }}>
                &ldquo;If {firstEventLabel} happens at age {firstEventAge}...&rdquo;
              </p>
            </div>

            {/* Timeline bar + narrative */}
            <div style={{ padding: '24px 32px' }}>

              {/* Horizontal life timeline */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', height: 48, borderRadius: 8, overflow: 'hidden' }}>
                  {/* Working years */}
                  {workingYears > 0 && (
                    <div style={{
                      width: `${(workingYears / totalSpan) * 100}%`,
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: workingYears > 2 ? 40 : 20,
                      position: 'relative',
                    }}>
                      {workingYears > 4 && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#fdf8f2', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                          Working
                        </span>
                      )}
                    </div>
                  )}
                  {/* Event years */}
                  {eventDuration > 0 && (
                    <div style={{
                      width: `${(eventDuration / totalSpan) * 100}%`,
                      background: `linear-gradient(135deg, ${firstEvent ? EVENT_TEMPLATES[firstEvent.type].color : '#ef4444'}, ${firstEvent ? EVENT_TEMPLATES[firstEvent.type].color : '#ef4444'}cc)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 24,
                      position: 'relative',
                    }}>
                      <span style={{ fontSize: 14 }}>{firstEvent ? EVENT_TEMPLATES[firstEvent.type].icon : '⚡'}</span>
                    </div>
                  )}
                  {/* Uninsured runway */}
                  {uninsuredRunway > 0 && (
                    <div style={{
                      width: `${(uninsuredRunway / totalSpan) * 100}%`,
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: uninsuredRunway > 2 ? 40 : 20,
                      position: 'relative',
                    }}>
                      {uninsuredRunway > 4 && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#fdf8f2', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                          Depleting
                        </span>
                      )}
                    </div>
                  )}
                  {/* Insurance extension */}
                  {insuranceExtension > 0 && (
                    <div style={{
                      width: `${(insuranceExtension / totalSpan) * 100}%`,
                      background: 'linear-gradient(135deg, #9b2040, #7a1c2e)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: insuranceExtension > 2 ? 40 : 20,
                      position: 'relative',
                    }}>
                      {insuranceExtension > 4 && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#fdf8f2', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                          +Insurance
                        </span>
                      )}
                    </div>
                  )}
                  {/* Remaining (grey) */}
                  {remainingYears > 0 && (
                    <div style={{
                      width: `${(remainingYears / totalSpan) * 100}%`,
                      background: 'rgba(253,248,242,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 10,
                    }}>
                      {remainingYears > 6 && (
                        <span style={{ fontSize: 10, color: 'rgba(253,248,242,0.25)' }}>
                          ...
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Timeline labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 10, color: 'rgba(253,248,242,0.35)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                    Age {currentAge}
                  </span>
                  {firstEvent && (
                    <span style={{ fontSize: 10, color: EVENT_TEMPLATES[firstEvent.type].color, fontWeight: 700, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                      {firstEvent.label} @ {firstEventAge}
                    </span>
                  )}
                  {noInsuranceDepletionAge && (
                    <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                      Depleted @ {noInsuranceDepletionAge}
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: 'rgba(253,248,242,0.35)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                    Age {maxAge}
                  </span>
                </div>
              </div>

              {/* Side-by-side comparison */}
              <div className="grid-2col" style={{ gap: 20, marginTop: 24 }}>
                {/* WITHOUT INSURANCE */}
                <div style={{
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  borderRadius: 14,
                  padding: '24px',
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#ef4444', margin: '0 0 10px' }}>Without Insurance</p>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#ef4444', margin: '0 0 10px' }}>
                    Age {noInsuranceDepletionAge || '90+'}
                  </p>
                  <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.50)', margin: 0, lineHeight: 1.6, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                    {noInsuranceDepletionAge
                      ? `Your savings run out at age ${noInsuranceDepletionAge}. That's only ${noInsuranceDepletionAge - firstEventAge} years from the event.`
                      : 'Your savings survive — you have enough runway even without coverage.'
                    }
                  </p>
                </div>

                {/* WITH YOUR POLICIES */}
                <div style={{
                  background: 'rgba(155,32,64,0.06)',
                  border: '1px solid rgba(155,32,64,0.2)',
                  borderRadius: 14,
                  padding: '24px',
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#10b981', margin: '0 0 10px' }}>With Your Policies</p>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#fdf8f2', margin: '0 0 10px' }}>
                    Age {withInsuranceDepletionAge || '90+'}
                  </p>
                  <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.50)', margin: 0, lineHeight: 1.6, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                    {yearsSaved > 0
                      ? `Your coverage extends your runway to age ${withInsuranceDepletionAge || '90+'}. That's ${yearsSaved} extra years your family is protected.`
                      : withInsuranceDepletionAge
                        ? `Even with coverage, your savings deplete at age ${withInsuranceDepletionAge}.`
                        : 'Your coverage keeps you solvent through retirement.'
                    }
                  </p>
                </div>
              </div>

              {/* Center hero stat */}
              {yearsSaved > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}
                >
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(155,32,64,0.20))',
                    border: '1px solid rgba(167,139,250,0.25)',
                    borderRadius: 16,
                    padding: '28px 36px',
                    textAlign: 'center',
                    minWidth: 280,
                  }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 10px' }}>Insurance Bought You</p>
                    <p style={{ fontSize: 56, fontFamily: "'Playfair Display', serif", fontWeight: 700, color: '#fdf8f2', margin: '0 0 6px', lineHeight: 1 }}>
                      {yearsSaved} YEARS
                    </p>
                    <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.50)', margin: 0 }}>
                      worth {fmtSGD(totalInsuranceHelp)} in total payouts
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* ── Section 4: Per-Event Impact Cards (Enhanced) ────────────────────── */}
      {eventImpacts.length > 0 && (
        <GlassCard>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 4px' }}>Step 4 · Event Breakdown</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#fdf8f2', margin: '0 0 16px' }}>
            How each event impacts your runway
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {eventImpacts.map(impact => {
              const sevColor = impact.severity === 'critical' ? '#ef4444' : impact.severity === 'attention' ? '#f59e0b' : '#10b981'
              const sevBg = impact.severity === 'critical' ? 'rgba(239,68,68,0.08)' : impact.severity === 'attention' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)'
              const noInsAge = impact.depletionAge >= currentAge + 80 ? null : impact.depletionAge
              const withInsAge = impact.depletionAgeWithIns >= currentAge + 80 ? null : impact.depletionAgeWithIns
              const maxBar = currentAge + 45
              const noInsWidth = noInsAge ? Math.max(5, ((noInsAge - currentAge) / (maxBar - currentAge)) * 100) : 100
              const withInsWidth = withInsAge ? Math.max(5, ((withInsAge - currentAge) / (maxBar - currentAge)) * 100) : 100

              return (
                <motion.div
                  key={impact.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}
                  style={{
                    padding: '14px 18px', borderRadius: 12,
                    background: sevBg, border: `1px solid ${sevColor}20`,
                    borderLeft: `3px solid ${sevColor}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{impact.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#fdf8f2', fontFamily: "'Playfair Display', serif" }}>{impact.label}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                          padding: '2px 7px', borderRadius: 5,
                          background: `${sevColor}20`, color: sevColor,
                        }}>
                          {impact.severity === 'critical' ? 'Critical' : impact.severity === 'attention' ? 'Attention' : 'Survivable'}
                        </span>
                      </div>

                      {/* Depletion comparison text */}
                      <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
                        <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.55)', margin: 0, lineHeight: 1.4 }}>
                          Without insurance: <strong style={{ color: '#ef4444' }}>depleted at age {noInsAge ?? '90+'}</strong>
                        </p>
                        <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.55)', margin: 0, lineHeight: 1.4 }}>
                          With insurance: <strong style={{ color: '#9b2040' }}>depleted at age {withInsAge ?? '90+'}</strong>
                        </p>
                        {impact.yearsSavedByIns > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', background: 'rgba(167,139,250,0.12)', padding: '2px 8px', borderRadius: 6 }}>
                            +{impact.yearsSavedByIns}yr saved
                          </span>
                        )}
                      </div>

                      {/* Mini horizontal runway comparison bar */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 9, color: '#ef4444', width: 60, flexShrink: 0, fontWeight: 600 }}>No ins.</span>
                          <div style={{ flex: 1, height: 6, background: 'rgba(253,248,242,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              width: `${noInsWidth}%`, height: '100%',
                              background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                              borderRadius: 3,
                              transition: 'width 0.6s ease',
                            }} />
                          </div>
                          <span style={{ fontSize: 9, color: 'rgba(253,248,242,0.35)', width: 40, textAlign: 'right', flexShrink: 0 }}>{noInsAge ?? '90+'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 9, color: '#9b2040', width: 60, flexShrink: 0, fontWeight: 600 }}>With ins.</span>
                          <div style={{ flex: 1, height: 6, background: 'rgba(253,248,242,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              width: `${withInsWidth}%`, height: '100%',
                              background: 'linear-gradient(90deg, #9b2040, #7a1c2e)',
                              borderRadius: 3,
                              transition: 'width 0.6s ease',
                            }} />
                          </div>
                          <span style={{ fontSize: 9, color: 'rgba(253,248,242,0.35)', width: 40, textAlign: 'right', flexShrink: 0 }}>{withInsAge ?? '90+'}</span>
                        </div>
                      </div>

                      <p style={{ fontSize: 11, color: '#c4a882', margin: 0, fontWeight: 600 }}>
                        → {impact.recommendation}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </GlassCard>
      )}

      {/* ── Section 5: Financial Runway Chart (Collapsible) ─────────────────── */}
      <GlassCard>
        <div
          onClick={() => setShowChart(!showChart)}
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 4px' }}>Step 3 · Financial Runway Chart</p>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#fdf8f2', margin: 0 }}>
              {events.length === 0 ? 'Your baseline trajectory' : 'How your savings hold up'}
            </h3>
          </div>
          <span style={{ color: '#c4a882', fontSize: 20 }}>{showChart ? '▲' : '▼'}</span>
        </div>
        <AnimatePresence>
          {showChart && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ marginTop: 20 }}>
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
                    <ReferenceLine y={0} stroke="rgba(239,68,68,0.5)" strokeDasharray="4 4"
                      label={{ value: 'Savings depleted', position: 'insideBottomLeft', fontSize: 10, fill: 'rgba(239,68,68,0.6)', fontFamily: "'Cabinet Grotesk', sans-serif" }}
                    />
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
                  ].map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'rgba(253,248,242,0.45)' }}>
                      <div style={{ width: 18, height: 2, borderRadius: 2, background: color }} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

      {/* ── Section 6: Year-by-Year Table (Collapsible, filtered) ──────────── */}
      {events.length > 0 && (
        <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
          <div
            onClick={() => setShowTable(!showTable)}
            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: showTable ? '1px solid rgba(196,168,130,0.08)' : 'none' }}
          >
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 4px' }}>Step-by-Step</p>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#fdf8f2', margin: 0 }}>Year-by-Year Breakdown</h3>
            </div>
            <span style={{ color: '#c4a882', fontSize: 20 }}>{showTable ? '▲' : '▼'}</span>
          </div>
          <AnimatePresence>
            {showTable && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35 }}
                style={{ overflow: 'hidden' }}
              >
                {/* Show all years toggle */}
                <div style={{ padding: '12px 24px 0', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowAllYears(v => !v)}
                    style={{
                      padding: '5px 14px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                      background: showAllYears ? 'rgba(155,32,64,0.15)' : 'rgba(196,168,130,0.08)',
                      color: showAllYears ? '#9b2040' : 'rgba(253,248,242,0.50)',
                      border: `1px solid ${showAllYears ? 'rgba(155,32,64,0.25)' : 'rgba(196,168,130,0.12)'}`,
                      cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif",
                    }}
                  >
                    {showAllYears ? 'Show event years only' : 'Show all years'}
                  </button>
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
                      {tableYears.map((yr, i) => {
                        const eventYear = events.some(e => yr.age >= e.age && yr.age < e.age + e.durationYears)
                        const fullIdx = yr.age - currentAge
                        const noInsYr = stressedNoInsurance[fullIdx]
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
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      )}

      {/* ── Section 7: AI Insights ─────────────────────────────────────────── */}
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
