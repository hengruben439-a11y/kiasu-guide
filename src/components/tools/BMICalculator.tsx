'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  initialHeight: number | null
  initialWeight: number | null
  userId: string
}

type Category = 'underweight' | 'normal' | 'overweight' | 'obese'

interface BMIResult {
  bmi: number
  category: Category
  label: string
  colour: string
  bg: string
  advice: string
}

// Asian BMI standards (MOH Singapore)
function classifyBMI(bmi: number): BMIResult {
  if (bmi < 18.5) return {
    bmi, category: 'underweight', label: 'Underweight',
    colour: '#3b82f6', bg: 'rgba(59,130,246,0.08)',
    advice: 'Consider increasing caloric intake with nutrient-dense foods. Consult a dietitian if persistent.',
  }
  if (bmi < 23) return {
    bmi, category: 'normal', label: 'Normal',
    colour: '#16a34a', bg: 'rgba(34,197,94,0.08)',
    advice: 'Your weight is in the healthy range for Asians. Maintain your current lifestyle.',
  }
  if (bmi < 27.5) return {
    bmi, category: 'overweight', label: 'Overweight',
    colour: '#d97706', bg: 'rgba(234,179,8,0.08)',
    advice: 'Increased risk of metabolic conditions. Regular exercise and dietary adjustment recommended.',
  }
  return {
    bmi, category: 'obese', label: 'Obese',
    colour: '#dc2626', bg: 'rgba(239,68,68,0.08)',
    advice: 'Higher risk of diabetes, hypertension, and cardiovascular disease. Medical consultation advised.',
  }
}

const BMI_SCALE: { from: number; to: number; label: string; colour: string }[] = [
  { from: 0, to: 18.5, label: 'Underweight', colour: '#3b82f6' },
  { from: 18.5, to: 23, label: 'Normal', colour: '#16a34a' },
  { from: 23, to: 27.5, label: 'Overweight', colour: '#d97706' },
  { from: 27.5, to: 40, label: 'Obese', colour: '#dc2626' },
]

export default function BMICalculator({ initialHeight, initialWeight, userId }: Props) {
  const [height, setHeight] = useState(String(initialHeight ?? ''))
  const [weight, setWeight] = useState(String(initialWeight ?? ''))
  const [saving, setSaving] = useState(false)

  const h = parseFloat(height)
  const w = parseFloat(weight)
  const valid = h > 0 && w > 0
  const result = valid ? classifyBMI(w / Math.pow(h / 100, 2)) : null

  const inputStyle = {
    width: '100%', padding: '14px 16px',
    border: '1.5px solid rgba(196,168,130,0.15)',
    borderRadius: 10, fontSize: 16, color: '#fdf8f2',
    background: 'rgba(122,28,46,0.06)', outline: 'none',
    fontFamily: "'Cabinet Grotesk', sans-serif",
    boxSizing: 'border-box' as const,
  }

  async function saveToProfile() {
    if (!valid) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('client_profiles').update({ height_cm: h, weight_kg: w }).eq('user_id', userId)
    setSaving(false)
  }

  // BMI needle position (scale: 10 to 40)
  const needlePct = result ? Math.min(100, Math.max(0, ((result.bmi - 10) / 30) * 100)) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: 'rgba(122,28,46,0.06)', border: '1px solid rgba(196,168,130,0.15)', borderRadius: 14, padding: '28px', backdropFilter: 'blur(12px)' }}>
        <div className="grid-2col" style={{ gap: 20, marginBottom: 24 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(253,248,242,0.55)', marginBottom: 8, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Height (cm)
            </label>
            <input
              type="number" min={100} max={220}
              value={height} onChange={(e) => setHeight(e.target.value)}
              placeholder="170"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(253,248,242,0.55)', marginBottom: 8, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Weight (kg)
            </label>
            <input
              type="number" min={30} max={250}
              value={weight} onChange={(e) => setWeight(e.target.value)}
              placeholder="65"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Save button */}
        {valid && (
          <button
            onClick={saveToProfile}
            disabled={saving}
            style={{
              fontSize: 12, fontWeight: 600, padding: '8px 18px',
              borderRadius: 8, border: '1.5px solid rgba(196,168,130,0.15)',
              background: 'rgba(122,28,46,0.06)', color: 'rgba(253,248,242,0.55)', cursor: 'pointer',
              fontFamily: "'Cabinet Grotesk', sans-serif",
            }}
          >
            {saving ? 'Saving…' : 'Save to profile'}
          </button>
        )}
      </div>

      {result && (
        <>
          {/* Result card */}
          <div style={{
            background: result.bg,
            border: `1.5px solid ${result.colour}40`,
            borderRadius: 14, padding: '28px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(253,248,242,0.55)', margin: '0 0 6px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  Your BMI
                </p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 700, color: result.colour, margin: 0, lineHeight: 1 }}>
                  {result.bmi.toFixed(1)}
                </p>
              </div>
              <div style={{
                padding: '8px 16px', borderRadius: 20,
                background: result.colour + '25',
                color: result.colour, fontSize: 14, fontWeight: 700,
                fontFamily: "'Cabinet Grotesk', sans-serif",
                alignSelf: 'center',
              }}>
                {result.label}
              </div>
            </div>
            <p style={{ fontSize: 14, color: '#fdf8f2', lineHeight: 1.7, margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              {result.advice}
            </p>
          </div>

          {/* BMI scale */}
          <div style={{ background: 'rgba(122,28,46,0.06)', border: '1px solid rgba(196,168,130,0.15)', borderRadius: 14, padding: '24px 28px', backdropFilter: 'blur(12px)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(253,248,242,0.55)', margin: '0 0 16px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Asian BMI Scale (MOH Singapore)
            </p>
            <div style={{ position: 'relative', height: 12, borderRadius: 6, overflow: 'visible', marginBottom: 8, display: 'flex' }}>
              {BMI_SCALE.map((seg) => (
                <div key={seg.label} style={{
                  flex: (seg.to - seg.from),
                  background: seg.colour,
                  opacity: 0.35,
                }} />
              ))}
              {/* Needle */}
              {needlePct !== null && (
                <div style={{
                  position: 'absolute',
                  left: `${needlePct}%`,
                  top: -4, transform: 'translateX(-50%)',
                  width: 4, height: 20,
                  background: result.colour,
                  borderRadius: 2,
                }} />
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {BMI_SCALE.map((seg) => (
                <div key={seg.label} style={{ textAlign: 'center', flex: 1 }}>
                  <p style={{ fontSize: 10, color: seg.colour, fontWeight: 700, margin: '4px 0 0', fontFamily: "'Cabinet Grotesk', sans-serif" }}>{seg.label}</p>
                  <p style={{ fontSize: 10, color: 'rgba(253,248,242,0.55)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>&lt;{seg.to}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Insurance context */}
          <div style={{ background: 'rgba(122,28,46,0.08)', border: '1px solid rgba(155,32,64,0.25)', borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ fontSize: 12, color: '#9b2040', fontWeight: 700, margin: '0 0 4px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Insurance Context
            </p>
            <p style={{ fontSize: 13, color: '#fdf8f2', margin: 0, lineHeight: 1.6, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              {result.category === 'normal'
                ? 'Standard insurance premiums apply. No loading expected for BMI-related conditions.'
                : result.category === 'overweight'
                ? 'Some insurers may apply a premium loading. Disclosure required on health forms.'
                : result.category === 'obese'
                ? 'Possible premium loading or exclusions for cardiovascular and metabolic conditions. Consult your advisor.'
                : 'Underweight may affect certain life and critical illness applications. Discuss with your advisor.'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
