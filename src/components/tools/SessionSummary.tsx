'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  profile: {
    monthly_income: number
    monthly_expenses: number
    liquid_savings: number
    cpf_oa: number
    cpf_sa: number
    cpf_ma: number
    monthly_investment: number
    retirement_age: number
    desired_monthly_income: number
    portfolio_value: number
  }
  benefits: { enabled: boolean }[]
  healthScore: number
}

export default function SessionSummary({ userId, profile, benefits, healthScore }: Props) {
  const [aiSummary, setAiSummary] = useState('')
  const [noahNotes, setNoahNotes] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const today = new Date().toISOString().split('T')[0]

  // Load today's existing session summary on mount
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('session_summaries')
        .select('ai_summary, noah_notes')
        .eq('user_id', userId)
        .eq('session_date', today)
        .single()
      if (data) {
        if (data.ai_summary) setAiSummary(data.ai_summary)
        if (data.noah_notes) setNoahNotes(data.noah_notes)
      }
    }
    load()
  }, [userId, today])

  async function handleGenerateDraft() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/session-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, benefits, healthScore }),
      })
      if (!res.ok) throw new Error('Failed to generate')
      const { summary } = await res.json()
      setAiSummary(summary)
    } catch {
      setError('Could not generate summary. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const saveNotes = useCallback(async (notes: string) => {
    setSaveStatus('saving')
    const supabase = createClient()
    await supabase
      .from('session_summaries')
      .upsert({
        user_id: userId,
        session_date: today,
        noah_notes: notes,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,session_date' })
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }, [userId, today])

  function handleNotesChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setNoahNotes(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => saveNotes(val), 800)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 6px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          Session Summary
        </p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#fdf8f2', margin: '0 0 4px' }}>
          Today&apos;s Advisory Session
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.50)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
          {new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* AI Draft section */}
      <div style={{ background: 'rgba(122,28,46,0.06)', border: '1px solid rgba(196,168,130,0.15)', borderRadius: 16, padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 4px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              AI Draft
            </p>
            <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.55)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Plain-English summary generated from your client&apos;s financial data
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleGenerateDraft}
            disabled={generating}
            style={{
              padding: '10px 20px', borderRadius: 10,
              background: generating ? 'rgba(122,28,46,0.3)' : '#9b2040',
              color: '#fdf8f2', border: 'none', cursor: generating ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: "'Cabinet Grotesk', sans-serif",
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {generating ? (
              <>
                <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(253,248,242,0.3)', borderTopColor: '#fdf8f2', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Generating…
              </>
            ) : (
              <>✦ {aiSummary ? 'Regenerate' : 'Generate'} Draft</>
            )}
          </motion.button>
        </div>

        <AnimatePresence mode="wait">
          {aiSummary ? (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              style={{ background: 'rgba(10,6,5,0.4)', borderRadius: 12, padding: '18px 22px', border: '1px solid rgba(196,168,130,0.10)' }}
            >
              {aiSummary.split('\n\n').filter(Boolean).map((para, i) => (
                <p key={i} style={{ fontSize: 13, color: 'rgba(253,248,242,0.80)', lineHeight: 1.75, margin: i === 0 ? 0 : '12px 0 0', fontFamily: "'Cabinet Grotesk', sans-serif", wordBreak: 'break-word' }}>
                  {para}
                </p>
              ))}
              <p style={{ fontSize: 10, color: 'rgba(196,168,130,0.4)', margin: '14px 0 0', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                AI-generated summary · For review and discussion purposes only
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ background: 'rgba(10,6,5,0.25)', borderRadius: 12, padding: '28px', border: '1px dashed rgba(196,168,130,0.15)', textAlign: 'center' }}
            >
              <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.30)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Click &quot;Generate Draft&quot; to create a plain-English summary of this session
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <p style={{ fontSize: 12, color: '#ef4444', margin: '10px 0 0', fontFamily: "'Cabinet Grotesk', sans-serif" }}>{error}</p>
        )}
      </div>

      {/* Noah's Notes section */}
      <div style={{ background: 'rgba(122,28,46,0.06)', border: '1px solid rgba(196,168,130,0.15)', borderRadius: 16, padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c4a882', margin: '0 0 4px', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Noah&apos;s Notes
            </p>
            <p style={{ fontSize: 13, color: 'rgba(253,248,242,0.55)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Your observations, recommendations, and follow-up actions
            </p>
          </div>
          <AnimatePresence>
            {saveStatus !== 'idle' && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ fontSize: 11, color: saveStatus === 'saved' ? '#16a34a' : 'rgba(253,248,242,0.40)', fontFamily: "'Cabinet Grotesk', sans-serif" }}
              >
                {saveStatus === 'saving' ? 'Saving…' : '✓ Saved'}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <textarea
          value={noahNotes}
          onChange={handleNotesChange}
          placeholder="Add your session notes here — what was discussed, action items, follow-up topics…"
          rows={5}
          style={{
            width: '100%', borderRadius: 12, border: '1px solid rgba(196,168,130,0.15)',
            background: 'rgba(10,6,5,0.4)', color: '#fdf8f2',
            padding: '14px 16px', fontSize: 13, lineHeight: 1.7,
            fontFamily: "'Cabinet Grotesk', sans-serif", resize: 'vertical',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
