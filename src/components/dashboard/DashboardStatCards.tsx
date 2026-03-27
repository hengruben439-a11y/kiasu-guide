'use client'

import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, EASE } from '@/lib/animations'

interface StatCard {
  label: string
  value: string
  sub: string
  emoji: string
  accent: string
  accentBg: string
}

export function DashboardStatCards({ cards }: { cards: StatCard[] }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid-4col"
      style={{ gap: 12, marginBottom: 40 }}
    >
      {cards.map((s) => (
        <motion.div
          key={s.label}
          variants={staggerItem}
          whileHover={{ y: -3, transition: { duration: 0.2, ease: EASE } }}
          style={{
            background: 'rgba(122,28,46,0.06)',
            border: '1px solid rgba(196,168,130,0.15)',
            borderRadius: 14,
            padding: '18px 20px',
            backdropFilter: 'blur(12px)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Top accent strip */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, ${s.accent}, ${s.accent}60)`,
          }} />
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: s.accentBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, marginBottom: 10,
          }}>
            {s.emoji}
          </div>
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'rgba(196,168,130,0.6)',
            margin: '0 0 5px', fontFamily: "'Cabinet Grotesk', sans-serif",
          }}>
            {s.label}
          </p>
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 22, fontWeight: 700, color: '#fdf8f2', margin: '0 0 3px',
          }}>
            {s.value}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(253,248,242,0.45)', margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            {s.sub}
          </p>
        </motion.div>
      ))}
    </motion.div>
  )
}
