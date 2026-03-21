'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  currentStatus: string
}

const statusColour: Record<string, { bg: string; text: string; border: string }> = {
  prospect:   { bg: 'rgba(196,168,130,0.15)', text: '#a89070', border: 'rgba(196,168,130,0.3)' },
  active:     { bg: 'rgba(122,28,46,0.08)',   text: '#7a1c2e', border: 'rgba(122,28,46,0.25)' },
  review_due: { bg: 'rgba(234,179,8,0.1)',    text: '#92400e', border: 'rgba(234,179,8,0.3)'  },
  inactive:   { bg: 'rgba(42,31,26,0.07)',    text: '#a89070', border: 'rgba(42,31,26,0.15)'  },
}

const statusOptions = [
  { value: 'prospect',   label: 'Prospect'   },
  { value: 'active',     label: 'Active'     },
  { value: 'review_due', label: 'Review Due' },
  { value: 'inactive',   label: 'Inactive'   },
]

export default function PipelineStatusSelect({ userId, currentStatus }: Props) {
  const [status, setStatus] = useState(currentStatus)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const colours = statusColour[status] ?? statusColour.prospect

  async function handleChange(newValue: string) {
    setSaving(true)
    setStatus(newValue)

    const supabase = createClient()
    await supabase
      .from('client_profiles')
      .update({ pipeline_status: newValue })
      .eq('user_id', userId)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <select
        value={status}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        style={{
          padding: '6px 28px 6px 12px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "'Cabinet Grotesk', sans-serif",
          background: colours.bg,
          color: colours.text,
          border: `1.5px solid ${colours.border}`,
          cursor: 'pointer',
          appearance: 'none',
          WebkitAppearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='${encodeURIComponent(colours.text)}' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
          outline: 'none',
          textTransform: 'capitalize',
          opacity: saving ? 0.6 : 1,
          transition: 'opacity 0.2s, background 0.2s, color 0.2s',
        }}
      >
        {statusOptions.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {saved && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#7a1c2e',
            fontFamily: "'Cabinet Grotesk', sans-serif",
            animation: 'fadeOut 1.5s ease forwards',
          }}
        >
          Saved ✓
        </span>
      )}

      <style>{`
        @keyframes fadeOut {
          0%   { opacity: 1; }
          60%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
