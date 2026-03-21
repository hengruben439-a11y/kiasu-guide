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
        background: 'linear-gradient(135deg, rgba(122,28,46,0.08) 0%, rgba(196,168,130,0.08) 100%)',
        borderBottom: '1px solid rgba(122,28,46,0.15)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
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
          color: '#7a1c2e',
          background: 'rgba(122,28,46,0.1)',
          border: '1.5px solid rgba(122,28,46,0.2)',
          padding: '3px 10px',
          borderRadius: 20,
        }}>
          Review Mode
        </span>
        <span style={{ fontSize: 13, color: '#2a1f1a', fontWeight: 500 }}>
          Viewing as:{' '}
          <span style={{ fontWeight: 700, color: '#7a1c2e' }}>{clientName}</span>
        </span>
      </div>

      {/* Right: back link */}
      <Link
        href={`/admin/clients/${clientId}`}
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#7a1c2e',
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
