'use client'

import { useEffect, useRef, type ReactNode } from 'react'

import { useAnimEnabled } from '@/components/site/anim'
import { cn } from '@/lib/utils'

/**
 * Parallaxe douce : l'élément se décale verticalement selon sa distance
 * au centre de l'écran, multipliée par `speed` (négatif = il monte plus
 * vite que la page, positif = il traîne). Deux images côte à côte avec
 * des vitesses opposées « respirent » l'une contre l'autre.
 *
 * Calculé image par image à partir de la position réelle à l'écran
 * (compatible avec le défilement inertiel), lissé, et coupé hors écran.
 * Animations désactivées ou reduced-motion : rendu statique.
 */
export function Parallax({
  children,
  speed = -0.06,
  className,
}: {
  children: ReactNode
  /** Fraction de la distance au centre de l'écran. Maquette : -0.06 / +0.05. */
  speed?: number
  className?: string
}) {
  const on = useAnimEnabled()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!on) return
    const el = ref.current
    if (!el) return

    let y = 0
    let frame = 0
    const loop = () => {
      frame = requestAnimationFrame(loop)
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      if (r.bottom < -300 || r.top > vh + 300) return
      /* Position « neutre » : sans transform, où serait l'élément. */
      const center = r.top - y + r.height / 2 - vh / 2
      const target = center * speed
      y += (target - y) * 0.14
      el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`
    }
    frame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frame)
      el.style.transform = ''
    }
  }, [on, speed])

  return (
    <div ref={ref} className={cn('will-change-transform', className)}>
      {children}
    </div>
  )
}
