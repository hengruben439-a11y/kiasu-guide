'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ClientProfile } from '@/types'

interface Props {
  userId: string
  profile: Partial<ClientProfile> | null
}

type Tab = 'income' | 'savings' | 'cpf' | 'investments' | 'retirement' | 'liabilities' | 'goals' | 'networth'

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'income', label: 'Income & Expenses', emoji: '💼' },
  { id: 'savings', label: 'Savings & Assets', emoji: '🏦' },
  { id: 'cpf', label: 'CPF', emoji: '📊' },
  { id: 'investments', label: 'Investments', emoji: '📈' },
  { id: 'retirement', label: 'Retirement Goals', emoji: '🎯' },
  { id: 'liabilities', label: 'Liabilities', emoji: '💳' },
  { id: 'goals', label: 'Goals', emoji: '🏁' },
  { id: 'networth', label: 'Net Worth', emoji: '⚖️' },
]

// ─── Net Worth ────────────────────────────────────────────────────────────────

interface NWItem {
  id: string
  type: 'asset' | 'liability'
  category: string
  label: string
  value: number
  sort_order: number
}

const ASSET_CATEGORIES = ['Cash & Savings', 'CPF', 'Property', 'Stocks & ETFs', 'Unit Trusts', 'Bonds', 'Crypto', 'Business', 'Other Asset']
const LIABILITY_CATEGORIES = ['Home Loan', 'Car Loan', 'Personal Loan', 'Credit Card', 'Student Loan', 'Other Liability']

function formatSGD(v: number) {
  return `$${Math.round(v).toLocaleString('en-SG')}`
}

function NetWorthTab({ userId }: { userId: string }) {
  const [items, setItems] = useState<NWItem[]>([])
  const [loading, setLoading] = useState(true)
  const [addingType, setAddingType] = useState<'asset' | 'liability' | null>(null)
  const [newLabel, setNewLabel] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newValue, setNewValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('net_worth_items')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order')
      .then(({ data }) => {
        if (data) setItems(data as NWItem[])
        setLoading(false)
      })
  }, [userId])

  async function addItem() {
    if (!addingType || !newLabel || !newValue) return
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('net_worth_items')
      .insert({
        user_id: userId,
        type: addingType,
        category: newCategory || (addingType === 'asset' ? 'Other Asset' : 'Other Liability'),
        label: newLabel,
        value: parseFloat(newValue) || 0,
        sort_order: items.length,
      })
      .select()
      .single()
    if (!error && data) {
      setItems((prev) => [...prev, data as NWItem])
      setNewLabel(''); setNewCategory(''); setNewValue(''); setAddingType(null)
    }
    setSaving(false)
  }

  async function deleteItem(id: string) {
    const supabase = createClient()
    await supabase.from('net_worth_items').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  async function updateValue(id: string, value: number) {
    const supabase = createClient()
    await supabase.from('net_worth_items').update({ value }).eq('id', id)
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, value } : i)))
  }

  const assets = items.filter((i) => i.type === 'asset')
  const liabilities = items.filter((i) => i.type === 'liability')
  const totalAssets = assets.reduce((s, i) => s + i.value, 0)
  const totalLiabilities = liabilities.reduce((s, i) => s + i.value, 0)
  const netWorth = totalAssets - totalLiabilities

  if (loading) return <p style={{ color: 'rgba(253,248,242,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>Loading…</p>

  const itemRowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 12px', borderRadius: 8,
    background: 'rgba(10,6,5,0.4)',
    border: '1px solid rgba(196,168,130,0.15)', marginBottom: 6,
  }
  const catBadge: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20,
    background: 'rgba(196,168,130,0.08)', color: 'rgba(253,248,242,0.55)', border: '1px solid rgba(196,168,130,0.15)',
    fontFamily: "'Cabinet Grotesk', sans-serif", flexShrink: 0,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Net worth summary */}
      <div className="grid-3col" style={{ gap: 12 }}>
        {[
          { label: 'Total Assets', value: totalAssets, colour: '#10b981' },
          { label: 'Total Liabilities', value: totalLiabilities, colour: '#ef4444' },
          { label: 'Net Worth', value: netWorth, colour: netWorth >= 0 ? '#9b2040' : '#ef4444' },
        ].map((s) => (
          <div key={s.label} style={{ background: 'rgba(10,6,5,0.4)', border: '1px solid rgba(196,168,130,0.15)', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif", margin: '0 0 4px' }}>{s.label}</p>
            <p style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: s.colour, margin: 0 }}>
              {formatSGD(Math.abs(s.value))}
            </p>
          </div>
        ))}
      </div>

      {/* Assets */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#10b981', fontFamily: "'Cabinet Grotesk', sans-serif", margin: 0 }}>
            Assets
          </p>
          <button
            onClick={() => { setAddingType('asset'); setNewCategory(ASSET_CATEGORIES[0]) }}
            style={{ fontSize: 12, fontWeight: 600, color: '#c4a882', background: 'none', border: '1px solid rgba(196,168,130,0.3)', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
            + Add Asset
          </button>
        </div>
        {assets.length === 0 && (
          <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.55)', fontStyle: 'italic', fontFamily: "'Cabinet Grotesk', sans-serif" }}>No assets added yet.</p>
        )}
        {assets.map((item) => (
          <div key={item.id} style={itemRowStyle}>
            <span style={catBadge}>{item.category}</span>
            <span style={{ fontSize: 13, flex: 1, color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif" }}>{item.label}</span>
            <EditableValue value={item.value} colour="#10b981" onCommit={(v) => updateValue(item.id, v)} />
            <button onClick={() => deleteItem(item.id)} style={{ color: 'rgba(253,248,242,0.55)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, flexShrink: 0, lineHeight: 1 }}>×</button>
          </div>
        ))}
      </div>

      {/* Liabilities */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ef4444', fontFamily: "'Cabinet Grotesk', sans-serif", margin: 0 }}>
            Liabilities
          </p>
          <button
            onClick={() => { setAddingType('liability'); setNewCategory(LIABILITY_CATEGORIES[0]) }}
            style={{ fontSize: 12, fontWeight: 600, color: '#c4a882', background: 'none', border: '1px solid rgba(196,168,130,0.3)', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
            + Add Liability
          </button>
        </div>
        {liabilities.length === 0 && (
          <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.55)', fontStyle: 'italic', fontFamily: "'Cabinet Grotesk', sans-serif" }}>No liabilities added yet.</p>
        )}
        {liabilities.map((item) => (
          <div key={item.id} style={itemRowStyle}>
            <span style={catBadge}>{item.category}</span>
            <span style={{ fontSize: 13, flex: 1, color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif" }}>{item.label}</span>
            <EditableValue value={item.value} colour="#ef4444" onCommit={(v) => updateValue(item.id, v)} />
            <button onClick={() => deleteItem(item.id)} style={{ color: 'rgba(253,248,242,0.55)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, flexShrink: 0, lineHeight: 1 }}>×</button>
          </div>
        ))}
      </div>

      {/* Add item inline form */}
      {addingType && (
        <div style={{ background: 'rgba(10,6,5,0.5)', border: '1px solid rgba(196,168,130,0.3)', borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", margin: 0 }}>
            Add {addingType === 'asset' ? 'Asset' : 'Liability'}
          </p>
          <div className="grid-3col" style={{ gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(253,248,242,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Cabinet Grotesk', sans-serif", display: 'block', marginBottom: 4 }}>Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                style={{ width: '100%', fontSize: 13, border: '1px solid rgba(196,168,130,0.15)', borderRadius: 8, padding: '8px 10px', background: 'rgba(10,6,5,0.6)', color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif" }}
              >
                {(addingType === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(253,248,242,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Cabinet Grotesk', sans-serif", display: 'block', marginBottom: 4 }}>Description</label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. DBS Savings"
                style={{ width: '100%', fontSize: 13, border: '1px solid rgba(196,168,130,0.15)', borderRadius: 8, padding: '8px 10px', background: 'rgba(10,6,5,0.6)', color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(253,248,242,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Cabinet Grotesk', sans-serif", display: 'block', marginBottom: 4 }}>Amount (S$)</label>
              <input
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="0"
                min={0}
                style={{ width: '100%', fontSize: 13, border: '1px solid rgba(196,168,130,0.15)', borderRadius: 8, padding: '8px 10px', background: 'rgba(10,6,5,0.6)', color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={addItem}
              disabled={saving || !newLabel || !newValue}
              style={{ background: '#9b2040', color: '#fdf8f2', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif", opacity: (saving || !newLabel || !newValue) ? 0.5 : 1 }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => { setAddingType(null); setNewLabel(''); setNewValue('') }}
              style={{ background: 'none', color: 'rgba(253,248,242,0.55)', border: '1px solid rgba(196,168,130,0.15)', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Liabilities Tab ──────────────────────────────────────────────────────────

interface Liability {
  id: string
  name: string
  type: 'mortgage' | 'loan' | 'credit_card' | 'other'
  outstanding_balance: number
  monthly_payment: number
  interest_rate: number
  maturity_date: string | null
}

const LIABILITY_TYPES: { value: Liability['type']; label: string }[] = [
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'loan', label: 'Loan' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'other', label: 'Other' },
]

function LiabilitiesTab({ userId }: { userId: string }) {
  const [items, setItems] = useState<Liability[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({ name: '', type: 'mortgage' as Liability['type'], outstanding_balance: '', monthly_payment: '', interest_rate: '', maturity_date: '' })

  useEffect(() => {
    const supabase = createClient()
    supabase.from('liabilities').select('*').eq('user_id', userId).order('created_at').then(({ data }) => {
      if (data) setItems(data as Liability[])
      setLoading(false)
    })
  }, [userId])

  async function addLiability() {
    if (!draft.name || !draft.outstanding_balance) return
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('liabilities').insert({
      user_id: userId,
      name: draft.name,
      type: draft.type,
      outstanding_balance: parseFloat(draft.outstanding_balance) || 0,
      monthly_payment: parseFloat(draft.monthly_payment) || 0,
      interest_rate: parseFloat(draft.interest_rate) || 0,
      maturity_date: draft.maturity_date || null,
    }).select().single()
    if (!error && data) {
      setItems(prev => [...prev, data as Liability])
      setDraft({ name: '', type: 'mortgage', outstanding_balance: '', monthly_payment: '', interest_rate: '', maturity_date: '' })
      setAdding(false)
    }
    setSaving(false)
  }

  async function deleteLiability(id: string) {
    const supabase = createClient()
    await supabase.from('liabilities').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const totalBalance = items.reduce((s, i) => s + i.outstanding_balance, 0)
  const totalMonthly = items.reduce((s, i) => s + i.monthly_payment, 0)

  if (loading) return <p style={{ color: 'rgba(253,248,242,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>Loading…</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Summary */}
      <div className="grid-2col" style={{ gap: 12 }}>
        {[
          { label: 'Total Outstanding', value: totalBalance, colour: '#ef4444' },
          { label: 'Monthly Payments', value: totalMonthly, colour: '#d97706' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(10,6,5,0.4)', border: '1px solid rgba(196,168,130,0.15)', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif", margin: '0 0 4px' }}>{s.label}</p>
            <p style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: s.colour, margin: 0 }}>
              {formatSGD(s.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Liabilities list */}
      {items.length === 0 && !adding && (
        <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.55)', fontStyle: 'italic', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          No liabilities recorded. Add mortgages, loans, or credit card balances.
        </p>
      )}

      {items.map(item => (
        <div key={item.id} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', borderRadius: 10,
          background: 'rgba(10,6,5,0.4)', border: '1px solid rgba(196,168,130,0.15)',
        }}>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
            background: 'rgba(196,168,130,0.08)', color: 'rgba(253,248,242,0.55)',
            border: '1px solid rgba(196,168,130,0.15)', fontFamily: "'Cabinet Grotesk', sans-serif",
            flexShrink: 0, textTransform: 'capitalize',
          }}>
            {item.type.replace('_', ' ')}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fdf8f2', margin: '0 0 2px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>{item.name}</p>
            <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.45)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              {formatSGD(item.monthly_payment)}/mo
              {item.interest_rate > 0 && ` · ${(item.interest_rate * 100).toFixed(1)}% p.a.`}
              {item.maturity_date && ` · Matures ${new Date(item.maturity_date).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })}`}
            </p>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#ef4444', fontFamily: "'Playfair Display', serif", flexShrink: 0 }}>
            {formatSGD(item.outstanding_balance)}
          </span>
          <button onClick={() => deleteLiability(item.id)} style={{ color: 'rgba(253,248,242,0.55)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, flexShrink: 0, lineHeight: 1 }}>×</button>
        </div>
      ))}

      {/* Add form */}
      {adding ? (
        <div style={{ background: 'rgba(10,6,5,0.5)', border: '1px solid rgba(196,168,130,0.3)', borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", margin: 0 }}>Add Liability</p>
          <div className="grid-2col" style={{ gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(253,248,242,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Cabinet Grotesk', sans-serif", display: 'block', marginBottom: 4 }}>Type</label>
              <select value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value as Liability['type'] }))}
                style={{ width: '100%', fontSize: 13, border: '1px solid rgba(196,168,130,0.15)', borderRadius: 8, padding: '8px 10px', background: 'rgba(10,6,5,0.6)', color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif" }}
              >
                {LIABILITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(253,248,242,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Cabinet Grotesk', sans-serif", display: 'block', marginBottom: 4 }}>Name</label>
              <input type="text" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="e.g. HDB Loan"
                style={{ width: '100%', fontSize: 13, border: '1px solid rgba(196,168,130,0.15)', borderRadius: 8, padding: '8px 10px', background: 'rgba(10,6,5,0.6)', color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div className="grid-2col" style={{ gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(253,248,242,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Cabinet Grotesk', sans-serif", display: 'block', marginBottom: 4 }}>Outstanding Balance (S$)</label>
              <input type="number" value={draft.outstanding_balance} onChange={e => setDraft(d => ({ ...d, outstanding_balance: e.target.value }))} placeholder="0" min={0}
                style={{ width: '100%', fontSize: 13, border: '1px solid rgba(196,168,130,0.15)', borderRadius: 8, padding: '8px 10px', background: 'rgba(10,6,5,0.6)', color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(253,248,242,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Cabinet Grotesk', sans-serif", display: 'block', marginBottom: 4 }}>Monthly Payment (S$)</label>
              <input type="number" value={draft.monthly_payment} onChange={e => setDraft(d => ({ ...d, monthly_payment: e.target.value }))} placeholder="0" min={0}
                style={{ width: '100%', fontSize: 13, border: '1px solid rgba(196,168,130,0.15)', borderRadius: 8, padding: '8px 10px', background: 'rgba(10,6,5,0.6)', color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div className="grid-2col" style={{ gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(253,248,242,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Cabinet Grotesk', sans-serif", display: 'block', marginBottom: 4 }}>Interest Rate (decimal)</label>
              <input type="number" step={0.001} value={draft.interest_rate} onChange={e => setDraft(d => ({ ...d, interest_rate: e.target.value }))} placeholder="0.025"
                style={{ width: '100%', fontSize: 13, border: '1px solid rgba(196,168,130,0.15)', borderRadius: 8, padding: '8px 10px', background: 'rgba(10,6,5,0.6)', color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(253,248,242,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Cabinet Grotesk', sans-serif", display: 'block', marginBottom: 4 }}>Maturity Date (optional)</label>
              <input type="date" value={draft.maturity_date} onChange={e => setDraft(d => ({ ...d, maturity_date: e.target.value }))}
                style={{ width: '100%', fontSize: 13, border: '1px solid rgba(196,168,130,0.15)', borderRadius: 8, padding: '8px 10px', background: 'rgba(10,6,5,0.6)', color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addLiability} disabled={saving || !draft.name || !draft.outstanding_balance}
              style={{ background: '#9b2040', color: '#fdf8f2', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif", opacity: (saving || !draft.name || !draft.outstanding_balance) ? 0.5 : 1 }}
            >{saving ? 'Saving…' : 'Save'}</button>
            <button onClick={() => setAdding(false)}
              style={{ background: 'none', color: 'rgba(253,248,242,0.55)', border: '1px solid rgba(196,168,130,0.15)', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif" }}
            >Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          style={{ fontSize: 12, fontWeight: 600, color: '#c4a882', background: 'none', border: '1px solid rgba(196,168,130,0.3)', borderRadius: 7, padding: '8px 16px', cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif", alignSelf: 'flex-start' }}
        >+ Add Liability</button>
      )}
    </div>
  )
}

// ─── Goals Tab ────────────────────────────────────────────────────────────────

interface Goal {
  id: string
  type: 'education' | 'property' | 'emergency' | 'other'
  label: string
  target_amount: number
  target_date: string | null
  current_amount: number
}

const GOAL_TYPES: { value: Goal['type']; label: string; icon: string }[] = [
  { value: 'education', label: 'Education', icon: '🎓' },
  { value: 'property', label: 'Property', icon: '🏠' },
  { value: 'emergency', label: 'Emergency Fund', icon: '🛟' },
  { value: 'other', label: 'Other', icon: '🎯' },
]

function GoalsTab({ userId }: { userId: string }) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({ type: 'education' as Goal['type'], label: '', target_amount: '', target_date: '', current_amount: '' })

  useEffect(() => {
    const supabase = createClient()
    supabase.from('financial_goals').select('*').eq('user_id', userId).order('created_at').then(({ data }) => {
      if (data) setGoals(data as Goal[])
      setLoading(false)
    })
  }, [userId])

  async function addGoal() {
    if (!draft.label || !draft.target_amount) return
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('financial_goals').insert({
      user_id: userId,
      type: draft.type,
      label: draft.label,
      target_amount: parseFloat(draft.target_amount) || 0,
      target_date: draft.target_date || null,
      current_amount: parseFloat(draft.current_amount) || 0,
    }).select().single()
    if (!error && data) {
      setGoals(prev => [...prev, data as Goal])
      setDraft({ type: 'education', label: '', target_amount: '', target_date: '', current_amount: '' })
      setAdding(false)
    }
    setSaving(false)
  }

  async function deleteGoal(id: string) {
    const supabase = createClient()
    await supabase.from('financial_goals').delete().eq('id', id)
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  if (loading) return <p style={{ color: 'rgba(253,248,242,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>Loading…</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {goals.length === 0 && !adding && (
        <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.55)', fontStyle: 'italic', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          No goals yet. Add education funds, property targets, or other savings goals.
        </p>
      )}

      {goals.map(goal => {
        const pct = goal.target_amount > 0 ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0
        const meta = GOAL_TYPES.find(t => t.value === goal.type)
        return (
          <div key={goal.id} style={{
            padding: '16px 20px', borderRadius: 12,
            background: 'rgba(10,6,5,0.4)', border: '1px solid rgba(196,168,130,0.15)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>{meta?.icon ?? '🎯'}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fdf8f2', margin: '0 0 2px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>{goal.label}</p>
                <p style={{ fontSize: 10, color: 'rgba(253,248,242,0.45)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  {meta?.label}
                  {goal.target_date && ` · By ${new Date(goal.target_date).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })}`}
                </p>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#c4a882', fontFamily: "'Playfair Display', serif" }}>
                {formatSGD(goal.current_amount)} / {formatSGD(goal.target_amount)}
              </span>
              <button onClick={() => deleteGoal(goal.id)} style={{ color: 'rgba(253,248,242,0.55)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ background: 'rgba(196,168,130,0.08)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: pct >= 100 ? '#10b981' : pct >= 50 ? '#d97706' : '#9b2040', width: `${pct}%`, transition: 'width 0.4s ease' }} />
            </div>
            <p style={{ fontSize: 10, color: 'rgba(253,248,242,0.45)', margin: '4px 0 0', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              {Math.round(pct)}% funded
              {goal.target_amount > goal.current_amount && ` · ${formatSGD(goal.target_amount - goal.current_amount)} to go`}
            </p>
          </div>
        )
      })}

      {adding ? (
        <div style={{ background: 'rgba(10,6,5,0.5)', border: '1px solid rgba(196,168,130,0.3)', borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", margin: 0 }}>Add Goal</p>
          <div className="grid-2col" style={{ gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(253,248,242,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Cabinet Grotesk', sans-serif", display: 'block', marginBottom: 4 }}>Type</label>
              <select value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value as Goal['type'] }))}
                style={{ width: '100%', fontSize: 13, border: '1px solid rgba(196,168,130,0.15)', borderRadius: 8, padding: '8px 10px', background: 'rgba(10,6,5,0.6)', color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif" }}
              >
                {GOAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(253,248,242,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Cabinet Grotesk', sans-serif", display: 'block', marginBottom: 4 }}>Label</label>
              <input type="text" value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} placeholder="e.g. Kid's Uni Fund"
                style={{ width: '100%', fontSize: 13, border: '1px solid rgba(196,168,130,0.15)', borderRadius: 8, padding: '8px 10px', background: 'rgba(10,6,5,0.6)', color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div className="grid-3col" style={{ gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(253,248,242,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Cabinet Grotesk', sans-serif", display: 'block', marginBottom: 4 }}>Target Amount (S$)</label>
              <input type="number" value={draft.target_amount} onChange={e => setDraft(d => ({ ...d, target_amount: e.target.value }))} placeholder="0" min={0}
                style={{ width: '100%', fontSize: 13, border: '1px solid rgba(196,168,130,0.15)', borderRadius: 8, padding: '8px 10px', background: 'rgba(10,6,5,0.6)', color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(253,248,242,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Cabinet Grotesk', sans-serif", display: 'block', marginBottom: 4 }}>Current Amount (S$)</label>
              <input type="number" value={draft.current_amount} onChange={e => setDraft(d => ({ ...d, current_amount: e.target.value }))} placeholder="0" min={0}
                style={{ width: '100%', fontSize: 13, border: '1px solid rgba(196,168,130,0.15)', borderRadius: 8, padding: '8px 10px', background: 'rgba(10,6,5,0.6)', color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'rgba(253,248,242,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Cabinet Grotesk', sans-serif", display: 'block', marginBottom: 4 }}>Target Date</label>
              <input type="date" value={draft.target_date} onChange={e => setDraft(d => ({ ...d, target_date: e.target.value }))}
                style={{ width: '100%', fontSize: 13, border: '1px solid rgba(196,168,130,0.15)', borderRadius: 8, padding: '8px 10px', background: 'rgba(10,6,5,0.6)', color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addGoal} disabled={saving || !draft.label || !draft.target_amount}
              style={{ background: '#9b2040', color: '#fdf8f2', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif", opacity: (saving || !draft.label || !draft.target_amount) ? 0.5 : 1 }}
            >{saving ? 'Saving…' : 'Save'}</button>
            <button onClick={() => setAdding(false)}
              style={{ background: 'none', color: 'rgba(253,248,242,0.55)', border: '1px solid rgba(196,168,130,0.15)', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif" }}
            >Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          style={{ fontSize: 12, fontWeight: 600, color: '#c4a882', background: 'none', border: '1px solid rgba(196,168,130,0.3)', borderRadius: 7, padding: '8px 16px', cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif", alignSelf: 'flex-start' }}
        >+ Add Goal</button>
      )}
    </div>
  )
}

function EditableValue({ value, colour, onCommit }: { value: number; colour: string; onCommit: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  function start() { setDraft(String(value)); setEditing(true); setTimeout(() => ref.current?.select(), 0) }
  function commit() {
    const n = parseFloat(draft.replace(/[^0-9.]/g, ''))
    if (!isNaN(n) && n >= 0) onCommit(Math.round(n))
    setEditing(false)
  }

  if (editing) return (
    <input ref={ref} type="text" value={draft} onChange={(e) => setDraft(e.target.value)}
      onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      style={{ width: 90, textAlign: 'right', fontSize: 13, fontWeight: 700, border: `1px solid ${colour}`, borderRadius: 6, padding: '2px 6px', outline: 'none', fontFamily: "'Cabinet Grotesk', sans-serif", color: '#fdf8f2', background: 'rgba(10,6,5,0.6)' }}
      autoFocus
    />
  )
  return (
    <button onClick={start} style={{ background: 'none', border: 'none', cursor: 'text', fontSize: 13, fontWeight: 700, color: colour, fontFamily: "'Cabinet Grotesk', sans-serif", borderBottom: `1px dashed ${colour}50` }}>
      {formatSGD(value)}
    </button>
  )
}

const input = {
  width: '100%', padding: '12px 16px',
  border: '1px solid rgba(196,168,130,0.15)',
  borderRadius: 10, fontSize: 14, color: '#fdf8f2',
  background: 'rgba(10,6,5,0.6)', outline: 'none',
  fontFamily: "'Cabinet Grotesk', sans-serif",
  boxSizing: 'border-box' as const,
  transition: 'border-color 0.15s',
}

const sgdInput = { ...input, paddingLeft: 44 }

const label = {
  display: 'block' as const,
  fontSize: 11, fontWeight: 600 as const,
  letterSpacing: '0.1em', textTransform: 'uppercase' as const,
  color: 'rgba(253,248,242,0.55)', marginBottom: 8,
  fontFamily: "'Cabinet Grotesk', sans-serif",
}

function Field({ labelText, hint, children }: { labelText: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={label}>{labelText}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.55)', margin: '5px 0 0', fontFamily: "'Cabinet Grotesk', sans-serif" }}>{hint}</p>}
    </div>
  )
}

function SGD({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'rgba(253,248,242,0.55)', fontWeight: 700, pointerEvents: 'none', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
        S$
      </span>
      <input
        type="number" min={0} value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '0'}
        style={sgdInput}
      />
    </div>
  )
}

export default function FinancialProfileForm({ userId, profile }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('income')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [form, setForm] = useState({
    monthly_income: String(profile?.monthly_income ?? ''),
    monthly_expenses: String(profile?.monthly_expenses ?? ''),
    num_dependents: String(profile?.num_dependents ?? '0'),
    liquid_savings: String(profile?.liquid_savings ?? ''),
    property_value: String(profile?.property_value ?? ''),
    property_liquid: profile?.property_liquid ?? false,
    cpf_oa: String(profile?.cpf_oa ?? ''),
    cpf_sa: String(profile?.cpf_sa ?? ''),
    cpf_ma: String(profile?.cpf_ma ?? ''),
    monthly_investment: String(profile?.monthly_investment ?? ''),
    portfolio_value: String(profile?.portfolio_value ?? ''),
    target_return_rate: String(profile?.target_return_rate ?? '0.06'),
    dividend_yield: String(profile?.dividend_yield ?? '0.04'),
    retirement_age: String(profile?.retirement_age ?? '65'),
    desired_monthly_income: String(profile?.desired_monthly_income ?? ''),
    inflation_rate: String(profile?.inflation_rate ?? '0.03'),
  })

  const saveToDb = useCallback(async (patch: Partial<typeof form>) => {
    setSaveStatus('saving')
    const supabase = createClient()
    const coerce = (v: string | undefined, isFloat = false) =>
      v !== undefined && v !== '' ? (isFloat ? parseFloat(v) : parseFloat(v)) : undefined

    const update: Record<string, unknown> = {}
    if (patch.monthly_income !== undefined) update.monthly_income = coerce(patch.monthly_income)
    if (patch.monthly_expenses !== undefined) update.monthly_expenses = coerce(patch.monthly_expenses)
    if (patch.num_dependents !== undefined) update.num_dependents = parseInt(patch.num_dependents ?? '0')
    if (patch.liquid_savings !== undefined) update.liquid_savings = coerce(patch.liquid_savings)
    if (patch.property_value !== undefined) update.property_value = coerce(patch.property_value)
    if (patch.property_liquid !== undefined) update.property_liquid = patch.property_liquid
    if (patch.cpf_oa !== undefined) update.cpf_oa = coerce(patch.cpf_oa)
    if (patch.cpf_sa !== undefined) update.cpf_sa = coerce(patch.cpf_sa)
    if (patch.cpf_ma !== undefined) update.cpf_ma = coerce(patch.cpf_ma)
    if (patch.monthly_investment !== undefined) update.monthly_investment = coerce(patch.monthly_investment)
    if (patch.portfolio_value !== undefined) update.portfolio_value = coerce(patch.portfolio_value)
    if (patch.target_return_rate !== undefined) update.target_return_rate = coerce(patch.target_return_rate, true)
    if (patch.dividend_yield !== undefined) update.dividend_yield = coerce(patch.dividend_yield, true)
    if (patch.retirement_age !== undefined) update.retirement_age = parseInt(patch.retirement_age ?? '65')
    if (patch.desired_monthly_income !== undefined) update.desired_monthly_income = coerce(patch.desired_monthly_income)
    if (patch.inflation_rate !== undefined) update.inflation_rate = coerce(patch.inflation_rate, true)
    update.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('client_profiles')
      .update(update)
      .eq('user_id', userId)

    setSaveStatus(error ? 'error' : 'saved')
    if (!error) setTimeout(() => setSaveStatus('idle'), 2000)
  }, [userId])

  function set(field: keyof typeof form, value: string | boolean) {
    const next = { ...form, [field]: value }
    setForm(next)

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveToDb({ [field]: value } as Partial<typeof form>)
    }, 500)
  }

  const surplus = form.monthly_income && form.monthly_expenses
    ? Number(form.monthly_income) - Number(form.monthly_expenses)
    : null

  const cpfTotal = (Number(form.cpf_oa) || 0) + (Number(form.cpf_sa) || 0) + (Number(form.cpf_ma) || 0)

  return (
    <div style={{ background: 'rgba(122,28,46,0.06)', border: '1px solid rgba(196,168,130,0.15)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(196,168,130,0.15)', background: 'rgba(10,6,5,0.5)', overflowX: 'auto' as const }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '14px 20px', fontSize: 13, fontWeight: 600,
              color: activeTab === tab.id ? '#c4a882' : 'rgba(253,248,242,0.55)',
              background: 'transparent', border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #9b2040' : '2px solid transparent',
              cursor: 'pointer', whiteSpace: 'nowrap' as const,
              fontFamily: "'Cabinet Grotesk', sans-serif",
              transition: 'color 0.15s',
            }}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
        {/* Save status */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', paddingRight: 20 }}>
          {saveStatus === 'saving' && <span style={{ fontSize: 12, color: 'rgba(253,248,242,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>Saving…</span>}
          {saveStatus === 'saved' && <span style={{ fontSize: 12, color: '#10b981', fontFamily: "'Cabinet Grotesk', sans-serif" }}>✓ Saved</span>}
          {saveStatus === 'error' && <span style={{ fontSize: 12, color: '#ef4444', fontFamily: "'Cabinet Grotesk', sans-serif" }}>Error saving</span>}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ padding: '36px 40px' }}>

        {/* Income & Expenses */}
        {activeTab === 'income' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="grid-2col" style={{ gap: 20 }}>
              <Field labelText="Monthly income" hint="Take-home pay after CPF deduction">
                <SGD value={form.monthly_income} onChange={(v) => set('monthly_income', v)} placeholder="8,000" />
              </Field>
              <Field labelText="Monthly expenses" hint="All regular outgoings">
                <SGD value={form.monthly_expenses} onChange={(v) => set('monthly_expenses', v)} placeholder="4,000" />
              </Field>
            </div>
            <Field labelText="Number of dependants">
              <input type="number" min={0} max={15} value={form.num_dependents} onChange={(e) => set('num_dependents', e.target.value)} style={input} />
            </Field>
            {surplus !== null && (
              <div style={{
                padding: '16px 20px', borderRadius: 10,
                background: surplus >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${surplus >= 0 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
              }}>
                <p style={{ fontSize: 14, color: '#fdf8f2', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  Monthly surplus: <strong style={{ color: surplus >= 0 ? '#10b981' : '#ef4444' }}>
                    {surplus >= 0 ? '+' : ''}S${surplus.toLocaleString()}
                  </strong>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Savings & Assets */}
        {activeTab === 'savings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Field labelText="Liquid savings" hint="Cash and investments accessible within 30 days">
              <SGD value={form.liquid_savings} onChange={(v) => set('liquid_savings', v)} placeholder="50,000" />
            </Field>
            <Field labelText="Property value" hint="Estimated current market value (0 if renting)">
              <SGD value={form.property_value} onChange={(v) => set('property_value', v)} placeholder="0" />
            </Field>
            <div>
              <label style={label}>Property status</label>
              <div className="grid-2col" style={{ gap: 12 }}>
                {[{ v: false, l: 'Not liquid' }, { v: true, l: 'Willing to liquidate' }].map(({ v, l }) => (
                  <button key={String(v)} type="button" onClick={() => set('property_liquid', v)}
                    style={{
                      padding: '11px 16px', borderRadius: 10, fontFamily: "'Cabinet Grotesk', sans-serif",
                      border: form.property_liquid === v ? '2px solid #9b2040' : '1px solid rgba(196,168,130,0.15)',
                      background: form.property_liquid === v ? 'rgba(155,32,64,0.15)' : 'rgba(10,6,5,0.4)',
                      color: form.property_liquid === v ? '#c4a882' : 'rgba(253,248,242,0.55)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>{l}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CPF */}
        {activeTab === 'cpf' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Field labelText="Ordinary Account (OA)" hint="Earns 2.5% p.a. — used for housing & investments">
              <SGD value={form.cpf_oa} onChange={(v) => set('cpf_oa', v)} placeholder="80,000" />
            </Field>
            <Field labelText="Special Account (SA)" hint="Earns 4% p.a. — locked for retirement">
              <SGD value={form.cpf_sa} onChange={(v) => set('cpf_sa', v)} placeholder="40,000" />
            </Field>
            <Field labelText="Medisave Account (MA)" hint="Earns 4% p.a. — medical expenses & MediShield Life premiums">
              <SGD value={form.cpf_ma} onChange={(v) => set('cpf_ma', v)} placeholder="20,000" />
            </Field>
            <div style={{ padding: '16px 20px', background: 'rgba(155,32,64,0.08)', border: '1px solid rgba(155,32,64,0.2)', borderRadius: 10 }}>
              <p style={{ fontSize: 14, color: '#fdf8f2', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Total CPF: <strong style={{ color: '#c4a882' }}>S${cpfTotal.toLocaleString()}</strong>
              </p>
            </div>
          </div>
        )}

        {/* Investments */}
        {activeTab === 'investments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Field labelText="Monthly investment amount" hint="Regular contributions to stocks, bonds, unit trusts">
              <SGD value={form.monthly_investment} onChange={(v) => set('monthly_investment', v)} placeholder="1,000" />
            </Field>
            <Field labelText="Current portfolio value">
              <SGD value={form.portfolio_value} onChange={(v) => set('portfolio_value', v)} placeholder="0" />
            </Field>
            <div className="grid-2col" style={{ gap: 20 }}>
              <Field labelText="Target annual return rate" hint="e.g. 0.06 for 6%">
                <input type="number" step={0.005} min={0.01} max={0.3} value={form.target_return_rate} onChange={(e) => set('target_return_rate', e.target.value)} style={input} />
              </Field>
              <Field labelText="Expected dividend yield" hint="e.g. 0.04 for 4%">
                <input type="number" step={0.005} min={0} max={0.15} value={form.dividend_yield} onChange={(e) => set('dividend_yield', e.target.value)} style={input} />
              </Field>
            </div>
          </div>
        )}

        {/* Retirement */}
        {activeTab === 'retirement' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Field labelText="Target retirement age">
              <input type="number" min={45} max={80} value={form.retirement_age} onChange={(e) => set('retirement_age', e.target.value)} style={input} />
            </Field>
            <Field labelText="Desired monthly income in retirement" hint="In today's dollars — we'll inflate this for you">
              <SGD value={form.desired_monthly_income} onChange={(v) => set('desired_monthly_income', v)} placeholder="5,000" />
            </Field>
            <Field labelText="Expected inflation rate" hint="Singapore avg ~3%. Enter as decimal: 0.03">
              <input type="number" step={0.005} min={0.01} max={0.1} value={form.inflation_rate} onChange={(e) => set('inflation_rate', e.target.value)} style={input} />
            </Field>
          </div>
        )}

        {/* Liabilities */}
        {activeTab === 'liabilities' && (
          <LiabilitiesTab userId={userId} />
        )}

        {/* Goals */}
        {activeTab === 'goals' && (
          <GoalsTab userId={userId} />
        )}

        {/* Net Worth */}
        {activeTab === 'networth' && (
          <NetWorthTab userId={userId} />
        )}

      </div>
    </div>
  )
}
