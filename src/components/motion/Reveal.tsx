'use client'

import { m, useInView, useReducedMotion } from 'motion/react'
import { useRef, type ReactNode } from 'react'

type RevealProps = {
  children: ReactNode
  className?: string
  /** Retard en secondes — sert à échelonner plusieurs Reveal voisins. */
  delay?: number
  /** Distance du décalage initial, en pixels. */
  distance?: number
}

/**
 * Apparition de base : opacité + décalage vertical, déclenchée quand l'élément
 * entre à 12 % dans le viewport, une seule fois.
 *
 * Sous `prefers-reduced-motion`, l'élément est rendu directement dans son état
 * final — pas de transition ramenée à zéro, qui laisserait un flash.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  distance = 24,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -12% 0px' })
  const reduced = useReducedMotion()

  if (reduced) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    )
  }

  return (
    <m.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: distance }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: distance }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  )
}
