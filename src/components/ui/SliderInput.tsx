'use client'

import { useState, useRef } from 'react'

interface Props {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  parse?: (s: string) => number
  onChange: (v: number) => void
  tooltip?: string
  color?: string
  unit?: string
  /** If true, renders a display badge only (no slider). Used for tri-lock solved fields. */
  solved?: boolean
}

export default function SliderInput({
  label, value, min, max, step, format, parse, onChange, tooltip,
  color = '#9b2040', unit, solved = false,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [showTip, setShowTip] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    if (solved) return
    setDraft(String(value))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commitEdit() {
    const parsed = parse ? parse(draft) : parseFloat(draft.replace(/[^0-9.-]/g, ''))
    if (!isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed))
      onChange(clamped)
    }
    setEditing(false)
  }

  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0

  return (
    <div style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        {/* Label + tooltip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(253,248,242,0.70)' }}>{label}</span>
          {tooltip && (
            <span
              style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
              onMouseEnter={() => setShowTip(true)}
              onMouseLeave={() => setShowTip(false)}
              onClick={() => setShowTip(v => !v)}
            >
              <span style={{
                width: 15, height: 15, borderRadius: '50%',
                background: 'rgba(155,32,64,0.15)',
                color: 'rgba(196,168,130,0.6)',
                fontSize: 9, fontWeight: 800, cursor: 'help',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(155,32,64,0.25)',
                flexShrink: 0,
              }}>?</span>
              {showTip && (
                <div style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 10px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(10,6,5,0.97)',
                  border: '1px solid rgba(196,168,130,0.2)',
                  color: '#fdf8f2',
                  padding: '10px 14px',
                  borderRadius: 10,
                  fontSize: 11,
                  lineHeight: 1.65,
                  width: 240,
                  zIndex: 9999,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  fontWeight: 400,
                  pointerEvents: 'none',
                  whiteSpace: 'normal',
                }}>
                  {tooltip}
                  <div style={{
                    position: 'absolute', top: '100%', left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0, height: 0,
                    borderLeft: '7px solid transparent',
                    borderRight: '7px solid transparent',
                    borderTop: '7px solid rgba(10,6,5,0.97)',
                  }} />
                </div>
              )}
            </span>
          )}
        </div>

        {/* Value badge */}
        {solved ? (
          /* Solved field — glowing display only */
          <div style={{
            background: 'rgba(155,32,64,0.15)',
            border: '1px solid rgba(155,32,64,0.4)',
            borderRadius: 6, padding: '3px 10px',
            fontSize: 12, fontWeight: 700, color: '#fdf8f2',
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}>
            {format(value)}{unit ? ` ${unit}` : ''}
          </div>
        ) : editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditing(false)
            }}
            style={{
              width: 90, padding: '2px 8px', borderRadius: 6,
              border: `1.5px solid ${color}`,
              background: 'rgba(10,6,5,0.8)',
              fontSize: 12, fontWeight: 700, color: '#fdf8f2',
              textAlign: 'right',
              fontFamily: "'Cabinet Grotesk', sans-serif",
              outline: 'none',
            }}
          />
        ) : (
          <button
            onClick={startEdit}
            title="Click to type a value"
            style={{
              background: 'rgba(155,32,64,0.12)',
              border: '1px solid rgba(155,32,64,0.25)',
              borderRadius: 6, padding: '2px 10px',
              fontSize: 12, fontWeight: 700, color: '#fdf8f2',
              cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif",
              transition: 'border-color 0.15s',
            }}
          >
            {format(value)}{unit ? ` ${unit}` : ''}
          </button>
        )}
      </div>

      {/* Track */}
      {!solved && (
        <>
          <div style={{ position: 'relative', height: 5, borderRadius: 3, background: 'rgba(253,248,242,0.08)', marginBottom: 2 }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, height: '100%',
              width: `${pct}%`, borderRadius: 3,
              background: `linear-gradient(90deg, ${color}66, ${color})`,
              transition: 'width 0.05s',
            }} />
            <input
              type="range"
              min={min} max={max} step={step}
              value={value}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                opacity: 0, cursor: 'pointer', margin: 0,
              }}
            />
            {/* Thumb */}
            <div style={{
              position: 'absolute', top: '50%', left: `${pct}%`,
              transform: 'translate(-50%, -50%)',
              width: 13, height: 13, borderRadius: '50%',
              background: '#0a0605', border: `2.5px solid ${color}`,
              boxShadow: `0 0 8px ${color}66`,
              pointerEvents: 'none', transition: 'left 0.05s',
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
            <span style={{ fontSize: 9, color: 'rgba(196,168,130,0.4)' }}>{format(min)}</span>
            <span style={{ fontSize: 9, color: 'rgba(196,168,130,0.4)' }}>{format(max)}</span>
          </div>
        </>
      )}
    </div>
  )
}
