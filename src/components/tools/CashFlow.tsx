'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import AIInsightPanel from '@/components/ui/AIInsightPanel'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  monthlyIncome: number
  monthlyExpenses: number
  userId: string
}

interface Category {
  key: string
  label: string
  amount: number   // actual SGD monthly spend
  colour: string
}

interface ParsedTx {
  description: string
  amount: number
  suggestedKey: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_META: { key: string; label: string; colour: string; keywords: string[] }[] = [
  { key: 'housing',       label: 'Housing',       colour: '#7a1c2e', keywords: ['rent', 'mortgage', 'condo', 'hdb', 'property', 'loan'] },
  { key: 'food',          label: 'Food',           colour: '#c4a882', keywords: ['grab food', 'food panda', 'deliveroo', 'mcdonalds', 'kopitiam', 'hawker', 'restaurant', 'cafe', 'coffee', 'prima', 'fairprice', 'ntuc', 'giant', 'cold storage', 'sheng siong'] },
  { key: 'transport',     label: 'Transport',      colour: '#a89070', keywords: ['grab', 'gojek', 'ez-link', 'comfortdelgro', 'taxi', 'mrt', 'bus', 'petrol', 'parking', 'esso', 'shell', 'caltex'] },
  { key: 'utilities',     label: 'Utilities',      colour: '#d97706', keywords: ['sp group', 'singtel', 'starhub', 'm1', 'circles', 'electric', 'gas', 'water', 'internet', 'phone'] },
  { key: 'healthcare',    label: 'Healthcare',     colour: '#16a34a', keywords: ['raffles medical', 'parkway', 'mount elizabeth', 'pharmacy', 'guardian', 'unity', 'ntuc health', 'polyclinic', 'doctor', 'dental', 'clinic', 'medisave'] },
  { key: 'insurance',     label: 'Insurance',      colour: '#0369a1', keywords: ['great eastern', 'prudential', 'aia', 'aviva', 'ntuc income', 'manulife', 'tokio marine', 'insurance'] },
  { key: 'entertainment', label: 'Entertainment',  colour: '#7c3aed', keywords: ['netflix', 'spotify', 'cinema', 'shaw', 'golden village', 'gv', 'ktv', 'gym', 'sport', 'steam', 'apple', 'google play'] },
  { key: 'shopping',      label: 'Shopping',       colour: '#db2777', keywords: ['shopee', 'lazada', 'amazon', 'zalora', 'uniqlo', 'h&m', 'zara', 'ikea', 'courts', 'harvey norman'] },
  { key: 'other',         label: 'Other',          colour: '#64748b', keywords: [] },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSGD(v: number): string {
  return `$${Math.round(v).toLocaleString('en-SG')}`
}
function formatSGDShort(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`
  return `$${Math.round(v)}`
}

function categorise(description: string): string {
  const lower = description.toLowerCase()
  for (const meta of CATEGORY_META) {
    if (meta.keywords.some((kw) => lower.includes(kw))) return meta.key
  }
  return 'other'
}

function parseCSV(text: string): ParsedTx[] {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []

  // Try to detect header: find column indices for description & amount
  const header = lines[0].split(',').map((h) => h.replace(/"/g, '').toLowerCase().trim())
  const descIdx = header.findIndex((h) => h.includes('description') || h.includes('narrative') || h.includes('details') || h.includes('particulars') || h.includes('transaction'))
  const amtIdx = header.findIndex((h) => h.includes('debit') || h.includes('withdrawal') || h.includes('amount') || h.includes('amount (sgd)'))

  if (descIdx === -1 || amtIdx === -1) return []

  const txs: ParsedTx[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) ?? []
    const clean = cols.map((c) => c.replace(/^"|"$/g, '').trim())
    const desc = clean[descIdx] ?? ''
    const rawAmt = clean[amtIdx] ?? ''
    const amount = parseFloat(rawAmt.replace(/[^0-9.-]/g, ''))
    if (desc && !isNaN(amount) && amount > 0) {
      txs.push({ description: desc, amount, suggestedKey: categorise(desc) })
    }
  }
  return txs
}

function defaultCategories(monthlyExpenses: number): Category[] {
  const splits: Record<string, number> = {
    housing: 0.35, food: 0.20, transport: 0.10, utilities: 0.08,
    healthcare: 0.05, insurance: 0.07, entertainment: 0.07, shopping: 0.05, other: 0.03,
  }
  return CATEGORY_META.map((m) => ({
    key: m.key,
    label: m.label,
    colour: m.colour,
    amount: Math.round((splits[m.key] ?? 0.03) * monthlyExpenses),
  }))
}

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0)
  const frameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)
  const startRef = useRef<number | null>(null)
  const fromRef = useRef(0)

  useEffect(() => {
    fromRef.current = value
    startRef.current = null
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const p = Math.min((ts - startRef.current) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(fromRef.current + (target - fromRef.current) * eased))
      if (p < 1) frameRef.current = requestAnimationFrame(step)
    }
    frameRef.current = requestAnimationFrame(step)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])
  return value
}

// ─── Editable amount input ────────────────────────────────────────────────────

function AmountCell({ value, onChange, colour }: { value: number; onChange: (v: number) => void; colour: string }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setDraft(String(value))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }
  function commit() {
    const n = parseFloat(draft.replace(/[^0-9.]/g, ''))
    if (!isNaN(n) && n >= 0) onChange(Math.round(n))
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        style={{
          width: 80, textAlign: 'right', fontSize: 13, fontWeight: 600,
          border: `1px solid ${colour}`, borderRadius: 6, padding: '2px 6px',
          outline: 'none', fontFamily: "'Cabinet Grotesk', sans-serif",
          color: '#2a1f1a',
        }}
        autoFocus
      />
    )
  }

  return (
    <button
      onClick={startEdit}
      title="Click to edit"
      style={{
        background: 'none', border: 'none', cursor: 'text',
        fontSize: 13, fontWeight: 700, color: '#2a1f1a',
        fontFamily: "'Cabinet Grotesk', sans-serif", padding: '1px 4px',
        borderBottom: `1px dashed ${colour}20`,
      }}
    >
      {formatSGD(value)}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CashFlow({ monthlyIncome, monthlyExpenses, userId }: Props) {
  const [categories, setCategories] = useState<Category[]>(() => defaultCategories(monthlyExpenses))
  const [categoriesLoaded, setCategoriesLoaded] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [parsedTxs, setParsedTxs] = useState<ParsedTx[]>([])
  const [txCategory, setTxCategory] = useState<Record<number, string>>({})
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load saved categories on mount
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('expense_categories')
      .select('key, label, pct, colour, sort_order')
      .eq('user_id', userId)
      .order('sort_order')
      .then(({ data }) => {
        if (data && data.length > 0) {
          // Old schema: stored as pct of expenses → convert to dollar amounts
          const hasAmountCol = data.some((r) => r.pct > 100) // heuristic: pct > 100 means it's stored as dollars
          setCategories(
            data.map((r, idx) => {
              const meta = CATEGORY_META.find((m) => m.key === r.key) ?? CATEGORY_META[CATEGORY_META.length - 1]
              const amount = hasAmountCol
                ? Number(r.pct)
                : Math.round((Number(r.pct) / 100) * monthlyExpenses)
              return {
                key: r.key,
                label: r.label ?? meta.label,
                colour: r.colour ?? meta.colour,
                amount: amount > 0 ? amount : 0,
              }
            })
          )
        } else {
          // No saved data — initialise from the profile's monthlyExpenses
          if (monthlyExpenses > 0) {
            setCategories(defaultCategories(monthlyExpenses))
          }
        }
        setCategoriesLoaded(true)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const saveCategories = useCallback(
    (cats: Category[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        const supabase = createClient()
        await supabase.from('expense_categories').upsert(
          cats.map((c, i) => ({
            user_id: userId,
            key: c.key,
            label: c.label,
            pct: c.amount,    // store dollar amount in the pct column (repurposed)
            colour: c.colour,
            sort_order: i,
          })),
          { onConflict: 'user_id,key' }
        )
      }, 800)
    },
    [userId]
  )

  function updateAmount(key: string, amount: number) {
    setCategories((prev) => {
      const next = prev.map((c) => (c.key === key ? { ...c, amount } : c))
      if (categoriesLoaded) saveCategories(next)
      return next
    })
  }

  // ── CSV upload ──
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const txs = parseCSV(text)
      setParsedTxs(txs)
      setTxCategory(Object.fromEntries(txs.map((t, i) => [i, t.suggestedKey])))
      setShowUpload(true)
    }
    reader.readAsText(file)
  }

  function importTransactions() {
    setImporting(true)
    // Sum up transaction amounts per category
    const sums: Record<string, number> = {}
    parsedTxs.forEach((tx, i) => {
      const cat = txCategory[i] ?? 'other'
      sums[cat] = (sums[cat] ?? 0) + tx.amount
    })
    // Replace category amounts
    setCategories((prev) => {
      const next = prev.map((c) => ({
        ...c,
        amount: Math.round(sums[c.key] ?? c.amount),
      }))
      if (categoriesLoaded) saveCategories(next)
      return next
    })
    setShowUpload(false)
    setParsedTxs([])
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Derived values ──
  const totalExpenses = categories.reduce((s, c) => s + c.amount, 0)
  const surplus = monthlyIncome - totalExpenses
  const savingsRate = monthlyIncome > 0 ? (surplus / monthlyIncome) * 100 : 0

  const animatedSavingsRate = useCountUp(Math.max(0, Math.round(savingsRate)))

  const expensesShareOfIncome = monthlyIncome > 0 ? (totalExpenses / monthlyIncome) * 100 : 100
  const needsAmt = categories.filter((c) => ['housing','food','transport','utilities','healthcare'].includes(c.key)).reduce((s,c) => s + c.amount, 0)
  const wantsAmt = categories.filter((c) => ['entertainment','shopping','other'].includes(c.key)).reduce((s,c) => s + c.amount, 0)
  const needsOfIncome = monthlyIncome > 0 ? (needsAmt / monthlyIncome) * 100 : 0
  const wantsOfIncome = monthlyIncome > 0 ? (wantsAmt / monthlyIncome) * 100 : 0

  const monthlyProjection = Array.from({ length: 12 }, (_, i) => ({
    month: `M${i + 1}`,
    savings: Math.round(Math.max(0, surplus) * (i + 1)),
  }))

  // ── Health scoring (multi-factor, fixes always-Excellent) ──
  let healthScore = 0
  if (monthlyIncome > 0) {
    if (savingsRate >= 30) healthScore += 40
    else if (savingsRate >= 20) healthScore += 30
    else if (savingsRate >= 10) healthScore += 15
    else if (savingsRate > 0) healthScore += 5

    if (needsOfIncome <= 50) healthScore += 30
    else if (needsOfIncome <= 60) healthScore += 15
    else if (needsOfIncome <= 70) healthScore += 5

    if (wantsOfIncome <= 30) healthScore += 20
    else if (wantsOfIncome <= 40) healthScore += 10

    const insurancePct = monthlyIncome > 0 ? (categories.find(c => c.key === 'insurance')?.amount ?? 0) / monthlyIncome * 100 : 0
    if (insurancePct >= 5) healthScore += 10
    else if (insurancePct >= 3) healthScore += 5
  }
  healthScore = Math.min(100, healthScore)

  const health =
    healthScore >= 80
      ? { label: 'Excellent', colour: '#16a34a', bg: '#f0fdf4', border: '#86efac',
          desc: 'Strong savings rate and healthy spending ratios.' }
      : healthScore >= 60
      ? { label: 'Good', colour: '#16a34a', bg: '#f0fdf4', border: '#86efac',
          desc: 'Good overall cash flow with room for improvement.' }
      : healthScore >= 40
      ? { label: 'Fair', colour: '#d97706', bg: '#fffbeb', border: '#fcd34d',
          desc: 'Spending is high relative to income — review discretionary items.' }
      : { label: 'Needs Attention', colour: '#dc2626', bg: '#fef2f2', border: '#fca5a5',
          desc: 'Cash flow is strained. Consider expense reduction or income growth.' }

  const pieData = categories.filter((c) => c.amount > 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif", color: '#2a1f1a' }}>
          Cash Flow Analysis
        </h2>
        <p className="text-sm" style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Understand where your money goes and optimise your savings rate.
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Monthly Income', value: formatSGD(monthlyIncome), colour: '#2a1f1a' },
          { label: 'Monthly Expenses', value: formatSGD(totalExpenses), colour: '#dc2626' },
          { label: 'Monthly Surplus', value: formatSGD(surplus), colour: surplus >= 0 ? '#16a34a' : '#dc2626' },
          { label: 'Savings Rate', value: `${animatedSavingsRate}%`, colour: '#7a1c2e' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.07 }}
            className="rounded-2xl border p-4"
            style={{ background: '#fdf8f2', borderColor: '#e8ddd0' }}
          >
            <p className="text-xs mb-1" style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              {stat.label}
            </p>
            <p className="text-xl font-bold" style={{ color: stat.colour, fontFamily: "'Playfair Display', serif" }}>
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Health indicator */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="rounded-2xl border p-4 flex items-center gap-3"
        style={{ background: health.bg, borderColor: health.border }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: '50%', background: health.colour + '20',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: health.colour, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            {healthScore}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: health.colour, fontFamily: "'Cabinet Grotesk', sans-serif", margin: 0 }}>
            Cash Flow Health: {health.label}
          </p>
          <p className="text-xs" style={{ color: '#7a5c3a', fontFamily: "'Cabinet Grotesk', sans-serif", margin: '2px 0 0' }}>
            {health.desc}
          </p>
        </div>
      </motion.div>

      {/* Category amounts + pie chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category editor */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl border p-6 space-y-3"
          style={{ background: '#fdf8f2', borderColor: '#e8ddd0' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <p className="font-semibold text-sm" style={{ color: '#2a1f1a', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Monthly Expenses
              </p>
              <p className="text-xs" style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Click any amount to edit
              </p>
            </div>
            <label
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                fontSize: 12, fontWeight: 600, color: '#7a1c2e',
                border: '1px solid #c4a882', borderRadius: 8, padding: '5px 10px',
                background: '#fff', fontFamily: "'Cabinet Grotesk', sans-serif",
              }}
              title="Upload a CSV bank statement to auto-populate"
            >
              ↑ Import CSV
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
            </label>
          </div>

          {categories.map((c) => {
            const pct = totalExpenses > 0 ? (c.amount / totalExpenses) * 100 : 0
            return (
              <div key={c.key}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.colour, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#2a1f1a', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                      {c.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                      {pct.toFixed(1)}%
                    </span>
                    <AmountCell value={c.amount} onChange={(v) => updateAmount(c.key, v)} colour={c.colour} />
                  </div>
                </div>
                <div style={{ height: 4, background: '#e8ddd0', borderRadius: 2, overflow: 'hidden' }}>
                  <motion.div
                    style={{ height: '100%', background: c.colour, borderRadius: 2 }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, pct)}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )
          })}

          <div style={{ borderTop: '1px solid #e8ddd0', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#2a1f1a', fontFamily: "'Cabinet Grotesk', sans-serif" }}>Total</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2a1f1a', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              {formatSGD(totalExpenses)}
            </span>
          </div>
        </motion.div>

        {/* Pie chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.28 }}
          className="rounded-2xl border p-6"
          style={{ background: '#fff', borderColor: '#e8ddd0' }}
        >
          <p className="font-semibold text-sm mb-1" style={{ color: '#2a1f1a', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Spending Distribution
          </p>
          <p className="text-xs mb-4" style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Each slice shows your monthly spend in that category. Hover for exact amounts.
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} dataKey="amount" nameKey="label" cx="50%" cy="50%" outerRadius={95} innerRadius={48} paddingAngle={2}>
                {pieData.map((c) => <Cell key={c.key} fill={c.colour} />)}
              </Pie>
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [formatSGD(Number(value)), String(name ?? '')]}
                contentStyle={{ background: '#fdf8f2', border: '1px solid #c4a882', borderRadius: 12, fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* 50/30/20 Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.32 }}
        className="rounded-2xl border p-6"
        style={{ background: '#fdf8f2', borderColor: '#e8ddd0' }}
      >
        <p className="font-semibold text-sm mb-1" style={{ color: '#2a1f1a', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          50 / 30 / 20 Rule
        </p>
        <p className="text-xs mb-4" style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          A simple framework: no more than 50% on needs, 30% on wants, and at least 20% saved. Adjust your expense amounts above to see how you compare.
        </p>
        <div className="space-y-4">
          {[
            { label: 'Needs', target: 50, actual: needsOfIncome, desc: 'Housing, food, transport, utilities, healthcare', isGood: (v: number) => v <= 50 },
            { label: 'Wants', target: 30, actual: wantsOfIncome, desc: 'Entertainment, shopping, other discretionary', isGood: (v: number) => v <= 30 },
            { label: 'Savings', target: 20, actual: Math.max(0, savingsRate), desc: 'Net monthly surplus as share of income', isGood: (v: number) => v >= 20 },
          ].map((row) => {
            const good = row.isGood(row.actual)
            const diff = row.label === 'Savings' ? 20 - row.actual : row.actual - row.target
            const colour = good ? '#16a34a' : Math.abs(diff) <= 10 ? '#d97706' : '#dc2626'
            const statusLabel = good
              ? 'On track'
              : row.label === 'Savings'
              ? `Short by ${diff.toFixed(1)}%`
              : `Over by ${diff.toFixed(1)}%`

            return (
              <div key={row.label}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#2a1f1a', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                    {row.label} <span style={{ fontWeight: 400, color: '#a89070', fontSize: 11 }}>({row.label === 'Savings' ? '≥' : '≤'}{row.target}%)</span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: colour, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                      {row.actual.toFixed(1)}%
                    </span>
                    <span style={{
                      fontSize: 11, padding: '1px 7px', borderRadius: 20, fontWeight: 600,
                      fontFamily: "'Cabinet Grotesk', sans-serif",
                      background: good ? '#f0fdf4' : Math.abs(diff) <= 10 ? '#fffbeb' : '#fef2f2',
                      color: colour,
                    }}>
                      {statusLabel}
                    </span>
                  </div>
                </div>
                <div style={{ height: 6, background: '#e8ddd0', borderRadius: 3, overflow: 'hidden' }}>
                  <motion.div
                    style={{ height: '100%', background: colour, borderRadius: 3 }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, row.actual)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <p style={{ fontSize: 11, color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif", marginTop: 3 }}>
                  {row.desc}
                </p>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* 12-month savings projection */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.38 }}
        className="rounded-2xl border p-6"
        style={{ background: '#fff', borderColor: '#e8ddd0' }}
      >
        <p className="font-semibold text-sm mb-1" style={{ color: '#2a1f1a', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          12-Month Savings Accumulation
        </p>
        <p className="text-xs mb-4" style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          At your current monthly surplus of {formatSGD(Math.max(0, surplus))}, here's how your cash savings would grow over the next year.
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={monthlyProjection} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <defs>
              <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7a1c2e" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#7a1c2e" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0e8e0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a89070' }} />
            <YAxis tickFormatter={(v) => formatSGDShort(v as number)} tick={{ fontSize: 11, fill: '#a89070' }} width={64} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [formatSGD(Number(v)), 'Accumulated savings']}
              contentStyle={{ background: '#fdf8f2', border: '1px solid #c4a882', borderRadius: 12, fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: 12 }}
            />
            <Area type="monotone" dataKey="savings" stroke="#7a1c2e" strokeWidth={2.5} fill="url(#savingsGrad)" dot={false} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* CSV upload / categorise panel */}
      <AnimatePresence>
        {showUpload && parsedTxs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border p-6"
            style={{ background: '#fdf8f2', borderColor: '#c4a882' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p className="font-semibold text-base" style={{ color: '#2a1f1a', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  Review Imported Transactions
                </p>
                <p className="text-xs" style={{ color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  {parsedTxs.length} transactions detected. Adjust categories, then click Import.
                </p>
              </div>
              <button onClick={() => { setShowUpload(false); setParsedTxs([]) }} style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: '#a89070' }}>×</button>
            </div>

            <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #e8ddd0', borderRadius: 10, background: '#fff' }}>
              {parsedTxs.map((tx, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: i < parsedTxs.length - 1 ? '1px solid #f5ede4' : 'none', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#5a4535', fontFamily: "'Cabinet Grotesk', sans-serif", flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.description}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#2a1f1a', fontFamily: "'Cabinet Grotesk', sans-serif", flexShrink: 0 }}>
                    {formatSGD(tx.amount)}
                  </span>
                  <select
                    value={txCategory[i] ?? 'other'}
                    onChange={(e) => setTxCategory((prev) => ({ ...prev, [i]: e.target.value }))}
                    style={{ fontSize: 11, border: '1px solid #e8ddd0', borderRadius: 6, padding: '2px 4px', background: '#fdf8f2', color: '#2a1f1a', fontFamily: "'Cabinet Grotesk', sans-serif", flexShrink: 0 }}
                  >
                    {CATEGORY_META.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button
                onClick={importTransactions}
                disabled={importing}
                style={{ background: '#7a1c2e', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif", opacity: importing ? 0.6 : 1 }}
              >
                {importing ? 'Importing…' : `Import ${parsedTxs.length} Transactions`}
              </button>
              <button onClick={() => { setShowUpload(false); setParsedTxs([]) }} style={{ background: 'none', color: '#a89070', border: '1px solid #e8ddd0', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Insight */}
      <AIInsightPanel
        tool="cashflow"
        data={{
          monthlyIncome,
          monthlyExpenses: totalExpenses,
          surplus: Math.round(surplus),
          savingsRate: Math.round(savingsRate),
          healthScore,
          needsPct: Math.round(needsOfIncome),
          wantsPct: Math.round(wantsOfIncome),
          largestCategory: [...categories].sort((a, b) => b.amount - a.amount)[0]?.label ?? 'Housing',
        }}
        label="Analyse My Cash Flow"
      />
    </div>
  )
}
