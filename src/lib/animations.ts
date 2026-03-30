export const EASE = [0.25, 0.1, 0.25, 1] as const

// ── Card hover: lift + glow + border brighten ────────────────────────────────
export const hoverCard = {
  whileHover: {
    y: -3,
    boxShadow: '0 0 0 1px rgba(196,168,130,0.22), 0 8px 32px rgba(122,28,46,0.22), 0 0 40px rgba(196,168,130,0.06)',
  },
  transition: { duration: 0.2, ease: EASE },
}

// ── Button hover: subtle scale + tap feedback ────────────────────────────────
export const hoverBtn = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.97 },
  transition: { duration: 0.15, ease: EASE },
}

// ── Page / section entrance ──────────────────────────────────────────────────
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

// ── Stagger children ─────────────────────────────────────────────────────────
export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.07 } },
}

export const staggerItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: EASE },
}

// ── Scroll-triggered reveal ──────────────────────────────────────────────────
export const scrollReveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.5, ease: EASE },
}

// ── Recharts animation config ────────────────────────────────────────────────
export const chartAnimationProps = {
  isAnimationActive: true,
  animationDuration: 1200,
  animationEasing: 'ease-out' as const,
}
