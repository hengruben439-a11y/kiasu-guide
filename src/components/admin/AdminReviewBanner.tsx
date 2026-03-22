'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

interface Props {
  clientName: string
  clientId: string
}

export default function AdminReviewBanner({ clientName, clientId }: Props) {
  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        width: '100%',
        background: 'rgba(155,32,64,0.3)',
        borderBottom: '1px solid rgba(196,168,130,0.25)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 32px',
        fontFamily: "'Cabinet Grotesk', sans-serif",
        boxSizing: 'border-box',
      }}
    >
      {/* Left: badge + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          display: 'inline-block',
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: '#c4a882',
          background: 'rgba(196,168,130,0.15)',
          border: '1.5px solid rgba(196,168,130,0.3)',
          padding: '3px 10px',
          borderRadius: 20,
        }}>
          Review Mode
        </span>
        <span style={{ fontSize: 13, color: '#fdf8f2', fontWeight: 500 }}>
          Viewing as:{' '}
          <span style={{ fontWeight: 700, color: '#c4a882' }}>{clientName}</span>
        </span>
      </div>

      {/* Right: back link */}
      <Link
        href={`/admin/clients/${clientId}`}
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#c4a882',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        ← Back to Client Details
      </Link>
    </motion.div>
  )
}
