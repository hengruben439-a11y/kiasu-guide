'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  name: string
}

const sublines: Record<string, string[]> = {
  morning: [
    "Let's make your money work before lunch.",
    'Your future self is watching this moment.',
    'Small decisions today, big freedom tomorrow.',
  ],
  afternoon: [
    'Your financial future is being built right now.',
    'Every hour of inaction has a price.',
    'The best time to start was yesterday. Next best: now.',
  ],
  evening: [
    'A great time to review where you stand.',
    'Take five minutes tonight to protect years ahead.',
    'Clarity before bed. Confidence in the morning.',
  ],
}

export default function GreetingHeader({ name }: Props) {
  const [greeting, setGreeting] = useState('Hello')
  const [subline, setSubline] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const hour = new Date().getHours()
    const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
    const greetWord = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    setGreeting(greetWord)

    const lines = sublines[period]
    const dayIndex = Math.floor(Date.now() / 86400000) % lines.length
    setSubline(lines[dayIndex])
    setMounted(true)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setShowCursor((v) => !v), 530)
    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ marginBottom: 40 }}
    >
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: '#c4a882', margin: '0 0 10px',
          fontFamily: "'Cabinet Grotesk', sans-serif",
        }}
      >
        Welcome back
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 34, fontWeight: 700, color: '#2a1f1a',
          margin: '0 0 10px', letterSpacing: '-0.02em', lineHeight: 1.1,
        }}
      >
        {greeting}, {name}
        <span style={{ opacity: showCursor ? 1 : 0, color: '#7a1c2e', marginLeft: 2 }}>|</span>
      </motion.h1>
      <AnimatePresence>
        {mounted && subline && (
          <motion.p
            key={subline}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            style={{
              fontSize: 15, color: '#a89070', margin: 0,
              fontFamily: "'Cabinet Grotesk', sans-serif",
            }}
          >
            {subline}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
