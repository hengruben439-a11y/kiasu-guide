'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { EASE } from '@/lib/animations'

interface CardProps {
  children: React.ReactNode
  className?: string
  interactive?: boolean
  style?: React.CSSProperties
}

export function Card({ children, className, interactive = true, style }: CardProps) {
  return (
    <motion.div
      className={cn(className)}
      whileHover={interactive ? {
        y: -2,
        boxShadow: '0 0 0 1px rgba(196,168,130,0.22), 0 8px 32px rgba(122,28,46,0.22), 0 0 40px rgba(196,168,130,0.06)',
      } : undefined}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        background: 'rgba(122,28,46,0.06)',
        border: '1px solid rgba(196,168,130,0.15)',
        borderRadius: 16,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 0 0 1px rgba(196,168,130,0.08), 0 4px 24px rgba(122,28,46,0.12)',
        transition: 'border-color 0.2s',
        ...style,
      }}
    >
      {children}
    </motion.div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(className)} style={{
      padding: '20px 24px',
      borderBottom: '1px solid rgba(196,168,130,0.08)',
    }}>
      {children}
    </div>
  )
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(className)} style={{ padding: '20px 24px' }}>
      {children}
    </div>
  )
}
