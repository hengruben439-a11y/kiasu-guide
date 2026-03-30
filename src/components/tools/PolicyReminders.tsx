'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Reminder {
  id: string
  user_id: string
  policy_name: string
  reminder_date: string
  note: string | null
  dismissed: boolean
  created_at: string
}

interface Props {
  userId: string
  initialReminders: Reminder[]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function urgencyColor(days: number): { bg: string; text: string; label: string } {
  if (days < 0) return { bg: 'rgba(220,38,38,0.08)', text: '#dc2626', label: 'Overdue' }
  if (days <= 30) return { bg: 'rgba(217,119,6,0.08)', text: '#d97706', label: `${days}d` }
  if (days <= 90) return { bg: 'rgba(196,168,130,0.12)', text: '#a89070', label: `${days}d` }
  return { bg: 'rgba(42,31,26,0.04)', text: '#a89070', label: `${days}d` }
}

const TODAY = new Date().toISOString().split('T')[0]

export default function PolicyReminders({ userId, initialReminders }: Props) {
  const supabase = createClient()
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({ policy_name: '', reminder_date: '', note: '' })
  const [formError, setFormError] = useState('')

  const active = reminders
    .filter((r) => !r.dismissed)
    .sort((a, b) => new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime())

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!form.policy_name.trim()) { setFormError('Policy name is required.'); return }
    if (!form.reminder_date) { setFormError('Reminder date is required.'); return }

    startTransition(async () => {
      const { data, error } = await supabase
        .from('policy_reminders')
        .insert({
          user_id: userId,
          policy_name: form.policy_name.trim(),
          reminder_date: form.reminder_date,
          note: form.note.trim() || null,
        })
        .select()
        .single<Reminder>()

      if (error) { setFormError(error.message); return }
      setReminders((prev) => [data, ...prev])
      setForm({ policy_name: '', reminder_date: '', note: '' })
      setShowForm(false)
    })
  }

  async function handleDismiss(id: string) {
    startTransition(async () => {
      await supabase.from('policy_reminders').update({ dismissed: true }).eq('id', id)
      setReminders((prev) => prev.map((r) => r.id === id ? { ...r, dismissed: true } : r))
    })
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      await supabase.from('policy_reminders').delete().eq('id', id)
      setReminders((prev) => prev.filter((r) => r.id !== id))
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid rgba(196,168,130,0.2)',
    borderRadius: 8, fontSize: 13, color: '#fdf8f2',
    background: 'rgba(10,6,5,0.6)', outline: 'none',
    fontFamily: "'Cabinet Grotesk', sans-serif",
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      background: 'rgba(122,28,46,0.06)',
      border: '1px solid rgba(196,168,130,0.15)',
      borderRadius: 14,
      padding: '24px 24px 20px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: '#c4a882',
            margin: '0 0 4px', fontFamily: "'Cabinet Grotesk', sans-serif",
          }}>
            Policy Reminders
          </p>
          <p style={{
            fontFamily: "'Playfair Display', serif", fontSize: 18,
            fontWeight: 700, color: '#fdf8f2', margin: 0,
          }}>
            Upcoming Renewals &amp; Reviews
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
            background: showForm ? 'rgba(122,28,46,0.08)' : '#9b2040',
            color: showForm ? '#c4a882' : '#fdf8f2',
            border: `1.5px solid ${showForm ? 'rgba(122,28,46,0.3)' : 'transparent'}`,
            fontSize: 13, fontWeight: 600,
            fontFamily: "'Cabinet Grotesk', sans-serif",
          }}
        >
          {showForm ? 'Cancel' : '+ Add Reminder'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} style={{
          background: 'rgba(196,168,130,0.08)',
          border: '1px solid rgba(196,168,130,0.2)',
          borderRadius: 10, padding: '16px 18px', marginBottom: 20,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#a89070', marginBottom: 5, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Policy / Event Name *
              </label>
              <input
                style={inputStyle}
                placeholder="e.g. Great Eastern ILP renewal"
                value={form.policy_name}
                onChange={(e) => setForm((p) => ({ ...p, policy_name: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#a89070', marginBottom: 5, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Reminder Date *
              </label>
              <input
                type="date"
                style={inputStyle}
                min={TODAY}
                value={form.reminder_date}
                onChange={(e) => setForm((p) => ({ ...p, reminder_date: e.target.value }))}
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#a89070', marginBottom: 5, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Note (optional)
            </label>
            <input
              style={inputStyle}
              placeholder="e.g. Review sum assured, check for gaps"
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            />
          </div>
          {formError && (
            <p style={{ fontSize: 12, color: '#dc2626', margin: '0 0 10px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              {formError}
            </p>
          )}
          <button
            type="submit"
            disabled={isPending}
            style={{
              padding: '9px 20px', borderRadius: 8, cursor: 'pointer',
              background: '#9b2040', color: '#fdf8f2',
              border: 'none', fontSize: 13, fontWeight: 600,
              fontFamily: "'Cabinet Grotesk', sans-serif",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? 'Saving…' : 'Save Reminder'}
          </button>
        </form>
      )}

      {/* Reminder list */}
      {active.length === 0 ? (
        <div style={{
          padding: '32px 20px', textAlign: 'center',
          border: '1px dashed rgba(196,168,130,0.15)', borderRadius: 10,
        }}>
          <p style={{ fontSize: 14, color: 'rgba(253,248,242,0.4)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            No upcoming reminders. Add one to track policy renewals.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {active.map((r) => {
            const days = daysUntil(r.reminder_date)
            const { bg, text, label } = urgencyColor(days)
            return (
              <div
                key={r.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 10,
                  background: bg,
                  border: `1px solid rgba(196,168,130,0.12)`,
                }}
              >
                {/* Date badge */}
                <div style={{
                  minWidth: 52, textAlign: 'center',
                  background: 'rgba(10,6,5,0.4)', border: `1.5px solid ${text}`,
                  borderRadius: 8, padding: '6px 4px',
                }}>
                  <p style={{ fontSize: 11, color: text, fontWeight: 700, margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif", lineHeight: 1 }}>
                    {label}
                  </p>
                  {days < 0 && <p style={{ fontSize: 9, color: text, margin: '2px 0 0', fontFamily: "'Cabinet Grotesk', sans-serif" }}>overdue</p>}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 14, fontWeight: 700, color: '#fdf8f2',
                    margin: '0 0 2px', fontFamily: "'Cabinet Grotesk', sans-serif",
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {r.policy_name}
                  </p>
                  <p style={{ fontSize: 12, color: '#a89070', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                    {formatDate(r.reminder_date)}
                    {r.note && <span style={{ marginLeft: 8 }}>· {r.note}</span>}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => handleDismiss(r.id)}
                    disabled={isPending}
                    title="Dismiss"
                    style={{
                      padding: '6px 12px', borderRadius: 7, cursor: 'pointer',
                      background: 'rgba(196,168,130,0.06)', color: '#a89070',
                      border: '1px solid rgba(196,168,130,0.15)',
                      fontSize: 12, fontWeight: 600,
                      fontFamily: "'Cabinet Grotesk', sans-serif",
                    }}
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={isPending}
                    title="Delete"
                    style={{
                      padding: '6px 10px', borderRadius: 7, cursor: 'pointer',
                      background: 'rgba(220,38,38,0.07)', color: '#dc2626',
                      border: '1px solid rgba(220,38,38,0.15)',
                      fontSize: 12, fontWeight: 600,
                      fontFamily: "'Cabinet Grotesk', sans-serif",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dismissed count */}
      {reminders.filter((r) => r.dismissed).length > 0 && (
        <p style={{
          fontSize: 12, color: '#a89070', margin: '14px 0 0',
          fontFamily: "'Cabinet Grotesk', sans-serif",
        }}>
          {reminders.filter((r) => r.dismissed).length} dismissed reminder{reminders.filter((r) => r.dismissed).length !== 1 ? 's' : ''} hidden.
        </p>
      )}
    </div>
  )
}
