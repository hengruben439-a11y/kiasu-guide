'use client'

import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/animations'
import { ReactNode } from 'react'

export function PageWrapper({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={fadeInUp.initial}
      animate={fadeInUp.animate}
      transition={fadeInUp.transition}
    >
      {children}
    </motion.div>
  )
}
