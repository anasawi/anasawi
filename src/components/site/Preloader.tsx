'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

/** Événement écouté par le Header pour déclencher son entrée. */
export const PRELOADER_DONE_EVENT = 'anasawi:ready'

/**
 * Vrai si l'on arrive de l'administration.
 *
 * Deux chemins possibles, tous deux synchrones : l'entrée de navigation
 * (l'URL sur laquelle CE document a été chargé — elle reste `/admin`
 * quand on passe à l'aperçu par une transition client, puisqu'aucun
 * nouveau document n'est créé) et, en repli, le référent (rechargement
 * complet depuis l'admin).
 */
function comesFromAdmin(): boolean {
  const isAdminPath = (href: string) => {
    try {
      const url = new URL(href, window.location.origin)
      return (
        url.origin === window.location.origin &&
        /^\/(admin|login)(\/|$|\?)/.test(url.pathname)
      )
    } catch {
      return false
    }
  }

  const [entry] = performance.getEntriesByType('navigation')
  if (entry instanceof PerformanceNavigationTiming && isAdminPath(entry.name)) {
    return true
  }

  return document.referrer ? isAdminPath(document.referrer) : false
}

/**
 * Rideau ivoire plein écran : le wordmark ANASAWI se lève depuis un masque,
 * l'astérisque ✳ tourne en bas, puis tout le rideau monte (~1.1s) et se
 * retire du DOM. Joue à chaque chargement complet de page — comme la
 * maquette validée ; jamais sous prefers-reduced-motion.
 *
 * Exception : quand on vient de l'administration. Anne fait l'aller-retour
 * éditeur ↔ aperçu des dizaines de fois par séance ; lui imposer les deux
 * secondes du rideau à chaque fois transformerait une signature en attente.
 * Le visiteur, lui, ne voit jamais l'admin : pour lui, rien ne change.
 *
 * Le rendu serveur affiche le rideau couvrant — c'est lui qui masque la
 * page pendant l'hydratation du premier chargement.
 */
export function Preloader() {
  const [phase, setPhase] = useState<'covering' | 'lifting' | 'done'>(
    'covering',
  )
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (reduced || comesFromAdmin()) {
      setPhase('done')
      window.dispatchEvent(new Event(PRELOADER_DONE_EVENT))
      return
    }

    /* Lève le wordmark une frame après le premier rendu. */
    const raf = requestAnimationFrame(() => setRevealed(true))

    const lift = window.setTimeout(() => {
      setPhase('lifting')
      window.dispatchEvent(new Event(PRELOADER_DONE_EVENT))
    }, 1150)

    const remove = window.setTimeout(() => setPhase('done'), 2300)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(lift)
      window.clearTimeout(remove)
    }
  }, [])

  if (phase === 'done') return null

  return (
    <div
      aria-hidden="true"
      data-anasawi-preloader=""
      className={cn(
        'fixed inset-0 z-[200] grid place-items-center bg-ivory',
        'transition-transform duration-1000 ease-[cubic-bezier(.76,0,.24,1)]',
        phase === 'lifting' && '-translate-y-full',
      )}
    >
      <div className="overflow-hidden">
        <span
          className={cn(
            'block pl-[0.3em] font-serif text-[clamp(30px,4.5vw,58px)] font-light tracking-[0.3em] text-ink',
            'transition-transform delay-[50ms] duration-[900ms] ease-[var(--ease)]',
            revealed ? 'translate-y-0' : 'translate-y-[110%]',
          )}
        >
          ANASAWI
        </span>
      </div>
      <span className="absolute bottom-9 left-1/2 -translate-x-1/2">
        <span className="block animate-[anasawi-spin_3.5s_linear_infinite] font-serif text-[18px] text-blue-deep">
          ✳
        </span>
      </span>
    </div>
  )
}
