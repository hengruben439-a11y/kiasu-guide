'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import AIInsightPanel from '@/components/ui/AIInsightPanel'

// ─── Types ───────────────────────────────────────────────────────────────────

interface BenefitBlock {
  id: string
  user_id: string
  benefit_type: 'death' | 'tpd' | 'eci' | 'aci' | 'hospitalisation' | 'pa' | 'careshield'
  policy_name: string | null
  coverage: number
  payout_mode: 'lump_sum' | 'monthly' | 'multipay' | null
  multiplier: number | null
  max_claims: number | null
  cooldown_years: number | null
  expiry_age: number | null
  renewal_date: string | null
  enabled: boolean
}

interface Props {
  monthlyIncome: number
  monthlyExpenses: number
  liquidSavings: number
  benefitBlocks: BenefitBlock[]
  userId: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSGD(v: number): string {
  return `S$${Math.round(v).toLocaleString('en-SG')}`
}

function totalCoverage(blocks: BenefitBlock[], type: BenefitBlock['benefit_type']): number {
  return blocks
    .filter((b) => b.benefit_type === type && b.enabled)
    .reduce((sum, b) => sum + b.coverage, 0)
}

function hasBenefitType(blocks: BenefitBlock[], type: BenefitBlock['benefit_type']): boolean {
  return blocks.some((b) => b.benefit_type === type && b.enabled)
}

function computeScore(
  blocks: BenefitBlock[],
  annualIncome: number,
  liquidSavings: number,
  monthlyExpenses: number
): number {
  let score = 0
  const deathCov = totalCoverage(blocks, 'death')
  const tpdCov = totalCoverage(blocks, 'tpd')
  const eciCov = totalCoverage(blocks, 'eci')
  const hasHosp = hasBenefitType(blocks, 'hospitalisation')
  const hasCS = hasBenefitType(blocks, 'careshield') || hasBenefitType(blocks, 'pa')
  const emerFund = monthlyExpenses > 0 ? liquidSavings / monthlyExpenses : 0

  if (deathCov >= annualIncome * 10) score += 25
  else if (deathCov >= annualIncome * 7) score += 15
  else if (deathCov >= annualIncome * 5) score += 8
  if (tpdCov >= annualIncome * 10) score += 20
  else if (tpdCov >= annualIncome * 7) score += 12
  else if (tpdCov >= annualIncome * 4) score += 6
  const aciCovScore = totalCoverage(blocks, 'aci')
  if (aciCovScore >= annualIncome * 5) score += 15
  else if (aciCovScore >= annualIncome * 3) score += 8
  if (eciCov >= annualIncome * 3.5) score += 15
  else if (eciCov >= annualIncome * 2) score += 8
  if (hasHosp) score += 15
  if (hasCS) score += 5
  if (emerFund >= 6) score += 5
  else if (emerFund >= 3) score += 2

  return Math.min(100, score)
}

// ─── SVG Circular Progress ────────────────────────────────────────────────────

function CircleProgress({ score }: { score: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const colour =
    score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : score >= 40 ? '#ea580c' : '#dc2626'
  const label =
    score >= 80
      ? 'Well Protected'
      : score >= 60
      ? 'Adequate'
      : score >= 40
      ? 'Fair'
      : 'Under-protected'

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={128} height={128} viewBox="0 0 128 128">
        <circle cx={64} cy={64} r={radius} fill="none" stroke="rgba(196,168,130,0.1)" strokeWidth={10} />
        <motion.circle
          cx={64}
          cy={64}
          r={radius}
          fill="none"
          stroke={colour}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '64px 64px' }}
        />
        <text
          x={64}
          y={60}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={colour}
          fontSize={28}
          fontWeight={700}
          fontFamily="'Playfair Display', serif"
        >
          {score}
        </text>
        <text
          x={64}
          y={82}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(253,248,242,0.5)"
          fontSize={10}
          fontFamily="'Cabinet Grotesk', sans-serif"
        >
          / 100
        </text>
      </svg>
      <span
        className="text-sm font-semibold"
        style={{ color: colour, fontFamily: "'Cabinet Grotesk', sans-serif" }}
      >
        {label}
      </span>
    </div>
  )
}

// ─── Benefit metadata ─────────────────────────────────────────────────────────

const BENEFIT_META: {
  type: BenefitBlock['benefit_type']
  label: string
  icon: string
  color: string
  description: string
  whenPays: string
  rec: (income: number) => number | null
  recLabel: (income: number) => string
}[] = [
  {
    type: 'death',
    label: 'Death',
    icon: '🛡️',
    color: '#7a1c2e',
    description: 'Pays a lump sum to your dependants if you pass away. Designed to replace your income and clear outstanding liabilities so your family is not left financially exposed.',
    whenPays: 'Upon death of the insured',
    rec: (i) => i * 10,
    recLabel: (i) => `${formatSGD(i * 10)} (10× annual income)`,
  },
  {
    type: 'tpd',
    label: 'Total & Permanent Disability',
    icon: '♿',
    color: '#b45309',
    description: 'Pays out if you become totally and permanently disabled and can no longer work in any occupation. Covers lost income, rehabilitation costs, and lifestyle modifications.',
    whenPays: 'Upon TPD diagnosis (typically defined as inability to perform 3 of 6 ADLs or any occupation)',
    rec: (i) => i * 10,
    recLabel: (i) => `${formatSGD(i * 10)} (10× annual income)`,
  },
  {
    type: 'aci',
    label: 'Advanced Critical Illness',
    icon: '🏥',
    color: '#0f766e',
    description: 'Pays a lump sum upon diagnosis of a major-stage critical illness such as end-stage cancer, major stroke, or heart attack. Covers treatment costs and replaces lost income during recovery.',
    whenPays: 'Upon diagnosis of a covered advanced-stage critical illness',
    rec: (i) => i * 5,
    recLabel: (i) => `${formatSGD(i * 5)} (5× annual income)`,
  },
  {
    type: 'eci',
    label: 'Early Critical Illness',
    icon: '🧬',
    color: '#6d28d9',
    description: 'Pays out at early or intermediate stages of critical illness — before treatment becomes expensive and while there is still time to take action. Some plans allow multiple claims.',
    whenPays: 'Upon diagnosis of a covered early or intermediate-stage critical illness',
    rec: (i) => i * 3.5,
    recLabel: (i) => `${formatSGD(i * 3.5)} (3.5× annual income)`,
  },
  {
    type: 'hospitalisation',
    label: 'Hospitalisation',
    icon: '🏨',
    color: '#0369a1',
    description: 'Covers inpatient hospital bills, surgery costs, and specialist consultations. In Singapore, an Integrated Shield Plan (IP) upgrades your MediShield Life to cover private hospital or higher ward classes.',
    whenPays: 'During hospitalisation or day surgery',
    rec: () => null,
    recLabel: () => 'In Force',
  },
  {
    type: 'pa',
    label: 'Personal Accident',
    icon: '⚡',
    color: '#d97706',
    description: 'Covers accidental death, dismemberment, and temporary or permanent disability arising from an accident. Often includes medical reimbursement for outpatient accident treatment.',
    whenPays: 'Upon accidental injury, disability, or death',
    rec: () => null,
    recLabel: () => 'In Force',
  },
  {
    type: 'careshield',
    label: 'CareShield / LTC',
    icon: '🤝',
    color: '#065f46',
    description: 'Provides monthly cash payouts if you become severely disabled and need long-term care. CareShield Life (mandatory from 2020) pays ~$600/mo; supplemental plans top this up significantly.',
    whenPays: 'Upon inability to perform 3 or more Activities of Daily Living (ADLs)',
    rec: () => null,
    recLabel: () => 'In Force',
  },
]

const PAYOUT_OPTIONS: { value: string; label: string }[] = [
  { value: 'lump_sum', label: 'Lump Sum' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'multipay', label: 'Multipay' },
]

const BENEFIT_TYPE_OPTIONS: { value: BenefitBlock['benefit_type']; label: string }[] = [
  { value: 'death', label: 'Death' },
  { value: 'tpd', label: 'TPD' },
  { value: 'eci', label: 'Early CI' },
  { value: 'aci', label: 'Advanced CI' },
  { value: 'hospitalisation', label: 'Hospitalisation' },
  { value: 'pa', label: 'Personal Accident' },
  { value: 'careshield', label: 'CareShield / LTC' },
]

interface NewBenefitForm {
  benefit_type: BenefitBlock['benefit_type']
  policy_name: string
  insurer: string
  coverage: string
  payout_mode: string
  expiry_age: string
  inception_date: string
  expiry_date: string
  payment_date: string
  annual_premium: string
}

const EMPTY_FORM: NewBenefitForm = {
  benefit_type: 'death',
  policy_name: '',
  insurer: '',
  coverage: '',
  payout_mode: 'lump_sum',
  expiry_age: '',
  inception_date: '',
  expiry_date: '',
  payment_date: '',
  annual_premium: '',
}

// Benefit types that don't have a fixed payout mode (they reimburse costs)
const NO_PAYOUT_MODE_TYPES = ['hospitalisation', 'pa']

// ─── Static stat row ─────────────────────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
        {label}
      </span>
      <span
        className="text-sm font-semibold"
        style={{ color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif" }}
      >
        {value}
      </span>
    </div>
  )
}

// ─── Chevron icon ─────────────────────────────────────────────────────────────

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      style={{
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s',
        flexShrink: 0,
      }}
    >
      <path d="M4 6l4 4 4-4" stroke="#a89070" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Individual policy card ───────────────────────────────────────────────────

function PolicyCard({
  block,
  onDelete,
  onToggle,
}: {
  block: BenefitBlock
  onDelete: (id: string) => void
  onToggle: (id: string, enabled: boolean) => void
}) {
  const payoutLabel =
    block.payout_mode === 'lump_sum'
      ? 'Lump Sum'
      : block.payout_mode === 'monthly'
      ? 'Monthly'
      : block.payout_mode === 'multipay'
      ? 'Multipay'
      : '—'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      style={{
        background: block.enabled ? 'rgba(122,28,46,0.06)' : 'rgba(122,28,46,0.03)',
        border: '1px solid rgba(196,168,130,0.15)',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        opacity: block.enabled ? 1 : 0.6,
      }}
    >
      {/* Top row: name + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: 13, color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", margin: 0 }}>
            {block.policy_name || 'Unnamed Policy'}
          </p>
          {block.coverage > 0 && (
            <p style={{ fontSize: 18, fontWeight: 700, color: '#fdf8f2', fontFamily: "'Playfair Display', serif", margin: '2px 0 0' }}>
              {formatSGD(block.coverage)}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Toggle */}
          <button
            onClick={() => onToggle(block.id, !block.enabled)}
            title={block.enabled ? 'Disable' : 'Enable'}
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Cabinet Grotesk', sans-serif",
              background: block.enabled ? 'rgba(22,163,74,0.08)' : 'rgba(196,168,130,0.04)',
              color: block.enabled ? '#16a34a' : '#a89070',
            }}
          >
            {block.enabled ? 'Active' : 'Inactive'}
          </button>
          {/* Delete */}
          <button
            onClick={() => onDelete(block.id)}
            title="Remove policy"
            style={{
              width: 26, height: 26, borderRadius: '50%', border: '1px solid rgba(196,168,130,0.15)',
              background: 'rgba(10,6,5,0.8)', cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 13, color: '#a89070', flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Details chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {block.payout_mode && (
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 20,
            background: 'rgba(122,28,46,0.06)', color: '#c4a882', border: '1px solid rgba(196,168,130,0.15)',
            fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 500,
          }}>
            {payoutLabel}
          </span>
        )}
        {block.expiry_age && (
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 20,
            background: 'rgba(122,28,46,0.06)', color: '#c4a882', border: '1px solid rgba(196,168,130,0.15)',
            fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 500,
          }}>
            Expires age {block.expiry_age}
          </span>
        )}
        {block.multiplier && (
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 20,
            background: 'rgba(122,28,46,0.06)', color: '#c4a882', border: '1px solid rgba(196,168,130,0.15)',
            fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 500,
          }}>
            {block.multiplier}× multiplier
          </span>
        )}
        {block.max_claims && (
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 20,
            background: 'rgba(122,28,46,0.06)', color: '#c4a882', border: '1px solid rgba(196,168,130,0.15)',
            fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 500,
          }}>
            Up to {block.max_claims} claims
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function InsuranceBenefits({
  monthlyIncome,
  monthlyExpenses,
  liquidSavings,
  benefitBlocks: initialBlocks,
  userId,
}: Props) {
  const [blocks, setBlocks] = useState<BenefitBlock[]>(initialBlocks)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<NewBenefitForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set())

  const annualIncome = monthlyIncome * 12
  const score = computeScore(blocks, annualIncome, liquidSavings, monthlyExpenses)

  function toggleExpand(type: string) {
    setExpandedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  async function handleAddPolicy() {
    setSaving(true)
    setSaveError(null)

    const supabase = createClient()
    const noPayoutMode = NO_PAYOUT_MODE_TYPES.includes(form.benefit_type)
    const newBlock = {
      user_id: userId,
      benefit_type: form.benefit_type,
      policy_name: form.policy_name.trim() || null,
      insurer: form.insurer.trim() || null,
      coverage: parseFloat(form.coverage) || 0,
      payout_mode: noPayoutMode ? null : (form.payout_mode || null) as BenefitBlock['payout_mode'],
      multiplier: null,
      max_claims: null,
      cooldown_years: null,
      expiry_age: form.expiry_age ? parseInt(form.expiry_age) : null,
      renewal_date: null,
      inception_date: form.inception_date || null,
      expiry_date: form.expiry_date || null,
      payment_date: form.payment_date ? parseInt(form.payment_date) : null,
      annual_premium: parseFloat(form.annual_premium) || 0,
      enabled: true,
    }

    const { data, error } = await supabase
      .from('benefit_blocks')
      .insert(newBlock)
      .select()
      .single()

    if (error) {
      setSaveError(error.message)
    } else if (data) {
      setBlocks((prev) => [...prev, data as BenefitBlock])
      setForm(EMPTY_FORM)
      setShowForm(false)
      // Auto-expand the newly added type
      setExpandedTypes((prev) => new Set([...prev, form.benefit_type]))
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('benefit_blocks').delete().eq('id', id)
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }

  async function handleToggle(id: string, enabled: boolean) {
    const supabase = createClient()
    await supabase.from('benefit_blocks').update({ enabled }).eq('id', id)
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, enabled } : b)))
  }

  // Derived coverage values
  const deathCov = totalCoverage(blocks, 'death')
  const tpdCov = totalCoverage(blocks, 'tpd')
  const eciCov = totalCoverage(blocks, 'eci')
  const aciCov = totalCoverage(blocks, 'aci')
  const hasHosp = hasBenefitType(blocks, 'hospitalisation')
  const hasPA = hasBenefitType(blocks, 'pa')
  const hasCS = hasBenefitType(blocks, 'careshield')

  // Gaps list
  const gaps: string[] = []
  if (deathCov < annualIncome * 10)
    gaps.push(`Death cover: ${formatSGD(annualIncome * 10 - deathCov)} short of recommended 10× annual income`)
  if (tpdCov < annualIncome * 10)
    gaps.push(`TPD cover: ${formatSGD(annualIncome * 10 - tpdCov)} short of recommended 10× annual income`)
  if (aciCov < annualIncome * 5)
    gaps.push(`Advanced CI cover: ${formatSGD(annualIncome * 5 - aciCov)} short of recommended 5× annual income`)
  if (eciCov < annualIncome * 3.5)
    gaps.push(`Early CI cover: ${formatSGD(annualIncome * 3.5 - eciCov)} short of recommended 3.5× annual income`)
  if (!hasHosp) gaps.push('No hospitalisation coverage detected')
  if (!hasPA) gaps.push('No personal accident coverage detected')
  if (!hasCS) gaps.push('No CareShield / LTC coverage detected')

  // Coverage summary data
  const coverageSummaryRows = BENEFIT_META.map((meta) => {
    let yourCov: number | null = null
    let rec: number | null = null
    let hasIt = false

    if (meta.type === 'death') { yourCov = deathCov; rec = meta.rec(annualIncome); hasIt = deathCov > 0 }
    else if (meta.type === 'tpd') { yourCov = tpdCov; rec = meta.rec(annualIncome); hasIt = tpdCov > 0 }
    else if (meta.type === 'aci') { yourCov = aciCov; rec = meta.rec(annualIncome); hasIt = aciCov > 0 }
    else if (meta.type === 'eci') { yourCov = eciCov; rec = meta.rec(annualIncome); hasIt = eciCov > 0 }
    else if (meta.type === 'hospitalisation') { hasIt = hasHosp }
    else if (meta.type === 'pa') { hasIt = hasPA }
    else if (meta.type === 'careshield') { hasIt = hasCS }

    const gap = rec !== null && yourCov !== null ? Math.max(0, rec - yourCov) : null
    const status: 'ok' | 'gap' | 'missing' =
      rec !== null
        ? (yourCov ?? 0) >= rec ? 'ok' : 'gap'
        : hasIt ? 'ok' : 'missing'

    return { meta, yourCov, rec, gap, status, hasIt }
  })

  const totalAnnualPremiums = blocks
    .filter((b) => b.enabled)
    .reduce((sum, b) => sum + ((b as BenefitBlock & { annual_premium?: number }).annual_premium ?? 0), 0)
  const premiumBurden = annualIncome > 0 ? totalAnnualPremiums / annualIncome : 0

  const biggestGapRow = coverageSummaryRows
    .filter((r) => r.gap && r.gap > 0)
    .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))[0]

  const activePoliciesCount = blocks.filter((b) => b.enabled).length
  const coveredAreasCount = coverageSummaryRows.filter((r) => r.hasIt).length
  const scoreLabel = score >= 80 ? 'Well Protected' : score >= 60 ? 'Adequate' : score >= 40 ? 'Fair' : 'Under-protected'

  return (
    <div className="space-y-8">
      {/* Hero verdict */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border p-5"
        style={{ background: 'rgba(122,28,46,0.10)', borderColor: 'rgba(196,168,130,0.20)' }}
      >
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 8px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Your Protection Position
        </p>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#fdf8f2', margin: '0 0 6px', lineHeight: 1.4 }}>
          Protection score:{' '}
          <span style={{ color: score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626' }}>{score}/100 — {scoreLabel}</span>.
          {' '}You have {activePoliciesCount} active {activePoliciesCount === 1 ? 'policy' : 'policies'} covering {coveredAreasCount} risk {coveredAreasCount === 1 ? 'area' : 'areas'}.
        </p>
        {biggestGapRow ? (
          <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.55)', margin: 0 }}>
            Your biggest gap:{' '}
            <strong style={{ color: '#f59e0b' }}>{biggestGapRow.meta.label}</strong>
            {' '}— you&apos;re{' '}
            <strong style={{ color: '#f59e0b' }}>{formatSGD(biggestGapRow.gap!)}</strong>
            {' '}below the recommended coverage.
          </p>
        ) : blocks.length === 0 ? (
          <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.55)', margin: 0 }}>
            Add your policies below to see your full coverage picture.
          </p>
        ) : (
          <p style={{ fontSize: 13, color: '#16a34a', margin: 0 }}>
            All quantifiable coverage targets are met. Review your policy details below.
          </p>
        )}
      </motion.div>

      {/* Step 1 — Protection Score */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 12px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Step 1 · Protection Score
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border p-6 flex flex-col items-center justify-center"
            style={{ background: 'rgba(122,28,46,0.06)', borderColor: 'rgba(196,168,130,0.15)' }}
          >
            <p
              className="text-sm font-semibold mb-4"
              style={{ color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif" }}
            >
              Protection Score
            </p>
            <CircleProgress score={score} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="rounded-2xl border p-6 space-y-3"
            style={{ background: 'rgba(122,28,46,0.06)', borderColor: 'rgba(196,168,130,0.15)' }}
          >
            <p
              className="text-sm font-semibold mb-1"
              style={{ color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif" }}
            >
              Quick Stats
            </p>
            <StatRow label="Annual income" value={formatSGD(annualIncome)} />
            <StatRow label="Total death cover" value={formatSGD(deathCov)} />
            <StatRow label="Total CI cover" value={formatSGD(eciCov + aciCov)} />
            <StatRow label="Liquid savings" value={formatSGD(liquidSavings)} />
            <StatRow label="Policies on file" value={String(blocks.length)} />
          </motion.div>
        </div>
      </div>

      {/* Step 2 — Gap Analysis */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 12px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Step 2 · Gap Analysis
        </p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border overflow-hidden"
          style={{ borderColor: 'rgba(196,168,130,0.15)' }}
        >
          <div className="px-5 py-3 border-b" style={{ background: 'rgba(122,28,46,0.06)', borderColor: 'rgba(196,168,130,0.15)' }}>
            <p className="text-sm font-semibold" style={{ color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif" }}>Coverage Summary</p>
            <p className="text-xs mt-0.5" style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>Your coverage vs recommended benchmarks for your income level.</p>
          </div>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 1.4fr 1.2fr 80px', padding: '8px 20px', borderBottom: '1px solid rgba(196,168,130,0.08)', background: 'rgba(42,31,26,0.3)' }}>
            {['Benefit', 'Your Coverage', 'Recommended', 'Gap', 'Status'].map((h) => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>{h}</span>
            ))}
          </div>
          {coverageSummaryRows.map(({ meta, yourCov, rec, gap, status }) => (
            <div
              key={meta.type}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 1.4fr 1.2fr 80px', padding: '12px 20px', borderBottom: '1px solid rgba(196,168,130,0.06)', alignItems: 'center' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 500 }}>
                <span style={{ fontSize: 14 }}>{meta.icon}</span>
                {meta.label}
              </span>
              <span style={{ fontSize: 13, color: 'rgba(253,248,242,0.7)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                {rec !== null ? formatSGD(yourCov ?? 0) : (yourCov !== null ? formatSGD(yourCov) : '—')}
              </span>
              <span style={{ fontSize: 13, color: 'rgba(253,248,242,0.5)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                {rec !== null ? formatSGD(rec) : 'In Force'}
              </span>
              <span style={{ fontSize: 13, fontFamily: "'Cabinet Grotesk', sans-serif", color: gap && gap > 0 ? '#f59e0b' : 'rgba(253,248,242,0.35)' }}>
                {gap && gap > 0 ? `−${formatSGD(gap)}` : '—'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: status === 'ok' ? '#16a34a' : status === 'gap' ? '#f59e0b' : '#dc2626', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: status === 'ok' ? '#16a34a' : status === 'gap' ? '#f59e0b' : '#dc2626', fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 600 }}>
                  {status === 'ok' ? 'Met' : status === 'gap' ? 'Gap' : 'Missing'}
                </span>
              </span>
            </div>
          ))}
          {/* Totals row */}
          {totalAnnualPremiums > 0 && (
            <div style={{ padding: '12px 20px', background: 'rgba(42,31,26,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'rgba(253,248,242,0.5)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>Total annual premiums on file</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif" }}>{formatSGD(totalAnnualPremiums)}/yr</span>
            </div>
          )}
          {/* Premium burden warning */}
          {premiumBurden > 0.15 && (
            <div style={{ padding: '10px 20px', background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.15)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
              <p style={{ fontSize: 12, color: '#f59e0b', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif", lineHeight: 1.5 }}>
                Your premiums represent <strong>{Math.round(premiumBurden * 100)}%</strong> of annual income — above the recommended 15% ceiling. Consider reviewing your portfolio for overlapping coverage.
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Step 3 — Your Policies */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 12px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Step 3 · Your Policies
        </p>

      {/* Coverage breakdown with expandable cards */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(196,168,130,0.15)' }}>
        <div
          className="px-5 py-3 border-b"
          style={{ background: 'rgba(122,28,46,0.06)', borderColor: 'rgba(196,168,130,0.15)' }}
        >
          <p
            className="text-sm font-semibold"
            style={{ color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
            Coverage Breakdown
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Click any row to see policy details and what each benefit covers.
          </p>
        </div>

        <div style={{ background: 'rgba(122,28,46,0.04)' }}>
          {BENEFIT_META.map((meta, i) => {
            const cov = totalCoverage(blocks, meta.type)
            const inForce = hasBenefitType(blocks, meta.type)
            const rec = meta.rec(annualIncome)
            const isCovered = rec !== null ? cov >= rec : inForce
            const gap = rec !== null ? Math.max(0, rec - cov) : 0
            const isExpanded = expandedTypes.has(meta.type)
            const policiesOfType = blocks.filter((b) => b.benefit_type === meta.type)

            // Progress bar (for types with numeric rec)
            const pct = rec !== null && rec > 0 ? Math.min(100, (cov / rec) * 100) : 0

            return (
              <div key={meta.type}>
                {/* Row header — clickable */}
                <motion.button
                  onClick={() => toggleExpand(meta.type)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.06 }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    background: 'none',
                    border: 'none',
                    borderBottom: isExpanded ? 'none' : '1px solid rgba(196,168,130,0.08)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 }} aria-hidden>
                      {meta.icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{ fontWeight: 600, fontSize: 13, color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", margin: 0 }}
                      >
                        {meta.label}
                      </p>
                      <p
                        style={{ fontSize: 11, color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif", margin: '1px 0 0' }}
                      >
                        Recommended: {meta.recLabel(annualIncome)}
                      </p>
                      {/* Mini progress bar for numeric coverage */}
                      {rec !== null && (
                        <div style={{ marginTop: 5, height: 3, background: 'rgba(196,168,130,0.1)', borderRadius: 2, width: 120 }}>
                          <div style={{
                            height: '100%', borderRadius: 2,
                            width: `${pct}%`,
                            background: isCovered ? '#16a34a' : pct > 50 ? '#d97706' : '#dc2626',
                            transition: 'width 0.6s ease',
                          }} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      {rec !== null ? (
                        <>
                          <p style={{ fontWeight: 700, fontSize: 14, color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", margin: 0 }}>
                            {formatSGD(cov)}
                          </p>
                          <span
                            style={{
                              display: 'inline-block', fontSize: 11, padding: '1px 7px',
                              borderRadius: 20, fontWeight: 600, marginTop: 2,
                              fontFamily: "'Cabinet Grotesk', sans-serif",
                              background: isCovered ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.06)',
                              color: isCovered ? '#16a34a' : '#dc2626',
                            }}
                          >
                            {isCovered ? '✓ Covered' : `Gap: ${formatSGD(gap)}`}
                          </span>
                        </>
                      ) : (
                        <span
                          style={{
                            display: 'inline-block', fontSize: 11, padding: '1px 7px',
                            borderRadius: 20, fontWeight: 600,
                            fontFamily: "'Cabinet Grotesk', sans-serif",
                            background: inForce ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.06)',
                            color: inForce ? '#16a34a' : '#dc2626',
                          }}
                        >
                          {inForce ? '✓ In Force' : 'Missing'}
                        </span>
                      )}
                    </div>
                    <Chevron open={isExpanded} />
                  </div>
                </motion.button>

                {/* Expanded detail panel */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      key="expanded"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ overflow: 'hidden', borderBottom: '1px solid rgba(196,168,130,0.08)' }}
                    >
                      <div style={{ padding: '0 20px 20px', background: 'rgba(10,6,5,0.6)', borderTop: '1px solid rgba(196,168,130,0.08)' }}>
                        {/* What this covers */}
                        <div style={{
                          marginTop: 12, padding: '12px 14px', background: 'rgba(122,28,46,0.08)',
                          borderRadius: 10, border: '1px solid rgba(196,168,130,0.12)',
                        }}>
                          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: meta.color, fontFamily: "'Cabinet Grotesk', sans-serif", margin: '0 0 5px' }}>
                            What this covers
                          </p>
                          <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.75)', fontFamily: "'Cabinet Grotesk', sans-serif", lineHeight: 1.6, margin: '0 0 8px' }}>
                            {meta.description}
                          </p>
                          <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.45)', fontFamily: "'Cabinet Grotesk', sans-serif", margin: 0 }}>
                            <strong style={{ color: '#c4a882' }}>When it pays:</strong> {meta.whenPays}
                          </p>
                        </div>

                        {/* Policy cards */}
                        {policiesOfType.length > 0 && (
                          <div style={{ marginTop: 12 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif", margin: '0 0 8px' }}>
                              Your Policies ({policiesOfType.length})
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <AnimatePresence>
                                {policiesOfType.map((block) => (
                                  <PolicyCard
                                    key={block.id}
                                    block={block}
                                    onDelete={handleDelete}
                                    onToggle={handleToggle}
                                  />
                                ))}
                              </AnimatePresence>
                            </div>
                          </div>
                        )}

                        {policiesOfType.length === 0 && (
                          <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.4)', fontFamily: "'Cabinet Grotesk', sans-serif", marginTop: 12, fontStyle: 'italic' }}>
                            No policies added yet for this coverage type.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add policy button */}
      <div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{
            background: '#7a1c2e',
            color: '#fff',
            fontFamily: "'Cabinet Grotesk', sans-serif",
          }}
        >
          {showForm ? '✕ Cancel' : '+ Add Policy'}
        </button>
      </div>

      {/* Inline add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div
              className="rounded-2xl border p-6 space-y-4"
              style={{ background: 'rgba(122,28,46,0.06)', borderColor: 'rgba(196,168,130,0.3)' }}
            >
              <p
                className="font-semibold text-base"
                style={{ color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif" }}
              >
                New Policy
              </p>

              {/* Determine coverage label based on type */}
              {(() => {
                const noPayoutMode = NO_PAYOUT_MODE_TYPES.includes(form.benefit_type)
                const coverageLabel = form.benefit_type === 'hospitalisation'
                  ? 'Annual Limit (S$)'
                  : form.benefit_type === 'pa'
                  ? 'Annual Benefit Limit (S$)'
                  : 'Coverage Sum Assured (S$)'
                const inputStyle = {
                  borderColor: 'rgba(196,168,130,0.15)',
                  background: 'rgba(122,28,46,0.06)',
                  fontFamily: "'Cabinet Grotesk', sans-serif",
                  color: '#fdf8f2',
                }
                return (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Benefit type */}
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>Benefit Type</label>
                      <select value={form.benefit_type} onChange={(e) => setForm((f) => ({ ...f, benefit_type: e.target.value as BenefitBlock['benefit_type'], payout_mode: NO_PAYOUT_MODE_TYPES.includes(e.target.value) ? 'lump_sum' : f.payout_mode }))}
                        className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#7a1c2e]" style={inputStyle}>
                        {BENEFIT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>

                    {/* Policy name */}
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>Policy Name</label>
                      <input type="text" value={form.policy_name} onChange={(e) => setForm((f) => ({ ...f, policy_name: e.target.value }))}
                        placeholder="e.g. Great Eastern Supreme" className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#7a1c2e]" style={inputStyle} />
                    </div>

                    {/* Insurer */}
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>Insurer (optional)</label>
                      <input type="text" value={form.insurer} onChange={(e) => setForm((f) => ({ ...f, insurer: e.target.value }))}
                        placeholder="e.g. Great Eastern, AIA, Prudential" className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#7a1c2e]" style={inputStyle} />
                    </div>

                    {/* Coverage */}
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>{coverageLabel}</label>
                      <input type="number" value={form.coverage} onChange={(e) => setForm((f) => ({ ...f, coverage: e.target.value }))}
                        placeholder="e.g. 500000" min={0} className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#7a1c2e]" style={inputStyle} />
                      {noPayoutMode && (
                        <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.4)', marginTop: 4, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                          {form.benefit_type === 'hospitalisation' ? 'Covers actual medical costs — no fixed payout.' : 'Reimburses costs from accidents. Status: met if any PA policy is active.'}
                        </p>
                      )}
                    </div>

                    {/* Payout mode — hidden for hospitalisation and PA */}
                    {!noPayoutMode && (
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>Payout Mode</label>
                        <select value={form.payout_mode} onChange={(e) => setForm((f) => ({ ...f, payout_mode: e.target.value }))}
                          className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#7a1c2e]" style={inputStyle}>
                          {PAYOUT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Annual Premium */}
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>Annual Premium (S$, optional)</label>
                      <input type="number" value={form.annual_premium} onChange={(e) => setForm((f) => ({ ...f, annual_premium: e.target.value }))}
                        placeholder="e.g. 3200" min={0} className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#7a1c2e]" style={inputStyle} />
                    </div>

                    {/* Inception date */}
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>Inception Date (optional)</label>
                      <input type="date" value={form.inception_date} onChange={(e) => setForm((f) => ({ ...f, inception_date: e.target.value }))}
                        className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#7a1c2e]" style={inputStyle} />
                    </div>

                    {/* Expiry date */}
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>Expiry / Next Renewal Date (optional)</label>
                      <input type="date" value={form.expiry_date} onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))}
                        className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#7a1c2e]" style={inputStyle} />
                    </div>

                    {/* Payment date (day of month) */}
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>Monthly Payment Day (1–28, optional)</label>
                      <input type="number" value={form.payment_date} onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))}
                        placeholder="e.g. 15" min={1} max={28} className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#7a1c2e]" style={inputStyle} />
                    </div>

                    {/* Expiry age */}
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>Coverage Until Age (optional)</label>
                      <input type="number" value={form.expiry_age} onChange={(e) => setForm((f) => ({ ...f, expiry_age: e.target.value }))}
                        placeholder="e.g. 99" min={0} max={130} className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#7a1c2e]" style={inputStyle} />
                    </div>
                  </div>
                )
              })()}

              {saveError && (
                <p
                  className="text-sm text-red-600"
                  style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
                >
                  {saveError}
                </p>
              )}

              <button
                onClick={handleAddPolicy}
                disabled={saving}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{
                  background: '#7a1c2e',
                  color: '#fff',
                  fontFamily: "'Cabinet Grotesk', sans-serif",
                }}
              >
                {saving ? 'Saving…' : 'Save Policy'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gaps summary */}
      {gaps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border p-6"
          style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.25)' }}
        >
          <p
            className="font-semibold mb-3"
            style={{ color: '#dc2626', fontFamily: "'Playfair Display', serif" }}
          >
            Gaps Summary
          </p>
          <ul className="space-y-2">
            {gaps.map((gap, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm"
                style={{ color: '#7f1d1d', fontFamily: "'Cabinet Grotesk', sans-serif" }}
              >
                <span className="mt-0.5 flex-shrink-0" style={{ color: '#dc2626' }}>•</span>
                {gap}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {gaps.length === 0 && blocks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border p-5 flex items-center gap-3"
          style={{ background: 'rgba(22,163,74,0.06)', borderColor: 'rgba(22,163,74,0.25)' }}
        >
          <span className="text-xl" aria-hidden>✅</span>
          <p
            className="text-sm font-medium"
            style={{ color: '#15803d', fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
            All coverage areas meet recommended minimums. Great work.
          </p>
        </motion.div>
      )}

      </div> {/* end Step 3 */}

      <AIInsightPanel
        tool="insurance"
        data={{
          score,
          annualIncome,
          totalCoverage: blocks.filter((b) => b.enabled).reduce((s, b) => s + b.coverage, 0),
          coverageMultiple: annualIncome > 0
            ? blocks.filter((b) => b.enabled).reduce((s, b) => s + b.coverage, 0) / annualIncome
            : 0,
          hasCI: hasBenefitType(blocks, 'eci') || hasBenefitType(blocks, 'aci'),
          hasHospitalisation: hasBenefitType(blocks, 'hospitalisation'),
          monthlyExpenses,
          liquidSavings,
        }}
        autoRefresh
      />
    </div>
  )
}
