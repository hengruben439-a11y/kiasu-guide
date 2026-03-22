'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  tool: string
  data: Record<string, unknown>
  label?: string
  autoRefresh?: boolean
}

type State = 'idle' | 'loading' | 'streaming' | 'done' | 'no_key' | 'error'

export default function AIInsightPanel({
  tool, data, label = 'Generate AI Insight', autoRefresh = false,
}: Props) {
  const [state, setState] = useState<State>('idle')
  const [text, setText] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevDataRef = useRef<string>('')

  const generate = useCallback(async () => {
    setState('loading')
    setText('')

    try {
      const res = await fetch('/api/ai/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, data }),
      })

      if (res.status === 503) { setState('no_key'); return }
      if (!res.ok) { setState('error'); return }

      setState('streaming')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) { setState('error'); return }

      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') continue
          try {
            const json = JSON.parse(raw)
            if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
              setText((prev) => prev + json.delta.text)
            }
          } catch { /* ignore */ }
        }
      }
      setState('done')
    } catch {
      setState('error')
    }
  }, [tool, data])

  useEffect(() => {
    if (!autoRefresh) return
    const serialised = JSON.stringify(data)
    if (serialised === prevDataRef.current) return
    prevDataRef.current = serialised

    if (state === 'loading' || state === 'streaming') return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { generate() }, 2000)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, autoRefresh])

  function reset() { setState('idle'); setText('') }

  return (
    <div style={{
      background: 'rgba(122,28,46,0.06)',
      border: '1px solid rgba(155,32,64,0.2)',
      borderRadius: 14,
      overflow: 'hidden',
      backdropFilter: 'blur(12px)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: state !== 'idle' ? '1px solid rgba(155,32,64,0.12)' : 'none',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, color: '#9b2040' }}>✦</span>
          <div>
            <p style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: '#c4a882', margin: 0,
            }}>
              Advisor AI Insight
            </p>
            {autoRefresh && state === 'idle' && (
              <p style={{ fontSize: 10, color: 'rgba(253,248,242,0.35)', margin: '1px 0 0', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Auto-generates when you adjust parameters
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {state === 'done' && (
            <button
              onClick={reset}
              style={{
                fontSize: 11, color: 'rgba(253,248,242,0.4)', background: 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif",
              }}
            >
              Regenerate
            </button>
          )}
          {(state === 'idle' || state === 'error') && !autoRefresh && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={generate}
              style={{
                background: '#9b2040', color: '#fdf8f2',
                border: 'none', borderRadius: 8,
                padding: '7px 16px', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif",
              }}
            >
              {label}
            </motion.button>
          )}
          {(state === 'idle' || state === 'error') && autoRefresh && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={generate}
              style={{
                background: 'none', color: '#c4a882',
                border: '1px solid rgba(196,168,130,0.25)', borderRadius: 8,
                padding: '6px 14px', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', fontFamily: "'Cabinet Grotesk', sans-serif",
              }}
            >
              Generate Now
            </motion.button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {state === 'loading' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  style={{ width: 5, height: 5, borderRadius: '50%', background: '#9b2040' }}
                />
              ))}
            </div>
            <span style={{ fontSize: 12, color: 'rgba(253,248,242,0.5)', fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Analysing your numbers…
            </span>
          </motion.div>
        )}

        {(state === 'streaming' || state === 'done') && text && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{ padding: '16px 20px 20px' }}
          >
            <p style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: 13, color: 'rgba(253,248,242,0.80)', lineHeight: 1.8,
              margin: 0, whiteSpace: 'pre-wrap',
            }}>
              {text}
              {state === 'streaming' && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  style={{ color: '#9b2040', marginLeft: 1 }}
                >|</motion.span>
              )}
            </p>
          </motion.div>
        )}

        {state === 'no_key' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <span style={{ fontSize: 13 }}>🔑</span>
            <p style={{ fontSize: 12, color: 'rgba(253,248,242,0.5)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              AI insights require an{' '}
              <code style={{ background: 'rgba(155,32,64,0.15)', padding: '1px 6px', borderRadius: 4, fontSize: 11, color: '#c4a882' }}>
                ANTHROPIC_API_KEY
              </code>{' '}
              environment variable.
            </p>
          </motion.div>
        )}

        {state === 'error' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{ padding: '14px 20px' }}
          >
            <p style={{ fontSize: 12, color: '#ef4444', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Could not generate insight. Please try again.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
