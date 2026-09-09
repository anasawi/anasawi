'use client'

import Lenis from 'lenis'
import { useEffect } from 'react'

/**
 * Inertie de scroll.
 *
 * N'est montée ni sous `prefers-reduced-motion`, ni sur pointeur grossier
 * (tactile) : sur mobile, le scroll natif est déjà inertiel et le remplacer
 * dégrade la sensation autant que les performances.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(pointer: coarse)').matches
    if (reduced || coarse) return

    const lenis = new Lenis({
      lerp: 0.09,
      duration: 1.1,
      smoothWheel: true,
      gestureOrientation: 'vertical',
    })

    let frame = 0
    const raf = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)

    /* Les ancres passent par Lenis pour conserver l'inertie. */
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const anchor = target?.closest<HTMLAnchorElement>('a[href^="#"]')
      if (!anchor) return

      const id = anchor.getAttribute('href')
      if (!id || id === '#') return

      const el = document.querySelector(id)
      if (!el) return

      event.preventDefault()
      lenis.scrollTo(el as HTMLElement, { offset: -88, duration: 1.25 })
      window.history.replaceState(null, '', id)
    }

    document.addEventListener('click', onClick)

    return () => {
      document.removeEventListener('click', onClick)
      cancelAnimationFrame(frame)
      lenis.destroy()
    }
  }, [])

  return null
}
