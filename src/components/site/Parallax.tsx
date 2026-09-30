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
 * (compatible avec le défilement inertiel), lissé. La boucle ne TOURNE
 * que lorsque l'élément approche de l'écran : un observateur la lance et
 * l'arrête — avant, chaque parallaxe de la page réclamait une image par
 * seconde de vie, même à trois écrans de là. Animations désactivées ou
 * reduced-motion : rendu statique.
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
    let actif = false
    const loop = () => {
      if (!actif) return
      frame = requestAnimationFrame(loop)
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      /* Position « neutre » : sans transform, où serait l'élément. */
      const center = r.top - y + r.height / 2 - vh / 2
      const target = center * speed
      y += (target - y) * 0.14
      el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`
    }

    /* Marge de 300 px : la boucle démarre un peu avant l'entrée, pour que
       le décalage soit déjà en place quand l'élément paraît. */
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry?.isIntersecting ?? false
        if (visible && !actif) {
          actif = true
          frame = requestAnimationFrame(loop)
        } else if (!visible && actif) {
          actif = false
          cancelAnimationFrame(frame)
        }
      },
      { rootMargin: '300px 0px' },
    )
    observer.observe(el)

    return () => {
      actif = false
      cancelAnimationFrame(frame)
      observer.disconnect()
      el.style.transform = ''
    }
  }, [on, speed])

  return (
    <div ref={ref} className={cn('will-change-transform', className)}>
      {children}
    </div>
  )
}
