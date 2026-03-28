'use client'

import { motion } from 'framer-motion'
import { EASE } from '@/lib/animations'
import { ReactNode } from 'react'

export function PageWrapper({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.994 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}
