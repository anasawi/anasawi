'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Curseur personnalisé de la maquette : un point de 8px collé au pointeur,
 * un anneau de 34px qui suit avec retard (lerp .16). Sur les éléments
 * interactifs (a, button, [data-cursor]) l'anneau grossit à 76px et se
 * remplit de bleu profond ; `data-cursor="glisser"` y affiche un libellé.
 *
 * Monté uniquement si (hover:hover) et (pointer:fine), jamais sous
 * prefers-reduced-motion. Tant qu'il est actif, `html.amaswi-cursor`
 * masque le curseur natif (voir globals.css).
 */
export function CustomCursor() {
  const [active, setActive] = useState(false)
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (!fine || reduced) return

    setActive(true)
    document.documentElement.classList.add('amaswi-cursor')

    let mx = window.innerWidth / 2
    let my = window.innerHeight / 2
    let rx = mx
    let ry = my

    const onMove = (event: MouseEvent) => {
      mx = event.clientX
      my = event.clientY
    }

    const onOver = (event: MouseEvent) => {
      const ring = ringRef.current
      const label = labelRef.current
      if (!ring || !label) return

      const target =
        event.target instanceof Element ? event.target : null
      const zone = target?.closest<HTMLElement>('[data-cursor]') ?? null
      const interactive = target?.closest('a, button') ?? null

      if (zone) {
        ring.dataset.big = 'true'
        label.textContent = zone.dataset.cursor ?? ''
      } else if (interactive) {
        ring.dataset.big = 'true'
        label.textContent = ''
      } else {
        delete ring.dataset.big
        label.textContent = ''
      }
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseover', onOver)

    let frame = 0
    const loop = () => {
      rx += (mx - rx) * 0.16
      ry += (my - ry) * 0.16
      const dot = dotRef.current
      const ring = ringRef.current
      if (dot) {
        dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`
      }
      if (ring) {
        ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onOver)
      document.documentElement.classList.remove('amaswi-cursor')
      setActive(false)
    }
  }, [])

  if (!active) return null

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[210] size-2 rounded-full bg-blue-deep"
      />
      <div
        ref={ringRef}
        aria-hidden="true"
        className="group pointer-events-none fixed left-0 top-0 z-[209] grid size-[34px] place-items-center rounded-full border border-[rgba(70,114,138,0.45)] transition-[width,height,background-color,border-color] duration-[350ms] ease-[var(--ease)] data-[big=true]:size-[76px] data-[big=true]:border-blue-deep data-[big=true]:bg-blue-deep"
      >
        <span
          ref={labelRef}
          className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-ivory opacity-0 transition-opacity duration-[250ms] group-data-[big=true]:opacity-100"
        />
      </div>
    </>
  )
}
