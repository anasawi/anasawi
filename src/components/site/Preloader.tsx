'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

/** Clé de session : le préchargeur ne joue qu'une fois par visite. */
const SESSION_KEY = 'amaswi-loaded'

/** Événement écouté par le Header pour déclencher son entrée. */
export const PRELOADER_DONE_EVENT = 'amaswi:ready'

function alreadyLoaded(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Rideau ivoire plein écran : le wordmark AMASWI se lève depuis un masque,
 * l'astérisque ✳ tourne en bas, puis tout le rideau monte (~1.1s) et se
 * retire du DOM. Une fois par session ; jamais sous prefers-reduced-motion.
 *
 * Le rendu serveur affiche le rideau couvrant — c'est lui qui masque la
 * page pendant l'hydratation du premier chargement. Sur les chargements
 * suivants de la session, l'effet le retire au premier commit.
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

    if (reduced || alreadyLoaded()) {
      setPhase('done')
      window.dispatchEvent(new Event(PRELOADER_DONE_EVENT))
      return
    }

    /* Lève le wordmark une frame après le premier rendu. */
    const raf = requestAnimationFrame(() => setRevealed(true))

    const lift = window.setTimeout(() => {
      setPhase('lifting')
      try {
        window.sessionStorage.setItem(SESSION_KEY, '1')
      } catch {
        /* Stockage indisponible : le rideau rejouera, sans conséquence. */
      }
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
      data-amaswi-preloader=""
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
          AMASWI
        </span>
      </div>
      <span className="absolute bottom-9 left-1/2 -translate-x-1/2">
        <span className="block animate-[amaswi-spin_3.5s_linear_infinite] font-serif text-[18px] text-blue-deep">
          ✳
        </span>
      </span>
    </div>
  )
}
