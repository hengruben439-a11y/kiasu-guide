'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, useSpring } from 'framer-motion'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { createClient } from '@/lib/supabase/client'

interface Props {
  liquidSavings: number
  portfolioValue: number
  propertyValue: number
  propertyLiquid: boolean
  cpfOa: number
  cpfSa: number
  cpfMa: number
  totalLiabilities?: number
  userId: string
}

// ─── Count-up hook (Framer Motion useSpring — handles rapid updates gracefully) ─
function useCountUp(target: number) {
  const motionVal = useSpring(target, { stiffness: 60, damping: 18, mass: 0.8 })
  const [display, setDisplay] = useState(target)

  useEffect(() => { motionVal.set(target) }, [target, motionVal])
  useEffect(() => motionVal.on('change', (v) => setDisplay(Math.round(v))), [motionVal])

  return display
}

function formatSGD(v: number): string {
  return `S$${Math.round(v).toLocaleString('en-SG')}`
}

function formatShort(v: number): string {
  if (v >= 1_000_000) return `S$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `S$${(v / 1_000).toFixed(0)}K`
  return `S$${Math.round(v)}`
}

const PALETTE = ['#7a1c2e', '#c4a882', '#a89070', '#fdf8f2']
const MILESTONES = [100_000, 250_000, 500_000, 1_000_000]
const MILESTONE_LABELS = ['S$100K', 'S$250K', 'S$500K', 'S$1M']

export default function NetWorthTracker(props: Props) {
  const [liquidSavings] = useState(props.liquidSavings)
  const [portfolioValue] = useState(props.portfolioValue)
  const [propertyValue, setPropertyValue] = useState(props.propertyValue)
  const [propertyLiquid, setPropertyLiquid] = useState(props.propertyLiquid)
  const [propInput, setPropInput] = useState(String(props.propertyValue))
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const cpf = props.cpfOa + props.cpfSa + props.cpfMa
  const liabilities = props.totalLiabilities ?? 0
  const totalAssets = liquidSavings + portfolioValue + cpf + propertyValue
  const totalNetWorth = totalAssets - liabilities

  // Count-up for main headline
  const displayTotal = useCountUp(totalNetWorth)

  // ─── Asset segments ─────────────────────────────────────────────────────
  const segments = [
    { label: 'Liquid Savings', value: liquidSavings, color: PALETTE[0], icon: '🏦', liquid: true },
    { label: 'Investments', value: portfolioValue, color: PALETTE[1], icon: '📈', liquid: true },
    { label: 'CPF', value: cpf, color: PALETTE[2], icon: '🇸🇬', liquid: false, note: 'semi-liquid' },
    { label: 'Property', value: propertyValue, color: PALETTE[3], icon: '🏠', liquid: propertyLiquid },
  ].filter((s) => s.value > 0)

  const liquidTotal = segments
    .filter((s) => s.liquid || s.note === 'semi-liquid')
    .reduce((sum, s) => sum + s.value, 0)
  const illiquidTotal = propertyLiquid ? 0 : propertyValue

  // ─── Pie chart custom tooltip ────────────────────────────────────────────
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) => {
    if (!active || !payload?.length) return null
    const pct = totalNetWorth > 0 ? ((payload[0].value / totalNetWorth) * 100).toFixed(1) : '0'
    return (
      <div style={{
        background: 'rgba(10,6,5,0.95)', border: '1px solid rgba(196,168,130,0.3)',
        borderRadius: 10, padding: '10px 14px',
        fontFamily: "'Cabinet Grotesk', sans-serif",
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#fdf8f2', margin: '0 0 4px' }}>
          {payload[0].name}
        </p>
        <p style={{ fontSize: 13, color: payload[0].payload.color, fontWeight: 700, margin: '0 0 2px' }}>
          {formatSGD(payload[0].value)}
        </p>
        <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.55)', margin: 0 }}>{pct}% of total</p>
      </div>
    )
  }

  // ─── Save property to Supabase ──────────────────────────────────────────
  const saveProperty = useCallback(async () => {
    const parsed = Number(propInput.replace(/[^0-9.]/g, ''))
    if (isNaN(parsed)) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('client_profiles')
        .update({ property_value: parsed, property_liquid: propertyLiquid })
        .eq('user_id', props.userId)
      if (error) throw error
      setPropertyValue(parsed)
      setSaveMsg('Saved')
    } catch {
      setSaveMsg('Failed to save')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 3000)
    }
  }, [propInput, propertyLiquid, props.userId])

  // Save on property liquid toggle change too
  useEffect(() => {
    // Only save if propertyLiquid actually changed from the prop
    if (propertyLiquid !== props.propertyLiquid) {
      saveProperty()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyLiquid])

  const card = {
    background: 'rgba(122,28,46,0.06)',
    border: '1px solid rgba(196,168,130,0.15)',
    borderRadius: 14,
    backdropFilter: 'blur(12px)',
  } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Headline ──────────────────────────────────────────────────────── */}
      <div style={{ ...card, padding: '32px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 8px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Total Net Worth
          </p>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 700, color: '#fdf8f2', margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
            S${displayTotal.toLocaleString('en-SG')}
          </p>
          <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.55)', margin: '8px 0 0', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            {liabilities > 0
              ? <>{formatSGD(totalAssets)} assets − <span style={{ color: '#ef4444' }}>{formatSGD(liabilities)} liabilities</span></>
              : illiquidTotal > 0
                ? `Liquid: ${formatSGD(liquidTotal)} · Illiquid property: ${formatSGD(illiquidTotal)}`
                : `All assets are liquid or semi-liquid.`}
          </p>
        </div>

        {/* Milestone badges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          {MILESTONES.map((m, i) => {
            const unlocked = totalNetWorth >= m
            return (
              <div
                key={m}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 14px', borderRadius: 20,
                  border: `1.5px solid ${unlocked ? '#c4a882' : 'rgba(196,168,130,0.15)'}`,
                  background: unlocked ? 'rgba(196,168,130,0.12)' : 'transparent',
                  transition: 'all 0.3s',
                }}
              >
                <span style={{ fontSize: 13 }}>{unlocked ? '🥇' : '🔒'}</span>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: unlocked ? '#c4a882' : 'rgba(253,248,242,0.55)',
                  fontFamily: "'Cabinet Grotesk', sans-serif",
                }}>
                  {MILESTONE_LABELS[i]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step 1 — Asset Breakdown */}
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c4a882', margin: '4px 0 -6px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
        Step 1 · Asset Breakdown
      </p>

      {/* ── Liquid vs Illiquid ─────────────────────────────────────────────── */}
      <div className="grid-2col" style={{ gap: 14 }}>
        <div style={{ ...card, padding: '22px 24px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#16a34a', margin: '0 0 8px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Liquid Assets
          </p>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#fdf8f2', margin: '0 0 6px' }}>
            {formatSGD(liquidTotal)}
          </p>
          <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.55)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Savings + Investments
            {cpf > 0 && <> + CPF <span style={{ color: '#c4a882' }}>*</span></>}
          </p>
          {cpf > 0 && (
            <p style={{ fontSize: 11, color: '#c4a882', margin: '6px 0 0', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              * CPF is semi-liquid — accessible at 55
            </p>
          )}
        </div>

        <div style={{ ...card, padding: '22px 24px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#d97706', margin: '0 0 8px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Illiquid Assets
          </p>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#fdf8f2', margin: '0 0 6px' }}>
            {formatSGD(illiquidTotal)}
          </p>
          <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.55)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            {illiquidTotal > 0
              ? 'Property — cannot be liquidated quickly'
              : propertyValue > 0
                ? 'Property marked as liquid'
                : 'No illiquid assets recorded'}
          </p>
        </div>
      </div>

      {liabilities > 0 && (
        <div style={{ ...card, padding: '20px 24px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#ef4444', margin: '0 0 8px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Total Liabilities
          </p>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: '#ef4444', margin: '0 0 4px' }}>
            −{formatSGD(liabilities)}
          </p>
          <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.45)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Mortgages, loans, and other obligations. Update in Financial Profile.
          </p>
        </div>
      )}

      {/* Step 2 — Allocation */}
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c4a882', margin: '4px 0 -6px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
        Step 2 · Allocation
      </p>

      {/* ── Pie chart + breakdown ──────────────────────────────────────────── */}
      <div className="grid-sidebar" style={{ gap: 20 }}>

        {/* Pie */}
        <div style={{ ...card, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 16px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Asset Allocation
          </p>
          {segments.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={segments}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {segments.map((seg, i) => (
                    <Cell key={seg.label} fill={seg.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                No assets recorded yet
              </p>
            </div>
          )}

          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
            {segments.map((seg) => (
              <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", flex: 1 }}>
                  {seg.label}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(253,248,242,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  {totalNetWorth > 0 ? ((seg.value / totalNetWorth) * 100).toFixed(0) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Breakdown table */}
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(196,168,130,0.10)', background: 'rgba(122,28,46,0.08)' }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: '#fdf8f2', margin: 0 }}>
              Asset Breakdown
            </p>
          </div>
          <div style={{ padding: '8px 0' }}>
            {[
              { icon: '🏦', label: 'Liquid Savings', value: liquidSavings, color: PALETTE[0] },
              { icon: '📈', label: 'Investments', value: portfolioValue, color: PALETTE[1] },
              { icon: '🟣', label: 'CPF OA', value: props.cpfOa, color: PALETTE[2] },
              { icon: '🟣', label: 'CPF SA', value: props.cpfSa, color: PALETTE[2] },
              { icon: '🟣', label: 'CPF MA', value: props.cpfMa, color: PALETTE[2] },
              { icon: '🏠', label: 'Property', value: propertyValue, color: PALETTE[3] },
            ].filter((r) => r.value > 0).map((row, i) => {
              const pct = totalNetWorth > 0 ? ((row.value / totalNetWorth) * 100).toFixed(1) : '0'
              return (
                <div
                  key={row.label}
                  style={{
                    display: 'grid', gridTemplateColumns: '36px 1fr auto auto',
                    alignItems: 'center', gap: 12, padding: '12px 22px',
                    borderBottom: i < 5 ? '1px solid rgba(196,168,130,0.08)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{row.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                    {row.label}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fdf8f2', fontFamily: "'Playfair Display', serif" }}>
                    {formatSGD(row.value)}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                    background: `${row.color}20`,
                    color: row.color === '#fdf8f2' ? 'rgba(253,248,242,0.70)' : row.color,
                    fontFamily: "'Cabinet Grotesk', sans-serif",
                    minWidth: 44, textAlign: 'center',
                  }}>
                    {pct}%
                  </span>
                </div>
              )
            })}

            {/* Total row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '36px 1fr auto auto',
              alignItems: 'center', gap: 12, padding: '14px 22px',
              borderTop: '2px solid rgba(196,168,130,0.15)',
              background: 'rgba(122,28,46,0.08)',
            }}>
              <span style={{ fontSize: 18 }}>Σ</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Total Net Worth
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#9b2040', fontFamily: "'Playfair Display', serif" }}>
                {formatSGD(totalNetWorth)}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(253,248,242,0.55)', fontFamily: "'Cabinet Grotesk', sans-serif", textAlign: 'center' }}>
                100%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3 — Update Your Figures */}
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c4a882', margin: '4px 0 -6px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
        Step 3 · Update Your Figures
      </p>

      {/* ── Editable property value ──────────────────────────────────────── */}
      <div style={{ ...card, padding: '24px 28px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 16px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Update Property Value
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1.5px solid rgba(196,168,130,0.15)', borderRadius: 10, overflow: 'hidden', flex: '1 1 220px', maxWidth: 340 }}>
            <span style={{ padding: '12px 14px', background: 'rgba(122,28,46,0.10)', fontSize: 13, fontWeight: 700, color: 'rgba(253,248,242,0.55)', borderRight: '1px solid rgba(196,168,130,0.12)', fontFamily: "'Cabinet Grotesk', sans-serif", whiteSpace: 'nowrap' }}>
              S$
            </span>
            <input
              type="text"
              value={propInput}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '')
                setPropInput(raw ? Number(raw).toLocaleString('en-SG') : '')
              }}
              onBlur={saveProperty}
              placeholder="e.g. 750,000"
              style={{
                border: 'none', outline: 'none', padding: '12px 14px',
                fontSize: 14, fontWeight: 600, color: '#fdf8f2', width: '100%',
                fontFamily: "'Cabinet Grotesk', sans-serif", background: 'rgba(122,28,46,0.06)',
              }}
            />
          </div>

          {/* Liquidity toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setPropertyLiquid((v) => !v)}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: propertyLiquid ? '#16a34a' : 'rgba(196,168,130,0.15)',
                border: 'none', cursor: 'pointer',
                position: 'relative', transition: 'background 0.25s', flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 3, left: propertyLiquid ? 23 : 3,
                width: 18, height: 18, borderRadius: 9, background: '#fdf8f2',
                transition: 'left 0.25s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }} />
            </button>
            <span style={{ fontSize: 13, color: '#fdf8f2', fontFamily: "'Cabinet Grotesk', sans-serif", userSelect: 'none' }}>
              Mark as liquid
            </span>
          </div>

          {saveMsg && (
            <span style={{
              fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8,
              background: saveMsg === 'Saved' ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
              color: saveMsg === 'Saved' ? '#16a34a' : '#dc2626',
              fontFamily: "'Cabinet Grotesk', sans-serif",
            }}>
              {saving ? 'Saving…' : saveMsg}
            </span>
          )}
        </div>
        <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.55)', margin: '10px 0 0', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Changes are saved automatically on blur. Toggle "liquid" if you intend to sell or have already sold.
        </p>
      </div>

    </div>
  )
}
