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
}

export default function SliderInput({
  label, value, min, max, step, format, parse, onChange, tooltip, color = '#7a1c2e', unit,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [showTip, setShowTip] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
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
  const colorRGB = color === '#7a1c2e' ? '122,28,46' : color === '#16a34a' ? '22,163,74' : '196,168,130'

  return (
    <div style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6b5c52' }}>{label}</span>
          {tooltip && (
            <span
              style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
              onMouseEnter={() => setShowTip(true)}
              onMouseLeave={() => setShowTip(false)}
              onClick={() => setShowTip(v => !v)}
            >
              <span style={{
                width: 16, height: 16, borderRadius: '50%',
                background: `rgba(${colorRGB},0.12)`,
                color: '#a89070',
                fontSize: 9, fontWeight: 800, cursor: 'help',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid rgba(${colorRGB},0.2)`,
                flexShrink: 0,
              }}>?</span>
              {showTip && (
                <div style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 10px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#2a1f1a',
                  color: '#fdf8f2',
                  padding: '10px 14px',
                  borderRadius: 10,
                  fontSize: 11,
                  lineHeight: 1.65,
                  width: 240,
                  zIndex: 9999,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                  fontFamily: "'Cabinet Grotesk', sans-serif",
                  fontWeight: 400,
                  pointerEvents: 'none',
                  whiteSpace: 'normal',
                }}>
                  {tooltip}
                  {/* Arrow */}
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0, height: 0,
                    borderLeft: '7px solid transparent',
                    borderRight: '7px solid transparent',
                    borderTop: '7px solid #2a1f1a',
                  }} />
                </div>
              )}
            </span>
          )}
        </div>

        {/* Editable value badge */}
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false) }}
            style={{
              width: 90, padding: '2px 8px', borderRadius: 6,
              border: `1.5px solid ${color}`, fontSize: 12,
              fontWeight: 700, color: '#2a1f1a', textAlign: 'right',
              fontFamily: "'Cabinet Grotesk', sans-serif", outline: 'none',
            }}
          />
        ) : (
          <button
            onClick={startEdit}
            title="Click to type a value"
            style={{
              background: `rgba(${colorRGB},0.08)`,
              border: `1px solid rgba(${colorRGB},0.2)`,
              borderRadius: 6, padding: '2px 10px',
              fontSize: 12, fontWeight: 700, color: '#2a1f1a',
              cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif",
            }}
          >
            {format(value)}{unit ? ` ${unit}` : ''}
          </button>
        )}
      </div>

      {/* Custom styled range */}
      <div style={{ position: 'relative', height: 6, borderRadius: 3, background: 'rgba(42,31,26,0.08)', marginBottom: 2 }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          width: `${pct}%`, borderRadius: 3,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
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
        <div style={{
          position: 'absolute', top: '50%', left: `${pct}%`,
          transform: 'translate(-50%, -50%)',
          width: 14, height: 14, borderRadius: '50%',
          background: '#fff', border: `2.5px solid ${color}`,
          boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          pointerEvents: 'none', transition: 'left 0.05s',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontSize: 10, color: '#c4a882' }}>{format(min)}</span>
        <span style={{ fontSize: 10, color: '#c4a882' }}>{format(max)}</span>
      </div>
    </div>
  )
}
