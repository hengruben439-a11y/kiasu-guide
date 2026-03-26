'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ActionType = 'observation' | 'action_needed' | 'decision' | 'waiting_on_client'

interface Note {
  id: string
  content: string
  note_type: string
  action_type: ActionType | null
  due_date: string | null
  completed_at: string | null
  created_at: string
}

interface Props {
  userId: string
  initialNotes: Note[]
}

const ACTION_LABELS: Record<ActionType, { label: string; color: string; icon: string }> = {
  observation: { label: 'Observation', color: '#6b7280', icon: '📝' },
  action_needed: { label: 'Action Needed', color: '#ef4444', icon: '🔴' },
  decision: { label: 'Decision', color: '#2563eb', icon: '⚖️' },
  waiting_on_client: { label: 'Waiting on Client', color: '#d97706', icon: '⏳' },
}

type FilterMode = 'all' | 'open' | 'completed'

export default function AdminClientNotes({ userId, initialNotes }: Props) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [content, setContent] = useState('')
  const [noteType, setNoteType] = useState<'admin_only' | 'client_visible'>('admin_only')
  const [actionType, setActionType] = useState<ActionType | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')

  async function addNote() {
    if (!content.trim()) return
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { data: me } = await supabase.auth.getUser()
    if (!me.user) { setSaving(false); return }

    const { data, error: err } = await supabase
      .from('case_notes')
      .insert({
        user_id: userId,
        author_id: me.user.id,
        content: content.trim(),
        note_type: noteType,
        action_type: actionType,
        due_date: dueDate || null,
      })
      .select('id, content, note_type, action_type, due_date, completed_at, created_at')
      .single()

    if (err) {
      setError('Could not save note.')
    } else {
      setNotes((prev) => [data, ...prev])
      setContent('')
      setActionType(null)
      setDueDate('')
    }
    setSaving(false)
  }

  async function toggleComplete(noteId: string, isCompleted: boolean) {
    const supabase = createClient()
    const { error: err } = await supabase
      .from('case_notes')
      .update({ completed_at: isCompleted ? null : new Date().toISOString() })
      .eq('id', noteId)

    if (!err) {
      setNotes(prev => prev.map(n =>
        n.id === noteId ? { ...n, completed_at: isCompleted ? null : new Date().toISOString() } : n
      ))
    }
  }

  const filtered = notes.filter(n => {
    if (filter === 'open') return n.action_type && !n.completed_at
    if (filter === 'completed') return !!n.completed_at
    return true
  })

  const openActions = notes.filter(n => n.action_type && !n.completed_at).length

  return (
    <div style={{ background: 'rgba(122,28,46,0.06)', border: '1px solid rgba(196,168,130,0.15)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(196,168,130,0.15)', background: 'rgba(10,6,5,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: '#fdf8f2', margin: 0 }}>
          Case Notes
          {openActions > 0 && (
            <span style={{
              marginLeft: 10, fontSize: 10, fontWeight: 700,
              padding: '2px 8px', borderRadius: 10,
              background: 'rgba(239,68,68,0.15)', color: '#ef4444',
            }}>
              {openActions} open
            </span>
          )}
        </h2>
        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 4 }}>
          {([
            { v: 'all' as FilterMode, l: 'All' },
            { v: 'open' as FilterMode, l: 'Open Actions' },
            { v: 'completed' as FilterMode, l: 'Completed' },
          ]).map(({ v, l }) => (
            <button key={v} onClick={() => setFilter(v)}
              style={{
                fontSize: 10, fontWeight: 600, padding: '4px 10px',
                borderRadius: 6, cursor: 'pointer',
                border: filter === v ? '1px solid rgba(196,168,130,0.3)' : '1px solid transparent',
                background: filter === v ? 'rgba(196,168,130,0.1)' : 'transparent',
                color: filter === v ? '#c4a882' : 'rgba(253,248,242,0.4)',
                fontFamily: "'Cabinet Grotesk', sans-serif",
              }}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* Add note */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(196,168,130,0.15)' }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note about this client…"
          rows={3}
          style={{
            width: '100%', padding: '12px 14px',
            border: '1px solid rgba(196,168,130,0.15)',
            borderRadius: 10, fontSize: 13, color: '#fdf8f2',
            fontFamily: "'Cabinet Grotesk', sans-serif",
            background: 'rgba(10,6,5,0.6)', outline: 'none', resize: 'none',
            boxSizing: 'border-box',
          }}
        />

        {/* Action type + due date row */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(196,168,130,0.6)', fontFamily: "'Cabinet Grotesk', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Type:
          </span>
          {(Object.entries(ACTION_LABELS) as [ActionType, typeof ACTION_LABELS[ActionType]][]).map(([key, { label, icon }]) => (
            <button key={key} onClick={() => setActionType(actionType === key ? null : key)}
              style={{
                fontSize: 11, fontWeight: 600, padding: '4px 10px',
                borderRadius: 7, cursor: 'pointer',
                border: actionType === key ? '1px solid rgba(196,168,130,0.3)' : '1px solid rgba(196,168,130,0.1)',
                background: actionType === key ? 'rgba(196,168,130,0.12)' : 'transparent',
                color: actionType === key ? '#c4a882' : 'rgba(253,248,242,0.4)',
                fontFamily: "'Cabinet Grotesk', sans-serif",
              }}
            >{icon} {label}</button>
          ))}

          {(actionType === 'action_needed' || actionType === 'waiting_on_client') && (
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                padding: '4px 10px', borderRadius: 7,
                border: '1px solid rgba(196,168,130,0.15)',
                background: 'rgba(10,6,5,0.6)', color: '#fdf8f2',
                fontSize: 11, fontFamily: "'Cabinet Grotesk', sans-serif",
                outline: 'none', marginLeft: 4,
              }}
            />
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {([
              { v: 'admin_only', l: 'Advisor only', colour: 'rgba(253,248,242,0.55)' },
              { v: 'client_visible', l: 'Visible to client', colour: '#9b2040' },
            ] as const).map(({ v, l, colour }) => (
              <button key={v} onClick={() => setNoteType(v)}
                style={{
                  fontSize: 12, fontWeight: 600, padding: '5px 12px',
                  borderRadius: 8, cursor: 'pointer',
                  border: noteType === v ? `1.5px solid ${colour}` : '1.5px solid rgba(196,168,130,0.15)',
                  background: noteType === v ? `${colour}22` : 'transparent',
                  color: noteType === v ? colour : 'rgba(253,248,242,0.55)',
                  fontFamily: "'Cabinet Grotesk', sans-serif",
                }}
              >{l}</button>
            ))}
          </div>
          <button
            onClick={addNote}
            disabled={saving || !content.trim()}
            style={{
              background: saving || !content.trim() ? 'rgba(196,168,130,0.2)' : '#9b2040',
              color: '#fdf8f2', border: 'none', borderRadius: 9,
              padding: '8px 18px', fontSize: 13, fontWeight: 600,
              cursor: saving || !content.trim() ? 'not-allowed' : 'pointer',
              fontFamily: "'Cabinet Grotesk', sans-serif",
            }}
          >
            {saving ? 'Saving…' : 'Save note'}
          </button>
        </div>
        {error && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 8, fontFamily: "'Cabinet Grotesk', sans-serif" }}>{error}</p>}
      </div>

      {/* Notes list */}
      <div>
        {filtered.length === 0 ? (
          <p style={{ padding: '24px', textAlign: 'center', fontSize: 14, color: 'rgba(253,248,242,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            {filter === 'all' ? 'No notes yet.' : filter === 'open' ? 'No open actions.' : 'No completed items.'}
          </p>
        ) : (
          filtered.map((note) => {
            const isCompleted = !!note.completed_at
            const actionMeta = note.action_type ? ACTION_LABELS[note.action_type] : null
            const isOverdue = note.due_date && !isCompleted && new Date(note.due_date) < new Date()

            return (
              <div key={note.id} style={{
                padding: '16px 24px',
                borderBottom: '1px solid rgba(196,168,130,0.04)',
                borderLeft: `3px solid ${note.note_type === 'client_visible' ? '#9b2040' : 'rgba(196,168,130,0.2)'}`,
                opacity: isCompleted ? 0.5 : 1,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: note.note_type === 'client_visible' ? '#c4a882' : 'rgba(253,248,242,0.55)',
                      fontFamily: "'Cabinet Grotesk', sans-serif",
                    }}>
                      {note.note_type === 'client_visible' ? 'Visible to client' : 'Advisor only'}
                    </span>
                    {actionMeta && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                        background: `${actionMeta.color}18`, color: actionMeta.color,
                        fontFamily: "'Cabinet Grotesk', sans-serif",
                      }}>
                        {actionMeta.icon} {actionMeta.label}
                      </span>
                    )}
                    {note.due_date && (
                      <span style={{
                        fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 5,
                        background: isOverdue ? 'rgba(239,68,68,0.12)' : 'rgba(196,168,130,0.08)',
                        color: isOverdue ? '#ef4444' : 'rgba(253,248,242,0.5)',
                        fontFamily: "'Cabinet Grotesk', sans-serif",
                      }}>
                        Due {new Date(note.due_date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'rgba(253,248,242,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                      {new Date(note.created_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {note.action_type && (
                      <button
                        onClick={() => toggleComplete(note.id, isCompleted)}
                        style={{
                          fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                          border: '1px solid rgba(196,168,130,0.15)', cursor: 'pointer',
                          background: isCompleted ? 'rgba(22,163,74,0.1)' : 'transparent',
                          color: isCompleted ? '#16a34a' : 'rgba(253,248,242,0.4)',
                          fontFamily: "'Cabinet Grotesk', sans-serif",
                        }}
                      >
                        {isCompleted ? '✓ Done' : 'Mark done'}
                      </button>
                    )}
                  </div>
                </div>
                <p style={{
                  fontSize: 13, color: '#fdf8f2', margin: 0, lineHeight: 1.6,
                  fontFamily: "'Cabinet Grotesk', sans-serif",
                  textDecoration: isCompleted ? 'line-through' : 'none',
                }}>
                  {note.content}
                </p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
