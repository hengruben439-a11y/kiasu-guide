'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

interface WelcomeAnimationProps {
  clientName: string
  onComplete: () => void
}

export function WelcomeAnimation({ clientName, onComplete }: WelcomeAnimationProps) {
  const [phase, setPhase] = useState(0)
  // 0=dark, 1=glow, 2=logo, 3=name, 4=subtitle+line, 5=cta

  useEffect(() => {
    const timings = [400, 1200, 2400, 4000, 5500, 7000]
    const timers = timings.map((t, i) =>
      setTimeout(() => setPhase(i + 1), t)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  const ease = [0.25, 0.1, 0.25, 1] as const

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0a0a',
      }}
    >
      {/* Radial glow pulse */}
      <AnimatePresence>
        {phase >= 1 && (
          <motion.div
            style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.15) 0%, transparent 70%)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0.2, 0.35] }}
            transition={{ duration: 3, times: [0, 0.3, 0.6, 1] }}
          />
        )}
      </AnimatePresence>

      <div style={{
        position: 'relative', zIndex: 10,
        textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
      }}>

        {/* Wordmark */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease }}
              style={{
                fontSize: 13,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)',
                fontWeight: 500,
              }}
            >
              The Kiasu Guide
            </motion.span>
          )}
        </AnimatePresence>

        {/* Welcome headline */}
        <AnimatePresence>
          {phase >= 3 && (
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease }}
              style={{
                fontSize: 'clamp(28px, 5vw, 48px)',
                fontWeight: 700,
                color: '#fdf8f2',
                lineHeight: 1.15,
                maxWidth: 600,
                margin: 0,
              }}
            >
              Welcome to your financial plan,{' '}
              <span style={{ color: '#10b981' }}>{clientName}.</span>
            </motion.h1>
          )}
        </AnimatePresence>

        {/* Subtitle */}
        <AnimatePresence>
          {phase >= 4 && (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease }}
              style={{
                fontSize: 18,
                color: 'rgba(255,255,255,0.55)',
                fontWeight: 400,
                margin: 0,
              }}
            >
              Let&apos;s see exactly where you stand.
            </motion.p>
          )}
        </AnimatePresence>

        {/* Divider */}
        <AnimatePresence>
          {phase >= 4 && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, ease }}
              style={{
                height: 1, width: 60,
                background: 'rgba(16,185,129,0.4)',
                transformOrigin: 'left',
              }}
            />
          )}
        </AnimatePresence>

        {/* CTA */}
        <AnimatePresence>
          {phase >= 5 && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onComplete}
              style={{
                marginTop: 8,
                padding: '14px 36px',
                background: '#10b981',
                color: '#0a0a0a',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
                letterSpacing: '0.02em',
              }}
            >
              Get started →
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
