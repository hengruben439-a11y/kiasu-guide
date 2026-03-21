'use client'

import { useState } from 'react'

interface Props {
  clientName: string
}

type Plan = 'MPCI_II' | 'Legacy'
type Severity = 'Early' | 'Intermediate' | 'Severe'
type Group = 'Cancer' | 'Heart' | 'Stroke' | 'Kidney' | 'Other'

interface Claim {
  id: string
  group: Group
  condition: string
  severity: Severity
  year: number
}

interface ClaimResult {
  claim: Claim
  payout: number
  note: string
  premiumWaived: boolean
  runningTotal: number
  recurrent: boolean
}

const CONDITIONS: Record<Group, Record<Severity, string[]>> = {
  Cancer: {
    Early: ['Carcinoma in situ', 'Ductal carcinoma in situ', 'Early thyroid cancer', 'Stage 1 prostate cancer'],
    Intermediate: ['Stage 2 breast cancer', 'Stage 2 colorectal cancer', 'Stage 2 lung cancer'],
    Severe: ['Stage 3+ cancer', 'Metastatic cancer', 'Inoperable cancer'],
  },
  Heart: {
    Early: ['Coronary artery disease (mild)', 'Valvular heart disease (mild)'],
    Intermediate: ['Heart attack (NSTEMI)', 'Bypass surgery'],
    Severe: ['Heart attack (STEMI)', 'Multiple vessel disease', 'Heart failure (severe)'],
  },
  Stroke: {
    Early: ['Minor stroke with no permanent deficit'],
    Intermediate: ['Stroke with moderate deficit'],
    Severe: ['Severe stroke with permanent neurological damage'],
  },
  Kidney: {
    Early: ['Chronic kidney disease Stage 3'],
    Intermediate: ['Chronic kidney disease Stage 4'],
    Severe: ['End-stage kidney failure', 'Dialysis required'],
  },
  Other: {
    Early: ['Rheumatoid arthritis', 'Lupus', 'Multiple sclerosis (mild)'],
    Intermediate: ['Blindness', 'Deafness', 'Major burns (20–30%)'],
    Severe: ['Total permanent disability', 'Major burns (>30%)', 'Coma'],
  },
}

function computePayouts(claims: Claim[], sa: number, plan: Plan): ClaimResult[] {
  const results: ClaimResult[] = []
  let runningTotal = 0
  let ciPerGroup: Record<Group, number> = { Cancer: 0, Heart: 0, Stroke: 0, Kidney: 0, Other: 0 }
  let totalCIPaid = 0
  let premiumWaived = false
  let acoUsed = false
  const maxCI = sa * 6
  const recurrentMax = sa * 3

  for (const claim of claims) {
    const { group, severity, year } = claim
    let payout = 0
    let note = ''
    let isRecurrent = false

    // Check if CI is exhausted and this could be a recurrent claim
    const ciExhausted = totalCIPaid >= maxCI
    isRecurrent = ciExhausted

    if (isRecurrent && totalCIPaid - maxCI < recurrentMax) {
      // Recurrent CI
      const recurrentPaid = totalCIPaid - maxCI
      const remaining = recurrentMax - recurrentPaid
      const claim_recurrent = Math.min(sa * 1.5, remaining)

      // Check cooldown (simplified: check previous recurrent claim year)
      const lastRecurrent = [...results].reverse().find((r) => r.recurrent)
      const cooldownOk = !lastRecurrent || (year - lastRecurrent.claim.year) >= 2

      if (cooldownOk && claim_recurrent > 0) {
        payout = claim_recurrent
        note = `Recurrent CI claim — S$${payout.toLocaleString()}`
      } else {
        payout = 0
        note = cooldownOk ? 'Recurrent CI cap reached' : 'Within 2-year cooldown period'
      }
    } else if (!ciExhausted) {
      // Standard CI
      const priorSameGroup = ciPerGroup[group]
      if (severity === 'Early') {
        payout = Math.min(sa, maxCI - totalCIPaid)
        note = `Early CI — S$${sa.toLocaleString()}`
      } else if (severity === 'Intermediate') {
        const base = sa - priorSameGroup
        payout = Math.max(0, Math.min(base, maxCI - totalCIPaid))
        note = payout === 0
          ? 'Prior early CI in same group — no additional payout'
          : `Intermediate CI — S$${sa.toLocaleString()} – prior S$${priorSameGroup.toLocaleString()} = S$${payout.toLocaleString()}`
      } else if (severity === 'Severe') {
        const base = sa * 3 - priorSameGroup
        payout = Math.max(0, Math.min(base, maxCI - totalCIPaid))
        note = payout === 0
          ? 'Prior claims in same group exceed severe CI limit'
          : `Severe CI — 300% SA (S$${(sa * 3).toLocaleString()}) – prior S$${priorSameGroup.toLocaleString()} = S$${payout.toLocaleString()}`
      }

      if (payout > 0) {
        ciPerGroup[group] = (ciPerGroup[group] || 0) + payout
        totalCIPaid += payout
        if (!premiumWaived && totalCIPaid >= sa * 3) {
          premiumWaived = true
          note += ' | Premium waived from this point'
        }
      }
    } else {
      payout = 0
      note = 'Maximum CI benefit reached'
    }

    runningTotal += payout

    results.push({
      claim,
      payout,
      note,
      premiumWaived: premiumWaived && payout > 0,
      runningTotal,
      recurrent: isRecurrent,
    })
  }

  return results
}

const GROUPS: Group[] = ['Cancer', 'Heart', 'Stroke', 'Kidney', 'Other']
const SEVERITIES: Severity[] = ['Early', 'Intermediate', 'Severe']

const severityColour: Record<Severity, string> = {
  Early: '#a89070',
  Intermediate: '#7a1c2e',
  Severe: '#1a0a0e',
}

const severityBg: Record<Severity, string> = {
  Early: 'rgba(196,168,130,0.1)',
  Intermediate: 'rgba(122,28,46,0.08)',
  Severe: 'rgba(26,10,14,0.07)',
}

export default function MPCIBuilder({ clientName }: Props) {
  const [sa, setSa] = useState('500000')
  const [plan, setPlan] = useState<Plan>('MPCI_II')
  const [clientView, setClientView] = useState(false)
  const [claims, setClaims] = useState<Claim[]>([])

  // New claim form state
  const [newGroup, setNewGroup] = useState<Group>('Cancer')
  const [newCondition, setNewCondition] = useState(CONDITIONS.Cancer.Early[0])
  const [newSeverity, setNewSeverity] = useState<Severity>('Early')
  const [newYear, setNewYear] = useState(1)

  const saNum = parseFloat(sa) || 0
  const results = computePayouts(claims, saNum, plan)
  const totalPaid = results.reduce((s, r) => s + r.payout, 0)
  const maxCI = saNum * 6

  function addClaim() {
    setClaims((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        group: newGroup,
        condition: newCondition,
        severity: newSeverity,
        year: newYear,
      },
    ])
    setNewYear((y) => y + 1)
  }

  function removeClaim(id: string) {
    setClaims((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>

      {/* LEFT — Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* SA + Plan */}
        <div style={{ background: '#fff', border: '1px solid rgba(42,31,26,0.07)', borderRadius: 14, padding: '24px' }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a89070', display: 'block', marginBottom: 8, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Sum Assured (SA)
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#a89070', fontWeight: 700, fontFamily: "'Cabinet Grotesk', sans-serif" }}>S$</span>
              <input
                type="number" min={0} step={50000}
                value={sa} onChange={(e) => setSa(e.target.value)}
                style={{ width: '100%', padding: '11px 14px 11px 42px', border: '1.5px solid rgba(42,31,26,0.13)', borderRadius: 10, fontSize: 15, color: '#2a1f1a', fontWeight: 700, background: '#fff', outline: 'none', fontFamily: "'Cabinet Grotesk', sans-serif", boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a89070', display: 'block', marginBottom: 8, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Plan
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([['MPCI_II', 'MPCI II', 'ACO = 75% SA'], ['Legacy', 'Legacy', 'ACO = 100% SA']] as const).map(([v, label, sub]) => (
                <button key={v} onClick={() => setPlan(v as Plan)}
                  style={{
                    padding: '10px', borderRadius: 9,
                    border: plan === v ? '2px solid #7a1c2e' : '1.5px solid rgba(42,31,26,0.13)',
                    background: plan === v ? 'rgba(122,28,46,0.06)' : '#fff',
                    cursor: 'pointer', textAlign: 'center',
                    fontFamily: "'Cabinet Grotesk', sans-serif",
                  }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: plan === v ? '#7a1c2e' : '#2a1f1a', margin: '0 0 2px' }}>{label}</p>
                  <p style={{ fontSize: 11, color: '#a89070', margin: 0 }}>{sub}</p>
                </button>
              ))}
            </div>
          </div>

          {!clientView && (
            <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(122,28,46,0.04)', border: '1px solid rgba(122,28,46,0.08)', borderRadius: 8 }}>
              <p style={{ fontSize: 12, color: '#a89070', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif", lineHeight: 1.6 }}>
                Max CI: <strong style={{ color: '#2a1f1a' }}>S${(saNum * 6).toLocaleString()}</strong><br />
                Premium waived at: <strong style={{ color: '#2a1f1a' }}>S${(saNum * 3).toLocaleString()}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Add claim */}
        <div style={{ background: '#fff', border: '1px solid rgba(42,31,26,0.07)', borderRadius: 14, padding: '24px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 16px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Add Claim
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: '#a89070', fontWeight: 600, display: 'block', marginBottom: 5, fontFamily: "'Cabinet Grotesk', sans-serif" }}>Condition Group</label>
              <select
                value={newGroup}
                onChange={(e) => {
                  const g = e.target.value as Group
                  setNewGroup(g)
                  setNewCondition(CONDITIONS[g][newSeverity][0] ?? CONDITIONS[g].Early[0])
                }}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid rgba(42,31,26,0.13)', borderRadius: 9, fontSize: 13, color: '#2a1f1a', fontFamily: "'Cabinet Grotesk', sans-serif", background: '#fff', outline: 'none' }}
              >
                {GROUPS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, color: '#a89070', fontWeight: 600, display: 'block', marginBottom: 5, fontFamily: "'Cabinet Grotesk', sans-serif" }}>Severity</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {SEVERITIES.map((s) => (
                  <button key={s} onClick={() => {
                    setNewSeverity(s)
                    setNewCondition(CONDITIONS[newGroup][s]?.[0] ?? CONDITIONS[newGroup].Early[0])
                  }}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      border: newSeverity === s ? '2px solid #7a1c2e' : '1.5px solid rgba(42,31,26,0.13)',
                      background: newSeverity === s ? severityBg[s] : '#fff',
                      color: newSeverity === s ? severityColour[s] : '#a89070',
                      cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif",
                    }}>{s}</button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, color: '#a89070', fontWeight: 600, display: 'block', marginBottom: 5, fontFamily: "'Cabinet Grotesk', sans-serif" }}>Condition</label>
              <select
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid rgba(42,31,26,0.13)', borderRadius: 9, fontSize: 13, color: '#2a1f1a', fontFamily: "'Cabinet Grotesk', sans-serif", background: '#fff', outline: 'none' }}
              >
                {(CONDITIONS[newGroup][newSeverity] ?? []).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, color: '#a89070', fontWeight: 600, display: 'block', marginBottom: 5, fontFamily: "'Cabinet Grotesk', sans-serif" }}>Year of claim</label>
              <input
                type="number" min={1} max={40}
                value={newYear} onChange={(e) => setNewYear(parseInt(e.target.value) || 1)}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid rgba(42,31,26,0.13)', borderRadius: 9, fontSize: 13, color: '#2a1f1a', fontFamily: "'Cabinet Grotesk', sans-serif", background: '#fff', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <button
              onClick={addClaim}
              disabled={saNum === 0}
              style={{
                background: saNum === 0 ? '#c4a882' : '#7a1c2e', color: '#fdf8f2',
                border: 'none', borderRadius: 9, padding: '11px',
                fontSize: 13, fontWeight: 700, cursor: saNum === 0 ? 'not-allowed' : 'pointer',
                fontFamily: "'Cabinet Grotesk', sans-serif",
              }}
            >
              + Add Claim
            </button>
          </div>
        </div>

        {/* Client view toggle */}
        <button
          onClick={() => setClientView((v) => !v)}
          style={{
            background: clientView ? 'rgba(122,28,46,0.08)' : '#fff',
            border: '1.5px solid rgba(122,28,46,0.2)',
            borderRadius: 10, padding: '11px',
            fontSize: 13, fontWeight: 600, color: '#7a1c2e', cursor: 'pointer',
            fontFamily: "'Cabinet Grotesk', sans-serif",
          }}
        >
          {clientView ? '✓ Client View ON' : 'Switch to Client View'}
        </button>
      </div>

      {/* RIGHT — Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Total banner */}
        <div style={{
          background: '#fff',
          border: '1px solid rgba(42,31,26,0.07)',
          borderRadius: 14, padding: '24px 28px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 6px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Total Received — {clientName}
            </p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: '#7a1c2e', margin: 0 }}>
              S${totalPaid.toLocaleString()}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 12, color: '#a89070', margin: '0 0 4px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              {claims.length} claim{claims.length !== 1 ? 's' : ''}
            </p>
            <p style={{ fontSize: 12, color: '#a89070', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              {saNum > 0 ? `${((totalPaid / maxCI) * 100).toFixed(0)}% of max` : '—'}
            </p>
          </div>
        </div>

        {/* Timeline */}
        {claims.length === 0 ? (
          <div style={{
            background: '#fff', border: '1px solid rgba(42,31,26,0.07)',
            borderRadius: 14, padding: '64px 24px', textAlign: 'center',
          }}>
            <p style={{ fontSize: 32, margin: '0 0 12px' }}>⬡</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#2a1f1a', fontFamily: "'Playfair Display', serif", margin: '0 0 8px' }}>
              No claims yet
            </p>
            <p style={{ fontSize: 14, color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif", margin: 0 }}>
              Add a claim on the left to see the payout timeline.
            </p>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid rgba(42,31,26,0.07)', borderRadius: 14, overflow: 'hidden' }}>
            {/* Progress bar */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(42,31,26,0.06)', background: '#fdf8f2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 600 }}>
                  CI benefit used
                </span>
                <span style={{ fontSize: 11, color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  S${totalPaid.toLocaleString()} / S${maxCI.toLocaleString()}
                </span>
              </div>
              <div style={{ height: 6, background: 'rgba(42,31,26,0.07)', borderRadius: 3 }}>
                <div style={{
                  height: 6, borderRadius: 3, background: '#7a1c2e',
                  width: `${Math.min(100, maxCI > 0 ? (totalPaid / maxCI) * 100 : 0)}%`,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>

            {results.map((r, i) => (
              <div key={r.claim.id} style={{
                padding: '20px 24px',
                borderBottom: i < results.length - 1 ? '1px solid rgba(42,31,26,0.04)' : 'none',
                display: 'flex', alignItems: 'flex-start', gap: 16,
              }}>
                {/* Year circle */}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: r.payout > 0 ? 'rgba(122,28,46,0.08)' : 'rgba(42,31,26,0.05)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 10, color: '#a89070', fontFamily: "'Cabinet Grotesk', sans-serif", lineHeight: 1 }}>Yr</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#2a1f1a', fontFamily: "'Cabinet Grotesk', sans-serif" }}>{r.claim.year}</span>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div>
                      <span style={{
                        display: 'inline-block', fontSize: 10, fontWeight: 700,
                        padding: '2px 8px', borderRadius: 4, marginRight: 8,
                        background: severityBg[r.claim.severity],
                        color: severityColour[r.claim.severity],
                        fontFamily: "'Cabinet Grotesk', sans-serif",
                      }}>
                        {r.claim.severity} CI
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#2a1f1a', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                        {r.claim.condition}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{
                        fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700,
                        color: r.payout > 0 ? '#7a1c2e' : '#a89070', margin: 0,
                      }}>
                        {r.payout > 0 ? `S$${r.payout.toLocaleString()}` : 'S$0'}
                      </p>
                      {r.payout > 0 && (
                        <p style={{ fontSize: 11, color: '#a89070', margin: '2px 0 0', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                          Total: S${r.runningTotal.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  {!clientView && (
                    <p style={{ fontSize: 12, color: '#a89070', margin: '4px 0 0', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                      {r.note}
                    </p>
                  )}
                  {r.premiumWaived && (
                    <div style={{ marginTop: 6, padding: '4px 10px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, display: 'inline-block' }}>
                      <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                        ✓ Premium waived from here
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => removeClaim(r.claim.id)}
                  style={{ background: 'transparent', border: 'none', color: '#c4a882', cursor: 'pointer', fontSize: 16, padding: 4, flexShrink: 0 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
