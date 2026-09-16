'use client'

import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

/**
 * Remplissage liquide d'un bouton.
 *
 * Une bulle de couleur vit à l'intérieur du bouton : elle naît au point
 * d'entrée de la souris, gonfle jusqu'à couvrir tout le bouton, suit le
 * curseur tant qu'il reste dedans (avec un léger retard, comme de l'encre),
 * puis se résorbe au point de sortie. Le bouton, lui, ne bouge pas.
 *
 * À placer en premier enfant d'un bouton `relative overflow-hidden` ; le
 * libellé doit être au-dessus (`relative z-[1]`). Les écouteurs sont
 * posés sur le parent, donc le bouton reste un simple <a> ou <Link>.
 * Inactif sans pointeur fin ou sous prefers-reduced-motion.
 */
export function LiquidFill({ className }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const blob = ref.current
    const host = blob?.parentElement
    if (!blob || !host) return

    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (!fine || reduced) return

    const ink = blob.firstElementChild instanceof HTMLElement
      ? blob.firstElementChild
      : null

    let mx = 0
    let my = 0
    let bx = 0
    let by = 0
    let inside = false
    let frame = 0

    /* Diamètre : assez grand pour couvrir le bouton depuis n'importe quel
       point — la diagonale, doublée pour la marge. */
    const size = () => {
      if (!ink) return
      const r = host.getBoundingClientRect()
      const d = Math.hypot(r.width, r.height) * 2
      ink.style.width = `${d}px`
      ink.style.height = `${d}px`
    }

    const local = (event: MouseEvent) => {
      const r = host.getBoundingClientRect()
      return { x: event.clientX - r.left, y: event.clientY - r.top }
    }

    /* Position en rAF sur le porteur ; gonflement en transition CSS sur
       l'encre — deux éléments, sinon la transition freinerait le suivi. */
    const paint = () => {
      blob.style.transform = `translate(${bx}px, ${by}px)`
      if (ink) ink.style.transform = `scale(${inside ? 1 : 0})`
    }

    const loop = () => {
      /* L'encre suit avec retard ; à la sortie elle file vers la porte. */
      const ease = inside ? 0.14 : 0.3
      bx += (mx - bx) * ease
      by += (my - by) * ease
      paint()
      if (inside || Math.abs(mx - bx) > 0.5 || Math.abs(my - by) > 0.5) {
        frame = requestAnimationFrame(loop)
      } else {
        frame = 0
      }
    }

    const start = () => {
      if (!frame) frame = requestAnimationFrame(loop)
    }

    const onEnter = (event: MouseEvent) => {
      size()
      const p = local(event)
      mx = bx = p.x
      my = by = p.y
      inside = true
      paint()
      start()
    }

    const onMove = (event: MouseEvent) => {
      const p = local(event)
      mx = p.x
      my = p.y
      start()
    }

    const onLeave = (event: MouseEvent) => {
      const p = local(event)
      mx = p.x
      my = p.y
      inside = false
      start()
    }

    host.addEventListener('mouseenter', onEnter)
    host.addEventListener('mousemove', onMove, { passive: true })
    host.addEventListener('mouseleave', onLeave)

    return () => {
      cancelAnimationFrame(frame)
      host.removeEventListener('mouseenter', onEnter)
      host.removeEventListener('mousemove', onMove)
      host.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 will-change-transform"
    >
      <span
        className={cn(
          'absolute left-0 top-0 block -translate-x-1/2 -translate-y-1/2 rounded-full',
          /* Le gonflement est animé en CSS ; la position, en rAF. */
          'transition-transform duration-[600ms] ease-[var(--ease)]',
          className,
        )}
        style={{ transform: 'scale(0)' }}
      />
    </span>
  )
}
