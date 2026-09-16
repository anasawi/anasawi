'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import { useAnimEnabled } from '@/components/site/anim'
import { cn } from '@/lib/utils'

/**
 * Rail d'images en travelling infini.
 *
 * Pas de barre de défilement : le rail avance avec le scroll de la page
 * (parallaxe) et dérive lentement tout seul. Le contenu est dupliqué et
 * l'avancée ramenée modulo la largeur d'une copie — la boucle est
 * invisible, on ne heurte jamais une extrémité.
 *
 * Tout est calculé image par image à partir de la position RÉELLE de la
 * section à l'écran (getBoundingClientRect), jamais depuis les
 * événements de scroll : le défilement inertiel du site transforme la
 * page en douceur alors que `scrollY` saute — lire scrollY donnerait
 * des à-coups. Ici le rail suit exactement ce que l'œil voit.
 *
 * Animations coupées (éditeur, vignettes, prefers-reduced-motion) : rail
 * simplement défilable à la main, toujours sans barre.
 */
export function GalleryRail({
  children,
  className,
  /** Distance parcourue par le rail pendant la traversée de l'écran,
      en fraction de la largeur d'une copie. */
  speed = 0.9,
  /** Dérive continue, en pixels par seconde. */
  drift = 18,
}: {
  children: ReactNode
  className?: string
  speed?: number
  drift?: number
}) {
  const animEnabled = useAnimEnabled()
  /* Tactile : le travelling piloté par le scroll n'a pas de sens sous le
     doigt — on rend le rail défilable à la main. Décidé après montage
     (media query), le rendu serveur reste celui du pointeur fin. */
  const [coarse, setCoarse] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)')
    setCoarse(media.matches)
    const onChange = (event: MediaQueryListEvent) => setCoarse(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  const on = animEnabled && !coarse

  const sectionRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!on) return
    const section = sectionRef.current
    const track = trackRef.current
    const copy = copyRef.current
    if (!section || !track || !copy) return

    let copyWidth = copy.scrollWidth
    const measure = () => {
      copyWidth = copy.scrollWidth
    }
    const observer = new ResizeObserver(measure)
    observer.observe(copy)

    let x = 0 // position lissée
    let drifted = 0 // dérive accumulée
    let last = performance.now()
    let frame = 0

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (copyWidth <= 0) return

      const r = section.getBoundingClientRect()
      /* Rien à faire hors écran — on économise le calcul. */
      if (r.bottom < -200 || r.top > window.innerHeight + 200) return

      drifted += drift * dt

      /* Progression 0 → 1 pendant que la section traverse l'écran. */
      const p = Math.min(
        Math.max((window.innerHeight - r.top) / (window.innerHeight + r.height), 0),
        1,
      )
      const target = -(p * copyWidth * speed + drifted)

      /* Lissage : le rail ne saute jamais, même si la page fait un bond. */
      x += (target - x) * 0.12

      /* Modulo : au-delà d'une copie, on repart sans saut visible. */
      const wrapped = -(((-x) % copyWidth + copyWidth) % copyWidth)
      track.style.transform = `translate3d(${wrapped}px, 0, 0)`
    }
    frame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [on, speed, drift])

  if (!on) {
    return (
      <div
        className={cn(
          'no-scrollbar flex items-end gap-[26px] overflow-x-auto px-[var(--spacing-gutter)] max-md:gap-4',
          /* Inertie native au doigt ; défilement horizontal seul. */
          '[-webkit-overflow-scrolling:touch] [overscroll-behavior-x:contain] [touch-action:pan-x_pan-y]',
          className,
        )}
      >
        {children}
      </div>
    )
  }

  return (
    <div ref={sectionRef} className="overflow-hidden">
      <div
        ref={trackRef}
        className={cn('flex w-max items-end will-change-transform', className)}
      >
        <div ref={copyRef} className="flex items-end gap-[26px] pr-[26px]">
          {children}
        </div>
        {/* La copie prend le relais quand la première sort du cadre. */}
        <div aria-hidden="true" className="flex items-end gap-[26px] pr-[26px]">
          {children}
        </div>
      </div>
    </div>
  )
}
