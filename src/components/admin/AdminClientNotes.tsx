'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Note {
  id: string
  content: string
  note_type: string
  created_at: string
}

interface Props {
  userId: string
  initialNotes: Note[]
}

export default function AdminClientNotes({ userId, initialNotes }: Props) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [content, setContent] = useState('')
  const [noteType, setNoteType] = useState<'admin_only' | 'client_visible'>('admin_only')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
      })
      .select('id, content, note_type, created_at')
      .single()

    if (err) {
      setError('Could not save note.')
    } else {
      setNotes((prev) => [data, ...prev])
      setContent('')
    }
    setSaving(false)
  }

  return (
    <div style={{ background: 'rgba(122,28,46,0.06)', border: '1px solid rgba(196,168,130,0.15)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(196,168,130,0.15)', background: 'rgba(10,6,5,0.5)' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: '#fdf8f2', margin: 0 }}>
          Case Notes
        </h2>
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
        {notes.length === 0 ? (
          <p style={{ padding: '24px', textAlign: 'center', fontSize: 14, color: 'rgba(253,248,242,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            No notes yet.
          </p>
        ) : (
          notes.map((note) => (
            <div key={note.id} style={{
              padding: '16px 24px',
              borderBottom: '1px solid rgba(196,168,130,0.04)',
              borderLeft: `3px solid ${note.note_type === 'client_visible' ? '#9b2040' : 'rgba(196,168,130,0.2)'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: note.note_type === 'client_visible' ? '#c4a882' : 'rgba(253,248,242,0.55)',
                  fontFamily: "'Cabinet Grotesk', sans-serif",
                }}>
                  {note.note_type === 'client_visible' ? 'Visible to client' : 'Advisor only'}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(253,248,242,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  {new Date(note.created_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#fdf8f2', margin: 0, lineHeight: 1.6, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                {note.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
