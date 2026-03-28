export const EASE = [0.25, 0.1, 0.25, 1] as const

// Hover lift for interactive cards
export const hoverCard = {
  whileHover: { y: -2, boxShadow: '0 8px 32px rgba(122,28,46,0.18)', borderColor: 'rgba(196,168,130,0.30)' },
  transition: { duration: 0.2, ease: EASE },
}

// Hover for primary buttons
export const hoverBtn = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.97 },
  transition: { duration: 0.15, ease: EASE },
}

export const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: EASE },
}

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3, ease: EASE },
}

export const slideFromRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3, ease: EASE },
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
  transition: { duration: 0.25, ease: EASE },
}

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.07 } },
}

export const staggerItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: EASE },
}
