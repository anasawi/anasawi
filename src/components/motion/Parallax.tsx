'use client'

import { m, useScroll, useTransform, useReducedMotion } from 'motion/react'
import { useRef, type ReactNode } from 'react'

type ParallaxProps = {
  children: ReactNode
  className?: string
  /**
   * Amplitude en pourcentage de la hauteur de l'élément.
   * Plafonnée à 8 : au-delà, le décalage devient un effet et non une nuance.
   */
  amount?: number
}

export function Parallax({ children, className, amount = 6 }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const clamped = Math.min(Math.abs(amount), 8) * Math.sign(amount || 1)
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [`${clamped}%`, `${-clamped}%`],
  )

  if (reduced) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    )
  }

  return (
    <div ref={ref} className={className}>
      <m.div style={{ y }} className="h-full w-full will-change-transform">
        {children}
      </m.div>
    </div>
  )
}
