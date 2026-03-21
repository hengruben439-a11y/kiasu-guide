'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  userId: string
  existing: Record<string, unknown> | null
}

type OnboardingData = {
  preferred_name: string
  dob: string
  sex: string
  height_cm: string
  weight_kg: string
  pre_existing: string
  employment_status: string
  monthly_income: string
  num_dependents: string
  monthly_expenses: string
  liquid_savings: string
  cpf_oa: string
  cpf_sa: string
  cpf_ma: string
  retirement_age: string
  desired_monthly_income: string
  inflation_rate: string
}

const QUICK_START_DEFAULTS = {
  employment_status: 'employed',
  monthly_income: '8000',
  num_dependents: '0',
  monthly_expenses: '4000',
  liquid_savings: '50000',
  cpf_oa: '80000',
  cpf_sa: '40000',
  cpf_ma: '20000',
  retirement_age: '65',
  desired_monthly_income: '5000',
  inflation_rate: '0.03',
}

const TOTAL_PHASE1 = 4
const TOTAL_PHASE2 = 5

const inputStyle = {
  width: '100%', padding: '12px 16px',
  border: '1.5px solid rgba(42,31,26,0.15)',
  borderRadius: 10, fontSize: 15, color: '#2a1f1a',
  background: '#fff', outline: 'none',
  fontFamily: "'Cabinet Grotesk', sans-serif",
  boxSizing: 'border-box' as const,
  transition: 'border-color 0.15s',
}

const labelStyle = {
  display: 'block' as const,
  fontSize: 12, fontWeight: 600 as const,
  letterSpacing: '0.08em', textTransform: 'uppercase' as const,
  color: '#a89070', marginBottom: 8,
}

const sgdInputWrapper = {
  position: 'relative' as const, display: 'flex',
}

function SGDInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={sgdInputWrapper}>
      <span style={{
        position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
        fontSize: 14, color: '#a89070', fontWeight: 600,
        fontFamily: "'Cabinet Grotesk', sans-serif",
        pointerEvents: 'none',
      }}>S$</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '0'}
        style={{ ...inputStyle, paddingLeft: 44 }}
      />
    </div>
  )
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100)
  return (
    <div style={{ width: '100%', background: 'rgba(42,31,26,0.07)', borderRadius: 4, height: 4, marginBottom: 32 }}>
      <div style={{
        height: 4, borderRadius: 4,
        background: '#7a1c2e',
        width: `${pct}%`,
        transition: 'width 0.4s ease',
      }} />
    </div>
  )
}

export default function OnboardingWizard({ userId, existing }: Props) {
  const router = useRouter()
  const [phase, setPhase] = useState<'phase1' | 'pivot' | 'phase2'>('phase1')
  const [step, setStep] = useState(0) // within current phase
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward')

  const [data, setData] = useState<OnboardingData>({
    preferred_name: String(existing?.preferred_name ?? ''),
    dob: String(existing?.dob ?? ''),
    sex: String(existing?.sex ?? ''),
    height_cm: String(existing?.height_cm ?? ''),
    weight_kg: String(existing?.weight_kg ?? ''),
    pre_existing: String(existing?.pre_existing ?? ''),
    employment_status: String(existing?.employment_status ?? ''),
    monthly_income: String(existing?.monthly_income ?? ''),
    num_dependents: String(existing?.num_dependents ?? '0'),
    monthly_expenses: String(existing?.monthly_expenses ?? ''),
    liquid_savings: String(existing?.liquid_savings ?? ''),
    cpf_oa: String(existing?.cpf_oa ?? ''),
    cpf_sa: String(existing?.cpf_sa ?? ''),
    cpf_ma: String(existing?.cpf_ma ?? ''),
    retirement_age: String(existing?.retirement_age ?? '65'),
    desired_monthly_income: String(existing?.desired_monthly_income ?? ''),
    inflation_rate: String(existing?.inflation_rate ?? '0.03'),
  })

  function set(key: keyof OnboardingData, value: string) {
    setData((d) => ({ ...d, [key]: value }))
    setError('')
  }

  async function saveToDb(patch: Record<string, unknown>) {
    const supabase = createClient()
    const { error } = await supabase
      .from('client_profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
    return error
  }

  async function goNext() {
    setSaving(true)
    setError('')
    setAnimDir('forward')

    if (phase === 'phase1') {
      let patch: Record<string, unknown> = {}
      if (step === 0) {
        if (!data.preferred_name.trim()) { setError('Please enter your preferred name.'); setSaving(false); return }
        patch = { preferred_name: data.preferred_name.trim() }
      } else if (step === 1) {
        if (!data.dob) { setError('Please enter your date of birth.'); setSaving(false); return }
        if (!data.sex) { setError('Please select your sex.'); setSaving(false); return }
        patch = { dob: data.dob, sex: data.sex }
      } else if (step === 2) {
        patch = {
          ...(data.height_cm && { height_cm: parseFloat(data.height_cm) }),
          ...(data.weight_kg && { weight_kg: parseFloat(data.weight_kg) }),
          ...(data.pre_existing && { pre_existing: data.pre_existing }),
        }
      } else if (step === 3) {
        // PDPA — handled by Complete button
      }

      if (Object.keys(patch).length > 0) {
        const err = await saveToDb(patch)
        if (err) { setError('Could not save. Please try again.'); setSaving(false); return }
      }

      if (step < TOTAL_PHASE1 - 1) {
        setStep((s) => s + 1)
      } else {
        setPhase('pivot')
      }
    } else if (phase === 'phase2') {
      let patch: Record<string, unknown> = {}
      if (step === 0) {
        if (!data.monthly_income) { setError('Please enter your monthly income.'); setSaving(false); return }
        patch = {
          employment_status: data.employment_status || 'employed',
          monthly_income: parseFloat(data.monthly_income),
          num_dependents: parseInt(data.num_dependents) || 0,
        }
      } else if (step === 1) {
        if (!data.monthly_expenses) { setError('Please enter your monthly expenses.'); setSaving(false); return }
        patch = { monthly_expenses: parseFloat(data.monthly_expenses) }
      } else if (step === 2) {
        patch = { liquid_savings: parseFloat(data.liquid_savings) || 0 }
      } else if (step === 3) {
        patch = {
          cpf_oa: parseFloat(data.cpf_oa) || 0,
          cpf_sa: parseFloat(data.cpf_sa) || 0,
          cpf_ma: parseFloat(data.cpf_ma) || 0,
        }
      } else if (step === 4) {
        patch = {
          retirement_age: parseInt(data.retirement_age) || 65,
          desired_monthly_income: parseFloat(data.desired_monthly_income) || 5000,
          inflation_rate: parseFloat(data.inflation_rate) || 0.03,
        }
      }

      if (Object.keys(patch).length > 0) {
        const err = await saveToDb(patch)
        if (err) { setError('Could not save. Please try again.'); setSaving(false); return }
      }

      if (step < TOTAL_PHASE2 - 1) {
        setStep((s) => s + 1)
      } else {
        router.push('/dashboard')
        return
      }
    }

    setSaving(false)
  }

  async function completePDPA() {
    if (phase !== 'phase1' || step !== 3) return
    setSaving(true)
    const err = await saveToDb({ pdpa_consent: true })
    if (err) { setError('Could not save. Please try again.'); setSaving(false); return }
    setPhase('pivot')
    setSaving(false)
  }

  async function handleQuickStart() {
    setSaving(true)
    const patch = {
      ...QUICK_START_DEFAULTS,
      monthly_income: 8000, monthly_expenses: 4000,
      liquid_savings: 50000, cpf_oa: 80000, cpf_sa: 40000, cpf_ma: 20000,
      retirement_age: 65, desired_monthly_income: 5000,
      inflation_rate: 0.03, dividend_yield: 0.04,
      pdpa_consent: true,
    }
    const err = await saveToDb(patch)
    if (err) { setError('Could not save. Please try again.'); setSaving(false); return }
    router.push('/dashboard')
  }

  function goBack() {
    setAnimDir('back')
    setError('')
    if (phase === 'phase1' && step > 0) { setStep((s) => s - 1) }
    else if (phase === 'phase2' && step === 0) { setPhase('pivot') }
    else if (phase === 'phase2' && step > 0) { setStep((s) => s - 1) }
  }

  const canGoBack = (phase === 'phase1' && step > 0) || phase === 'phase2'

  // --- Render ---

  const cardStyle = {
    background: '#fff',
    border: '1px solid rgba(42,31,26,0.07)',
    borderRadius: 20,
    boxShadow: '0 12px 48px rgba(42,31,26,0.1)',
    padding: '44px 48px',
    width: '100%',
    maxWidth: 520,
  }

  const headingStyle = {
    fontFamily: "'Playfair Display', serif",
    fontSize: 26, fontWeight: 700, color: '#2a1f1a',
    margin: '0 0 6px', letterSpacing: '-0.02em',
  }

  const subStyle = {
    fontSize: 14, color: '#a89070',
    fontFamily: "'Cabinet Grotesk', sans-serif",
    margin: '0 0 32px',
  }

  const btnPrimary = {
    background: '#7a1c2e', color: '#fdf8f2',
    border: 'none', borderRadius: 10,
    padding: '13px 28px', fontSize: 14, fontWeight: 600,
    cursor: saving ? 'not-allowed' : 'pointer',
    fontFamily: "'Cabinet Grotesk', sans-serif",
    opacity: saving ? 0.7 : 1,
    transition: 'opacity 0.15s',
  }

  const btnBack = {
    background: 'transparent', color: '#a89070',
    border: '1.5px solid rgba(42,31,26,0.1)',
    borderRadius: 10, padding: '13px 24px',
    fontSize: 14, fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Cabinet Grotesk', sans-serif",
  }

  const stepKey = `${phase}-${step}`
  const slideVariants = {
    enter: (dir: 'forward' | 'back') => ({
      x: dir === 'forward' ? 40 : -40,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: 'forward' | 'back') => ({
      x: dir === 'forward' ? -40 : 40,
      opacity: 0,
    }),
  }

  if (phase === 'pivot') {
    return (
      <motion.div
        key="pivot"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={cardStyle}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 12px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Phase 1 complete
          </p>
          <h2 style={{ ...headingStyle, fontSize: 28, textAlign: 'center' }}>
            Let&apos;s Build Your Financial Profile
          </h2>
          <p style={{ ...subStyle, textAlign: 'center' }}>
            How would you like to get started?
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button
            onClick={() => { setPhase('phase2'); setStep(0) }}
            style={{
              background: '#fff', border: '2px solid rgba(34,197,94,0.3)',
              borderRadius: 14, padding: '20px 24px', textAlign: 'left', cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 700, color: '#2a1f1a', margin: '0 0 8px', fontFamily: "'Playfair Display', serif" }}>
              Guided Tour
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {['Walk through each section step by step', 'Built-in tips explain each field', 'Takes about 5 minutes'].map((t) => (
                <p key={t} style={{ fontSize: 13, color: '#a89070', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  <span style={{ color: '#22c55e', marginRight: 8 }}>✓</span>{t}
                </p>
              ))}
            </div>
          </button>

          <button
            onClick={handleQuickStart}
            disabled={saving}
            style={{
              background: '#fff', border: '2px solid rgba(59,130,246,0.3)',
              borderRadius: 14, padding: '20px 24px', textAlign: 'left', cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 700, color: '#2a1f1a', margin: '0 0 8px', fontFamily: "'Playfair Display', serif" }}>
              Quick Start ⚡
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {['Fills in Singapore median defaults', 'You can edit everything later', 'Jump straight to your tools'].map((t) => (
                <p key={t} style={{ fontSize: 13, color: '#a89070', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  <span style={{ color: '#3b82f6', marginRight: 8 }}>✓</span>{t}
                </p>
              ))}
            </div>
          </button>
        </div>
        {error && <p style={{ color: '#7a1c2e', fontSize: 13, marginTop: 12, textAlign: 'center' }}>{error}</p>}
      </motion.div>
    )
  }

  const isPhase2 = phase === 'phase2'
  const totalSteps = isPhase2 ? TOTAL_PHASE2 : TOTAL_PHASE1
  const phaseLabel = isPhase2 ? 'Phase 2 — Financial Profile' : 'Phase 1 — Personal Identity'

  return (
    <div style={cardStyle}>
      {/* Brand */}
      <p style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 13, color: '#7a1c2e', fontWeight: 700,
        letterSpacing: '0.05em', margin: '0 0 24px',
        textAlign: 'center',
      }}>
        The Kiasu Guide
      </p>

      {/* Progress */}
      <ProgressBar current={step + 1} total={totalSteps} />

      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 20px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
        {phaseLabel} — Step {step + 1} of {totalSteps}
      </p>

      {/* Step content with slide transitions */}
      <div style={{ overflow: 'hidden', position: 'relative' }}>
      <AnimatePresence mode="wait" custom={animDir}>
      <motion.div
        key={stepKey}
        custom={animDir}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >

      {!isPhase2 && step === 0 && (
        <div>
          <h2 style={headingStyle}>What should we call you?</h2>
          <p style={subStyle}>This is how your advisor and tools will address you.</p>
          <label style={labelStyle}>Preferred name</label>
          <input
            autoFocus
            type="text"
            value={data.preferred_name}
            onChange={(e) => set('preferred_name', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && goNext()}
            placeholder="e.g. Sarah"
            style={inputStyle}
          />
        </div>
      )}

      {!isPhase2 && step === 1 && (
        <div>
          <h2 style={headingStyle}>Tell us about yourself</h2>
          <p style={subStyle}>Used to calibrate health and financial tools accurately.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={labelStyle}>Date of birth</label>
              <input
                type="date"
                value={data.dob}
                onChange={(e) => set('dob', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Sex</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('sex', opt.value)}
                    style={{
                      padding: '11px 16px', borderRadius: 10,
                      border: data.sex === opt.value
                        ? '2px solid #7a1c2e'
                        : '1.5px solid rgba(42,31,26,0.15)',
                      background: data.sex === opt.value ? 'rgba(122,28,46,0.06)' : '#fff',
                      color: data.sex === opt.value ? '#7a1c2e' : '#2a1f1a',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      fontFamily: "'Cabinet Grotesk', sans-serif",
                      transition: 'all 0.15s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!isPhase2 && step === 2 && (
        <div>
          <h2 style={headingStyle}>Health Information</h2>
          <p style={subStyle}>Optional. Used for BMI tracking and insurance context.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Height (cm)</label>
                <input type="number" min={100} max={220} value={data.height_cm} onChange={(e) => set('height_cm', e.target.value)} placeholder="170" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Weight (kg)</label>
                <input type="number" min={30} max={250} value={data.weight_kg} onChange={(e) => set('weight_kg', e.target.value)} placeholder="65" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Pre-existing conditions (optional)</label>
              <textarea
                value={data.pre_existing}
                onChange={(e) => set('pre_existing', e.target.value)}
                placeholder="e.g. High blood pressure, diabetes"
                rows={3}
                style={{ ...inputStyle, resize: 'none' as const }}
              />
            </div>
          </div>
        </div>
      )}

      {!isPhase2 && step === 3 && (
        <div>
          <h2 style={headingStyle}>Data Privacy Agreement</h2>
          <p style={subStyle}>Please read and accept our PDPA agreement before continuing.</p>
          <div style={{
            height: 200, overflowY: 'auto' as const,
            background: '#fdf8f2', border: '1px solid rgba(42,31,26,0.1)',
            borderRadius: 10, padding: '16px 18px',
            fontSize: 12, color: '#a89070', lineHeight: 1.8,
            marginBottom: 20,
          }}>
            <p style={{ margin: '0 0 12px', fontWeight: 700, color: '#2a1f1a' }}>Personal Data Protection Act (PDPA) Notice</p>
            <p style={{ margin: '0 0 10px' }}>By using The Kiasu Guide, you consent to the collection, use, and disclosure of your personal data for the purposes of providing financial advisory services, including but not limited to: analysis of your financial situation, generation of personalised reports, and communication with your assigned advisor.</p>
            <p style={{ margin: '0 0 10px' }}>Your data is stored securely on encrypted servers located in Singapore. We do not sell or share your personal information with third parties without your explicit consent, except as required by law.</p>
            <p style={{ margin: '0 0 10px' }}>You have the right to access, correct, or withdraw consent for the use of your personal data at any time by contacting your advisor.</p>
            <p style={{ margin: 0 }}>This consent is valid until you explicitly withdraw it. Withdrawing consent may affect your ability to use certain features of the platform.</p>
          </div>
          <PDPACheckbox onComplete={completePDPA} saving={saving} />
        </div>
      )}

      {/* Phase 2 */}
      {isPhase2 && step === 0 && (
        <div>
          <h2 style={headingStyle}>💼 Employment &amp; Income</h2>
          <p style={subStyle}>The foundation of your financial plan.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={labelStyle}>Employment status</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {['Employed', 'Self-employed', 'Business owner', 'Unemployed'].map((s) => {
                  const v = s.toLowerCase().replace(' ', '_').replace('-', '_')
                  return (
                    <button key={v} type="button" onClick={() => set('employment_status', v)}
                      style={{
                        padding: '11px 16px', borderRadius: 10,
                        border: data.employment_status === v ? '2px solid #7a1c2e' : '1.5px solid rgba(42,31,26,0.15)',
                        background: data.employment_status === v ? 'rgba(122,28,46,0.06)' : '#fff',
                        color: data.employment_status === v ? '#7a1c2e' : '#2a1f1a',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        fontFamily: "'Cabinet Grotesk', sans-serif",
                      }}>{s}</button>
                  )
                })}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Monthly income</label>
              <SGDInput value={data.monthly_income} onChange={(v) => set('monthly_income', v)} placeholder="8,000" />
              <p style={{ fontSize: 12, color: '#a89070', margin: '6px 0 0', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Take-home pay after CPF deduction
              </p>
            </div>
            <div>
              <label style={labelStyle}>Number of dependants</label>
              <input type="number" min={0} max={10} value={data.num_dependents} onChange={(e) => set('num_dependents', e.target.value)} placeholder="0" style={inputStyle} />
            </div>
          </div>
        </div>
      )}

      {isPhase2 && step === 1 && (
        <div>
          <h2 style={headingStyle}>💰 Monthly Expenses</h2>
          <p style={subStyle}>Your total monthly spend — rent, food, transport, subscriptions.</p>
          <label style={labelStyle}>Monthly expenses</label>
          <SGDInput value={data.monthly_expenses} onChange={(v) => set('monthly_expenses', v)} placeholder="4,000" />
          {data.monthly_income && data.monthly_expenses && (
            <div style={{
              marginTop: 20, padding: '14px 18px',
              background: Number(data.monthly_income) > Number(data.monthly_expenses) ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${Number(data.monthly_income) > Number(data.monthly_expenses) ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              borderRadius: 10,
            }}>
              <p style={{ fontSize: 13, color: '#2a1f1a', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Monthly surplus:{' '}
                <strong>
                  {Number(data.monthly_income) - Number(data.monthly_expenses) >= 0 ? '+' : ''}
                  S${(Number(data.monthly_income) - Number(data.monthly_expenses)).toLocaleString()}
                </strong>
              </p>
            </div>
          )}
        </div>
      )}

      {isPhase2 && step === 2 && (
        <div>
          <h2 style={headingStyle}>🏦 Liquid Savings</h2>
          <p style={subStyle}>Cash and investments you can access within 30 days.</p>
          <label style={labelStyle}>Liquid savings</label>
          <SGDInput value={data.liquid_savings} onChange={(v) => set('liquid_savings', v)} placeholder="50,000" />
          {data.monthly_expenses && data.liquid_savings && (
            <div style={{ marginTop: 20, padding: '14px 18px', background: 'rgba(122,28,46,0.04)', border: '1px solid rgba(122,28,46,0.1)', borderRadius: 10 }}>
              <p style={{ fontSize: 13, color: '#2a1f1a', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Emergency fund coverage:{' '}
                <strong>
                  {Number(data.monthly_expenses) > 0
                    ? `${(Number(data.liquid_savings) / Number(data.monthly_expenses)).toFixed(1)} months`
                    : '—'
                  }
                </strong>
                {' '}(6 months recommended)
              </p>
            </div>
          )}
        </div>
      )}

      {isPhase2 && step === 3 && (
        <div>
          <h2 style={headingStyle}>📊 CPF Balances</h2>
          <p style={subStyle}>Check your CPF statement for current figures.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={labelStyle}>Ordinary Account (OA)</label>
              <SGDInput value={data.cpf_oa} onChange={(v) => set('cpf_oa', v)} placeholder="80,000" />
            </div>
            <div>
              <label style={labelStyle}>Special Account (SA)</label>
              <SGDInput value={data.cpf_sa} onChange={(v) => set('cpf_sa', v)} placeholder="40,000" />
            </div>
            <div>
              <label style={labelStyle}>Medisave Account (MA)</label>
              <SGDInput value={data.cpf_ma} onChange={(v) => set('cpf_ma', v)} placeholder="20,000" />
            </div>
          </div>
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(122,28,46,0.04)', border: '1px solid rgba(122,28,46,0.08)', borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: '#a89070', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Total CPF:{' '}
              <strong style={{ color: '#2a1f1a' }}>
                S${(Number(data.cpf_oa) + Number(data.cpf_sa) + Number(data.cpf_ma)).toLocaleString()}
              </strong>
            </p>
          </div>
        </div>
      )}

      {isPhase2 && step === 4 && (
        <div>
          <h2 style={headingStyle}>🎯 Retirement Goals</h2>
          <p style={subStyle}>Your targets — we&apos;ll show you exactly how to get there.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={labelStyle}>Target retirement age</label>
              <input type="number" min={45} max={80} value={data.retirement_age} onChange={(e) => set('retirement_age', e.target.value)} placeholder="65" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Desired monthly income in retirement</label>
              <SGDInput value={data.desired_monthly_income} onChange={(v) => set('desired_monthly_income', v)} placeholder="5,000" />
              <p style={{ fontSize: 12, color: '#a89070', margin: '6px 0 0', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                In today&apos;s dollars — we&apos;ll adjust for inflation
              </p>
            </div>
            <div>
              <label style={labelStyle}>Expected inflation rate</label>
              <input type="number" min={0.01} max={0.1} step={0.005} value={data.inflation_rate} onChange={(e) => set('inflation_rate', e.target.value)} placeholder="0.03" style={inputStyle} />
              <p style={{ fontSize: 12, color: '#a89070', margin: '6px 0 0', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Singapore historical average: ~3%. Enter as decimal (e.g. 0.03)
              </p>
            </div>
          </div>
        </div>
      )}

      </motion.div>
      </AnimatePresence>
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginTop: 16, padding: '10px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
          <p style={{ fontSize: 13, color: '#dc2626', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>{error}</p>
        </div>
      )}

      {/* Nav buttons — skip for PDPA step (handled separately) */}
      {!(phase === 'phase1' && step === 3) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 }}>
          {canGoBack ? (
            <button onClick={goBack} style={btnBack} type="button">← Back</button>
          ) : (
            <div />
          )}
          <button onClick={goNext} disabled={saving} style={btnPrimary} type="button">
            {saving ? 'Saving…' : isPhase2 && step === TOTAL_PHASE2 - 1 ? 'Complete →' : 'Next →'}
          </button>
        </div>
      )}
    </div>
  )
}

function PDPACheckbox({ onComplete, saving }: { onComplete: () => void; saving: boolean }) {
  const [checked, setChecked] = useState(false)
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 24 }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          style={{ marginTop: 2, width: 16, height: 16, accentColor: '#7a1c2e', flexShrink: 0 }}
        />
        <span style={{ fontSize: 13, color: '#2a1f1a', lineHeight: 1.6, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          I have read and agree to the Personal Data Protection Act notice above.
        </span>
      </label>
      <button
        onClick={onComplete}
        disabled={!checked || saving}
        style={{
          width: '100%', background: checked && !saving ? '#7a1c2e' : '#c4a882',
          color: '#fdf8f2', border: 'none', borderRadius: 10,
          padding: '14px', fontSize: 14, fontWeight: 600,
          cursor: checked && !saving ? 'pointer' : 'not-allowed',
          fontFamily: "'Cabinet Grotesk', sans-serif",
          transition: 'background 0.2s',
        }}
      >
        {saving ? 'Saving…' : 'Complete Phase 1 →'}
      </button>
    </div>
  )
}
