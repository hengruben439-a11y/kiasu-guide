'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCountUp } from '@/lib/hooks/use-count-up'
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

interface ExpenseItem {
  id: string
  category_key: string
  label: string
  amount: number
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
  return `S$${Math.round(v).toLocaleString('en-SG')}`
}
function formatSGDShort(v: number): string {
  if (v >= 1_000_000) return `S$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `S$${(v / 1_000).toFixed(1)}K`
  return `S$${Math.round(v)}`
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

// useCountUp imported from @/lib/hooks/use-count-up

// ─── Editable amount input ────────────────────────────────────────────────────

function AmountCell({ value, onChange, colour, large }: { value: number; onChange: (v: number) => void; colour: string; large?: boolean }) {
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
          width: large ? 120 : 80, textAlign: large ? 'left' : 'right',
          fontSize: large ? 20 : 13, fontWeight: 700,
          border: `1px solid ${colour}`, borderRadius: 6, padding: '2px 8px',
          outline: 'none',
          fontFamily: large ? "'Playfair Display', serif" : "'Cabinet Grotesk', sans-serif",
          color: '#fdf8f2', background: 'rgba(122,28,46,0.10)',
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
        fontSize: large ? 22 : 13, fontWeight: 700, color: '#fdf8f2',
        fontFamily: large ? "'Playfair Display', serif" : "'Cabinet Grotesk', sans-serif",
        padding: large ? '0' : '1px 4px',
        borderBottom: `1px dashed ${colour}40`,
        lineHeight: 1.2,
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
  // Manual entry state
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualTxs, setManualTxs] = useState<Array<{ id: string; description: string; amount: number; category: string }>>([])
  const [newDesc, setNewDesc] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newCat, setNewCat] = useState('other')
  const fileRef = useRef<HTMLInputElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Expandable line items state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [categoryItems, setCategoryItems] = useState<Record<string, ExpenseItem[]>>({})
  const [addingItem, setAddingItem] = useState<string | null>(null)
  const [newItemLabel, setNewItemLabel] = useState('')
  const [newItemAmount, setNewItemAmount] = useState('')

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

    // Also load expense items
    createClient()
      .from('expense_items')
      .select('id, category_key, label, amount')
      .eq('user_id', userId)
      .then(({ data: items }) => {
        if (items && items.length > 0) {
          const grouped: Record<string, ExpenseItem[]> = {}
          for (const item of items) {
            if (!grouped[item.category_key]) grouped[item.category_key] = []
            grouped[item.category_key].push(item as ExpenseItem)
          }
          setCategoryItems(grouped)
        }
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

  // ── Manual entry helpers ──
  function addManualTx() {
    const amt = parseFloat(newAmount.replace(/[^0-9.]/g, ''))
    if (!newDesc.trim() || isNaN(amt) || amt <= 0) return
    setManualTxs(prev => [...prev, { id: Math.random().toString(36).slice(2, 9), description: newDesc.trim(), amount: Math.round(amt), category: newCat }])
    setNewDesc('')
    setNewAmount('')
    setNewCat('other')
  }

  function removeManualTx(id: string) {
    setManualTxs(prev => prev.filter(t => t.id !== id))
  }

  function applyManualTxs() {
    const sums: Record<string, number> = {}
    manualTxs.forEach(tx => {
      sums[tx.category] = (sums[tx.category] ?? 0) + tx.amount
    })
    setCategories(prev => {
      const next = prev.map(c => ({
        ...c,
        amount: Math.round(sums[c.key] ?? c.amount),
      }))
      if (categoriesLoaded) saveCategories(next)
      return next
    })
    setShowManualEntry(false)
    setManualTxs([])
  }

  // ── Expense item helpers ──
  function toggleCategory(key: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    setAddingItem(null)
    setNewItemLabel('')
    setNewItemAmount('')
  }

  async function addExpenseItem(categoryKey: string) {
    const amt = parseFloat(newItemAmount.replace(/[^0-9.]/g, ''))
    if (!newItemLabel.trim() || isNaN(amt) || amt <= 0) return
    const supabase = createClient()
    const { data } = await supabase
      .from('expense_items')
      .insert({ user_id: userId, category_key: categoryKey, label: newItemLabel.trim(), amount: Math.round(amt) })
      .select('id, category_key, label, amount')
      .single()
    if (!data) return
    const newItem = data as ExpenseItem
    setCategoryItems(prev => ({
      ...prev,
      [categoryKey]: [...(prev[categoryKey] ?? []), newItem],
    }))
    // Update category total from items
    const newItems = [...(categoryItems[categoryKey] ?? []), newItem]
    const total = newItems.reduce((s, it) => s + it.amount, 0)
    updateAmount(categoryKey, total)
    setNewItemLabel('')
    setNewItemAmount('')
    setAddingItem(null)
  }

  async function removeExpenseItem(categoryKey: string, itemId: string) {
    const supabase = createClient()
    await supabase.from('expense_items').delete().eq('id', itemId).eq('user_id', userId)
    setCategoryItems(prev => {
      const updated = (prev[categoryKey] ?? []).filter(it => it.id !== itemId)
      const total = updated.reduce((s, it) => s + it.amount, 0)
      updateAmount(categoryKey, total > 0 ? total : 0)
      return { ...prev, [categoryKey]: updated }
    })
  }

  const QUICK_ADD = [
    { label: 'HDB Loan', cat: 'housing', amt: 1200 },
    { label: 'Grab Ride', cat: 'transport', amt: 15 },
    { label: 'NTUC', cat: 'food', amt: 80 },
    { label: 'Netflix', cat: 'entertainment', amt: 16 },
    { label: 'SP Utilities', cat: 'utilities', amt: 150 },
    { label: 'AIA Premium', cat: 'insurance', amt: 300 },
  ]

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
      ? { label: 'Excellent', colour: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)',
          desc: 'Strong savings rate and healthy spending ratios.' }
      : healthScore >= 60
      ? { label: 'Good', colour: '#10b981', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.20)',
          desc: 'Good overall cash flow with room for improvement.' }
      : healthScore >= 40
      ? { label: 'Fair', colour: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)',
          desc: 'Spending is high relative to income — review discretionary items.' }
      : { label: 'Needs Attention', colour: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)',
          desc: 'Cash flow is strained. Consider expense reduction or income growth.' }

  const pieData = categories.filter((c) => c.amount > 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif", color: '#fdf8f2' }}>
          Cash Flow Analysis
        </h2>
        <p className="text-sm" style={{ color: 'rgba(253,248,242,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Understand where your money goes and optimise your savings rate.
        </p>
      </div>

      {/* Hero verdict */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border p-5 glass-card"
        style={{ background: surplus >= 0 ? 'rgba(22,163,74,0.07)' : 'rgba(239,68,68,0.07)', borderColor: surplus >= 0 ? 'rgba(22,163,74,0.25)' : 'rgba(239,68,68,0.25)' }}
      >
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 8px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Your Cash Flow Position
        </p>
        {surplus >= 0 ? (
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#fdf8f2', margin: '0 0 4px', lineHeight: 1.4 }}>
            Your monthly surplus is{' '}
            <span style={{ color: '#16a34a' }}>{formatSGD(surplus)}</span>.
            {' '}You&apos;re saving{' '}
            <span style={{ color: '#16a34a' }}>{Math.round(savingsRate)}%</span>
            {' '}of income.
          </p>
        ) : (
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#fdf8f2', margin: '0 0 4px', lineHeight: 1.4 }}>
            You&apos;re spending{' '}
            <span style={{ color: '#ef4444' }}>{formatSGD(Math.abs(surplus))}</span>
            {' '}more than you earn each month.
          </p>
        )}
        <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.55)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          {health.desc}
        </p>
      </motion.div>

      {/* Step 1 — Your Numbers */}
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 -16px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
        Step 1 · Your Numbers
      </p>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Monthly Income', value: formatSGD(monthlyIncome), colour: '#fdf8f2' },
          { label: 'Monthly Expenses', value: formatSGD(totalExpenses), colour: '#ef4444' },
          { label: 'Monthly Surplus', value: formatSGD(surplus), colour: surplus >= 0 ? '#10b981' : '#ef4444' },
          { label: 'Savings Rate', value: `${animatedSavingsRate}%`, colour: '#9b2040' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.07 }}
            className="rounded-2xl border p-4"
            style={{ background: 'rgba(122,28,46,0.06)', borderColor: 'rgba(196,168,130,0.15)', backdropFilter: 'blur(12px)' }}
          >
            <p className="text-xs mb-1" style={{ color: 'rgba(253,248,242,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
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
          width: 40, height: 40, borderRadius: '50%', background: health.colour + '25',
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
          <p className="text-xs" style={{ color: 'rgba(253,248,242,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif", margin: '2px 0 0' }}>
            {health.desc}
          </p>
        </div>
      </motion.div>

      {/* Step 2 — Spending Breakdown */}
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 -16px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
        Step 2 · Spending Breakdown
      </p>

      {/* Import / manual entry toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}
      >
        <p className="text-xs" style={{ color: 'rgba(253,248,242,0.4)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Click any amount to edit it directly
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowManualEntry(v => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer',
              fontSize: 12, fontWeight: 600, color: showManualEntry ? '#fdf8f2' : '#c4a882',
              border: `1px solid ${showManualEntry ? 'rgba(155,32,64,0.4)' : 'rgba(196,168,130,0.25)'}`, borderRadius: 8, padding: '5px 10px',
              background: showManualEntry ? 'rgba(155,32,64,0.2)' : 'rgba(122,28,46,0.08)', fontFamily: "'Cabinet Grotesk', sans-serif",
            }}
          >
            + Manual
          </motion.button>
          <motion.label
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer',
              fontSize: 12, fontWeight: 600, color: '#c4a882',
              border: '1px solid rgba(196,168,130,0.25)', borderRadius: 8, padding: '5px 10px',
              background: 'rgba(122,28,46,0.08)', fontFamily: "'Cabinet Grotesk', sans-serif",
            }}
            title="Upload a CSV bank statement to auto-populate"
          >
            ↑ CSV
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
          </motion.label>
        </div>
      </motion.div>

      {/* Manual entry panel */}
      <AnimatePresence>
        {showManualEntry && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ background: 'rgba(10,6,5,0.4)', borderRadius: 12, padding: '16px 18px', border: '1px solid rgba(196,168,130,0.1)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 10px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Add Transactions
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {QUICK_ADD.map(q => (
                  <motion.button
                    key={q.label}
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    onClick={() => setManualTxs(prev => [...prev, { id: Math.random().toString(36).slice(2, 9), description: q.label, amount: q.amt, category: q.cat }])}
                    style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                      background: 'rgba(196,168,130,0.08)', border: '1px solid rgba(196,168,130,0.15)',
                      color: 'rgba(253,248,242,0.6)', cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif",
                    }}
                  >
                    {q.label}
                  </motion.button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description" onKeyDown={e => e.key === 'Enter' && addManualTx()} style={{ flex: 2, minWidth: 120, padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(196,168,130,0.15)', background: 'rgba(10,6,5,0.6)', color: '#fdf8f2', fontSize: 12, fontFamily: "'Cabinet Grotesk', sans-serif", outline: 'none' }} />
                <input value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="Amount" onKeyDown={e => e.key === 'Enter' && addManualTx()} style={{ width: 80, padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(196,168,130,0.15)', background: 'rgba(10,6,5,0.6)', color: '#fdf8f2', fontSize: 12, fontFamily: "'Cabinet Grotesk', sans-serif", outline: 'none' }} />
                <select value={newCat} onChange={e => setNewCat(e.target.value)} style={{ width: 110, padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(196,168,130,0.15)', background: 'rgba(10,6,5,0.6)', color: '#fdf8f2', fontSize: 12, fontFamily: "'Cabinet Grotesk', sans-serif", outline: 'none' }}>
                  {CATEGORY_META.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={addManualTx} style={{ padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: '#9b2040', color: '#fdf8f2', border: 'none', cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif" }}>Add</motion.button>
              </div>
              {manualTxs.length > 0 && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto', marginBottom: 10 }}>
                    {manualTxs.map(tx => {
                      const meta = CATEGORY_META.find(m => m.key === tx.category)
                      return (
                        <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 6, background: 'rgba(196,168,130,0.04)' }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: meta?.colour ?? '#64748b', flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 11, color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif" }}>{tx.description}</span>
                          <span style={{ fontSize: 11, color: 'rgba(253,248,242,0.5)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>{meta?.label}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif" }}>{formatSGD(tx.amount)}</span>
                          <button onClick={() => removeManualTx(tx.id)} style={{ background: 'none', border: 'none', color: 'rgba(253,248,242,0.3)', fontSize: 14, cursor: 'pointer', padding: '0 2px' }}>×</button>
                        </div>
                      )
                    })}
                  </div>
                  <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={applyManualTxs} style={{ width: '100%', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)', color: '#10b981', cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                    Apply {manualTxs.length} transactions to categories
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Large category cards — 2-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
        {categories.map((c, i) => {
          const pctOfIncome = monthlyIncome > 0 ? (c.amount / monthlyIncome) * 100 : 0
          const pctOfExpenses = totalExpenses > 0 ? (c.amount / totalExpenses) * 100 : 0
          const budgetMax: Record<string, number> = { housing: 30, food: 15, transport: 10, utilities: 8, healthcare: 5, insurance: 10, entertainment: 8, shopping: 10, other: 10 }
          const rec = budgetMax[c.key] ?? 10
          const overBudget = monthlyIncome > 0 && pctOfIncome > rec * 1.2
          const fillColor = pctOfIncome <= rec ? '#16a34a' : pctOfIncome <= rec * 1.2 ? '#f59e0b' : '#ef4444'
          const fillPct = Math.min(100, (pctOfIncome / rec) * 100)

          return (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              whileHover={{ y: -3, boxShadow: `0 8px 28px rgba(${c.key === 'housing' ? '122,28,46' : '0,0,0'},0.22)` }}
              style={{
                borderRadius: 16,
                border: '1px solid rgba(196,168,130,0.12)',
                background: 'rgba(122,28,46,0.05)',
                backdropFilter: 'blur(12px)',
                cursor: 'default',
                transition: 'border-color 0.2s',
              }}
            >
              {/* Colour accent top strip */}
              <div style={{ height: 4, background: c.colour, width: '100%', borderRadius: '16px 16px 0 0' }} />

              <div style={{ padding: '16px 18px 14px' }}>
                {/* Category name + expand toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(196,168,130,0.7)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                    {c.label}
                  </p>
                  <button
                    onClick={() => toggleCategory(c.key)}
                    title={expandedCategories.has(c.key) ? 'Collapse' : 'Expand line items'}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(196,168,130,0.5)', fontSize: 14, padding: '0 2px', lineHeight: 1, display: 'flex', alignItems: 'center' }}
                  >
                    {expandedCategories.has(c.key) ? '▲' : '▼'}
                  </button>
                </div>

                {/* Amount (large, Playfair, clickable) */}
                <div style={{ marginBottom: 10 }}>
                  <AmountCell value={c.amount} onChange={(v) => updateAmount(c.key, v)} colour={c.colour} large />
                  {(categoryItems[c.key]?.length ?? 0) > 0 && (
                    <p style={{ fontSize: 9, color: 'rgba(196,168,130,0.5)', margin: '3px 0 0', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                      {categoryItems[c.key].length} line item{categoryItems[c.key].length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {/* % of income + % of expenses */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: 'rgba(253,248,242,0.45)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                    {pctOfExpenses.toFixed(1)}% of spending
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: fillColor, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                    {pctOfIncome.toFixed(1)}% of income
                  </span>
                </div>

                {/* Fill bar */}
                <div style={{ height: 5, background: 'rgba(196,168,130,0.10)', borderRadius: 3, overflow: 'hidden', marginBottom: overBudget ? 8 : 0 }}>
                  <motion.div
                    style={{ height: '100%', background: fillColor, borderRadius: 3 }}
                    initial={{ width: 0 }}
                    animate={{ width: `${fillPct}%` }}
                    transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                  />
                </div>

                {/* Amber tip if over budget */}
                {overBudget && (
                  <p style={{ fontSize: 10, color: '#f59e0b', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif", lineHeight: 1.4 }}>
                    ⚠ {(pctOfIncome - rec).toFixed(1)}% over the recommended {rec}% ceiling
                  </p>
                )}
              </div>

              {/* Expanded line items */}
              <AnimatePresence>
                {expandedCategories.has(c.key) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    style={{ overflow: 'hidden', borderTop: '1px solid rgba(196,168,130,0.10)' }}
                  >
                    <div style={{ padding: '10px 18px 14px' }}>
                      {/* Existing items */}
                      {(categoryItems[c.key] ?? []).length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                          {categoryItems[c.key].map(item => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 6, background: 'rgba(196,168,130,0.04)' }}>
                              <span style={{ flex: 1, fontSize: 11, color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.label}
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(253,248,242,0.7)', fontFamily: "'Cabinet Grotesk', sans-serif", flexShrink: 0 }}>
                                {formatSGD(item.amount)}
                              </span>
                              <button
                                onClick={() => removeExpenseItem(c.key, item.id)}
                                style={{ background: 'none', border: 'none', color: 'rgba(253,248,242,0.25)', fontSize: 13, cursor: 'pointer', padding: '0 2px', flexShrink: 0, lineHeight: 1 }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.3)', fontFamily: "'Cabinet Grotesk', sans-serif", margin: '0 0 8px' }}>
                          No line items yet — add one below.
                        </p>
                      )}

                      {/* Add entry */}
                      {addingItem === c.key ? (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <input
                            value={newItemLabel}
                            onChange={e => setNewItemLabel(e.target.value)}
                            placeholder="Description"
                            onKeyDown={e => { if (e.key === 'Enter') addExpenseItem(c.key); if (e.key === 'Escape') setAddingItem(null) }}
                            autoFocus
                            style={{ flex: 2, minWidth: 80, padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(196,168,130,0.2)', background: 'rgba(10,6,5,0.6)', color: '#fdf8f2', fontSize: 11, fontFamily: "'Cabinet Grotesk', sans-serif", outline: 'none' }}
                          />
                          <input
                            value={newItemAmount}
                            onChange={e => setNewItemAmount(e.target.value)}
                            placeholder="S$"
                            onKeyDown={e => { if (e.key === 'Enter') addExpenseItem(c.key); if (e.key === 'Escape') setAddingItem(null) }}
                            style={{ width: 64, padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(196,168,130,0.2)', background: 'rgba(10,6,5,0.6)', color: '#fdf8f2', fontSize: 11, fontFamily: "'Cabinet Grotesk', sans-serif", outline: 'none' }}
                          />
                          <button onClick={() => addExpenseItem(c.key)} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#9b2040', color: '#fdf8f2', border: 'none', cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                            Add
                          </button>
                          <button onClick={() => setAddingItem(null)} style={{ padding: '5px 8px', borderRadius: 6, fontSize: 11, background: 'none', color: 'rgba(253,248,242,0.4)', border: '1px solid rgba(196,168,130,0.15)', cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddingItem(c.key); setNewItemLabel(''); setNewItemAmount('') }}
                          style={{ fontSize: 11, fontWeight: 600, color: '#c4a882', background: 'none', border: '1px dashed rgba(196,168,130,0.25)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif" }}
                        >
                          + Add Entry
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* Total bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 18px', background: 'rgba(122,28,46,0.08)', border: '1px solid rgba(196,168,130,0.12)', borderRadius: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(253,248,242,0.6)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>Total monthly expenses</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#fdf8f2', fontFamily: "'Playfair Display', serif" }}>{formatSGD(totalExpenses)}</span>
      </div>

      {/* Spending Distribution pie — stays below cards */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="rounded-2xl border p-6 glass-card"
        style={{ background: 'rgba(122,28,46,0.06)', borderColor: 'rgba(196,168,130,0.15)', backdropFilter: 'blur(12px)' }}
      >
        <p className="font-semibold text-sm mb-1" style={{ color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Spending Distribution
        </p>
        <p className="text-xs mb-4" style={{ color: 'rgba(253,248,242,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Each slice shows your monthly spend in that category. Hover for exact amounts.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={pieData} dataKey="amount" nameKey="label" cx="50%" cy="50%" outerRadius={95} innerRadius={48} paddingAngle={2} isAnimationActive={true} animationDuration={1200}>
              {pieData.map((c) => <Cell key={c.key} fill={c.colour} />)}
            </Pie>
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [formatSGD(Number(value)), String(name ?? '')]}
              contentStyle={{ background: 'rgba(10,6,5,0.95)', border: '1px solid rgba(196,168,130,0.3)', borderRadius: 12, fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: 12, color: '#fdf8f2' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Step 3 — Savings Efficiency */}
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 -16px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
        Step 3 · Savings Efficiency
      </p>

      {/* 50/30/20 Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.32 }}
        className="rounded-2xl border p-6 glass-card"
        style={{ background: 'rgba(122,28,46,0.06)', borderColor: 'rgba(196,168,130,0.15)', backdropFilter: 'blur(12px)' }}
      >
        <p className="font-semibold text-sm mb-1" style={{ color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          50 / 30 / 20 Rule
        </p>
        <p className="text-xs mb-4" style={{ color: 'rgba(253,248,242,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
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
            const colour = good ? '#10b981' : Math.abs(diff) <= 10 ? '#f59e0b' : '#ef4444'
            const statusLabel = good
              ? 'On track'
              : row.label === 'Savings'
              ? `Short by ${diff.toFixed(1)}%`
              : `Over by ${diff.toFixed(1)}%`

            return (
              <div key={row.label}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                    {row.label} <span style={{ fontWeight: 400, color: 'rgba(253,248,242,0.55)', fontSize: 11 }}>({row.label === 'Savings' ? '≥' : '≤'}{row.target}%)</span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: colour, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                      {row.actual.toFixed(1)}%
                    </span>
                    <span style={{
                      fontSize: 11, padding: '1px 7px', borderRadius: 20, fontWeight: 600,
                      fontFamily: "'Cabinet Grotesk', sans-serif",
                      background: good ? 'rgba(16,185,129,0.12)' : Math.abs(diff) <= 10 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                      color: colour,
                    }}>
                      {statusLabel}
                    </span>
                  </div>
                </div>
                <div style={{ height: 6, background: 'rgba(196,168,130,0.10)', borderRadius: 3, overflow: 'hidden' }}>
                  <motion.div
                    style={{ height: '100%', background: colour, borderRadius: 3 }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, row.actual)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif", marginTop: 3 }}>
                  {row.desc}
                </p>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Spending leaks + survivability */}
      {monthlyIncome > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="rounded-2xl border p-6 glass-card"
          style={{ background: 'rgba(122,28,46,0.06)', borderColor: 'rgba(196,168,130,0.15)', backdropFilter: 'blur(12px)' }}
        >
          <p className="font-semibold text-sm mb-1" style={{ color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Behavioral Diagnosis
          </p>
          <p className="text-xs mb-4" style={{ color: 'rgba(253,248,242,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Spending leaks and income resilience at a glance.
          </p>

          {/* Spending leaks — categories > 15% of income */}
          {(() => {
            const leaks = categories
              .filter(c => c.amount > 0 && (c.amount / monthlyIncome) * 100 > 15)
              .sort((a, b) => b.amount - a.amount)

            return leaks.length > 0 ? (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#d97706', margin: '0 0 10px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  Spending Leaks (categories over 15% of income)
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {leaks.map(c => {
                    const pctOfIncome = (c.amount / monthlyIncome) * 100
                    return (
                      <div key={c.key} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', borderRadius: 10,
                        background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)',
                        borderLeft: `3px solid ${c.colour}`,
                      }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.colour, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", flex: 1 }}>
                          {c.label}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#d97706', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                          {pctOfIncome.toFixed(0)}% of income
                        </span>
                        <span style={{ fontSize: 12, color: 'rgba(253,248,242,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                          ({formatSGD(c.amount)}/mo)
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 20, padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <p style={{ fontSize: 12, color: '#10b981', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 600 }}>
                  No spending leaks detected — no single category exceeds 15% of your income.
                </p>
              </div>
            )
          })()}

          {/* Survivability meter — months at current expenses if income halved */}
          {(() => {
            const halvedIncome = monthlyIncome / 2
            const halvedSurplus = halvedIncome - totalExpenses
            const survivableMonths = halvedSurplus >= 0 ? Infinity : totalExpenses > 0 ? Math.max(0, halvedIncome / totalExpenses * 12) : 0
            const meterPct = survivableMonths === Infinity ? 100 : Math.min(100, (survivableMonths / 12) * 100)
            const meterColour = survivableMonths === Infinity ? '#10b981' : survivableMonths >= 6 ? '#d97706' : '#ef4444'
            const meterLabel = survivableMonths === Infinity
              ? 'Sustainable — surplus even at half income'
              : `${Math.round(survivableMonths)} months before depletion`

            return (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: meterColour, margin: '0 0 8px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  Income Halved — Survivability
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, background: 'rgba(196,168,130,0.10)', borderRadius: 99, height: 10, overflow: 'hidden' }}>
                    <motion.div
                      style={{ height: '100%', background: meterColour, borderRadius: 99 }}
                      initial={{ width: 0 }}
                      animate={{ width: `${meterPct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: meterColour, fontFamily: "'Cabinet Grotesk', sans-serif", flexShrink: 0, minWidth: 60, textAlign: 'right' }}>
                    {survivableMonths === Infinity ? '∞' : `${Math.round(survivableMonths)}mo`}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.55)', margin: '4px 0 0', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  {meterLabel}
                </p>
              </div>
            )
          })()}
        </motion.div>
      )}

      {/* 12-month savings projection */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.38 }}
        className="rounded-2xl border p-6 glass-card"
        style={{ background: 'rgba(122,28,46,0.06)', borderColor: 'rgba(196,168,130,0.15)', backdropFilter: 'blur(12px)' }}
      >
        <p className="font-semibold text-sm mb-1" style={{ color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          12-Month Savings Accumulation
        </p>
        <p className="text-xs mb-4" style={{ color: 'rgba(253,248,242,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          At your current monthly surplus of {formatSGD(Math.max(0, surplus))}, here&apos;s how your cash savings would grow over the next year.
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={monthlyProjection} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <defs>
              <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9b2040" stopOpacity={0.30} />
                <stop offset="95%" stopColor="#9b2040" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,168,130,0.06)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(253,248,242,0.35)' }} />
            <YAxis tickFormatter={(v) => formatSGDShort(v as number)} tick={{ fontSize: 11, fill: 'rgba(253,248,242,0.35)' }} width={64} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [formatSGD(Number(v)), 'Accumulated savings']}
              contentStyle={{ background: 'rgba(10,6,5,0.95)', border: '1px solid rgba(196,168,130,0.3)', borderRadius: 12, fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: 12, color: '#fdf8f2' }}
            />
            <Area type="monotone" dataKey="savings" stroke="#9b2040" strokeWidth={2.5} fill="url(#savingsGrad)" dot={false} activeDot={{ r: 5 }} isAnimationActive={true} animationDuration={1200} />
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
            className="rounded-2xl border p-6 glass-card"
            style={{ background: 'rgba(122,28,46,0.08)', borderColor: 'rgba(196,168,130,0.25)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p className="font-semibold text-base" style={{ color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  Review Imported Transactions
                </p>
                <p className="text-xs" style={{ color: 'rgba(253,248,242,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  {parsedTxs.length} transactions detected. Adjust categories, then click Import.
                </p>
              </div>
              <button onClick={() => { setShowUpload(false); setParsedTxs([]) }} style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(253,248,242,0.55)' }}>×</button>
            </div>

            <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid rgba(196,168,130,0.15)', borderRadius: 10, background: 'rgba(10,6,5,0.40)' }}>
              {parsedTxs.map((tx, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: i < parsedTxs.length - 1 ? '1px solid rgba(196,168,130,0.08)' : 'none', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'rgba(253,248,242,0.70)', fontFamily: "'Cabinet Grotesk', sans-serif", flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.description}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", flexShrink: 0 }}>
                    {formatSGD(tx.amount)}
                  </span>
                  <select
                    value={txCategory[i] ?? 'other'}
                    onChange={(e) => setTxCategory((prev) => ({ ...prev, [i]: e.target.value }))}
                    style={{ fontSize: 11, border: '1px solid rgba(196,168,130,0.15)', borderRadius: 6, padding: '2px 4px', background: 'rgba(122,28,46,0.10)', color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", flexShrink: 0 }}
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
                style={{ background: '#9b2040', color: '#fdf8f2', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif", opacity: importing ? 0.6 : 1 }}
              >
                {importing ? 'Importing…' : `Import ${parsedTxs.length} Transactions`}
              </button>
              <button onClick={() => { setShowUpload(false); setParsedTxs([]) }} style={{ background: 'none', color: 'rgba(253,248,242,0.55)', border: '1px solid rgba(196,168,130,0.15)', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
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
