'use client'

import { m, useMotionValue, useSpring, useReducedMotion } from 'motion/react'
import { useCallback, useRef, type ReactNode } from 'react'

type MagneticProps = {
  children: ReactNode
  className?: string
  /** Force d'attraction. 0.15 est perceptible sans être ludique. */
  strength?: number
}

/**
 * Attraction du curseur, réservée aux CTA principaux.
 *
 * Désactivée sous `prefers-reduced-motion` et sur les pointeurs grossiers
 * (tactile), où l'effet n'a aucun sens et coûte des écouteurs pour rien.
 */
export function Magnetic({
  children,
  className,
  strength = 0.15,
}: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.4 })
  const springY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.4 })

  const handleMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current
      if (!el) return
      if (!window.matchMedia('(pointer: fine)').matches) return

      const rect = el.getBoundingClientRect()
      x.set((event.clientX - (rect.left + rect.width / 2)) * strength)
      y.set((event.clientY - (rect.top + rect.height / 2)) * strength)
    },
    [strength, x, y],
  )

  const reset = useCallback(() => {
    x.set(0)
    y.set(0)
  }, [x, y])

  if (reduced) return <div className={className}>{children}</div>

  return (
    <m.div
      ref={ref}
      className={className}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMove}
      onMouseLeave={reset}
    >
      {children}
    </m.div>
  )
}
