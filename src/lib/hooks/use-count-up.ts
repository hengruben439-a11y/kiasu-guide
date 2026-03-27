'use client'

import { useEffect, useState } from 'react'
import { animate } from 'framer-motion'

export function useCountUp(target: number, duration = 1.2) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (target === 0) { setDisplay(0); return }
    const controls = animate(0, target, {
      duration,
      ease: [0.25, 0.1, 0.25, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return controls.stop
  }, [target, duration])

  return display
}
