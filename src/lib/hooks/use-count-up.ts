'use client'

import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'

export function useCountUp(target: number, duration = 1.2) {
  const [display, setDisplay] = useState(target)
  const prevTarget = useRef(target)

  useEffect(() => {
    const from = prevTarget.current
    prevTarget.current = target

    if (from === target) return

    const controls = animate(from, target, {
      duration,
      ease: [0.25, 0.1, 0.25, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return controls.stop
  }, [target, duration])

  return display
}
