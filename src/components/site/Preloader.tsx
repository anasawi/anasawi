'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'
import {
  PRELOADER_DONE_EVENT,
  PRELOADER_HTML_ATTRIBUTE,
  PRELOADER_SESSION_KEY,
} from './preloader-boot'

/* Ré-exporté pour les composants clients qui l'écoutent (Header). */
export { PRELOADER_DONE_EVENT }

/**
 * Rideau ivoire plein écran : le wordmark ANASAWI se lève depuis un masque,
 * l'astérisque ✳︎ tourne en bas, puis tout le rideau monte (~0.7s) et se
 * retire du DOM. Joue au premier chargement de la visite — comme la
 * maquette validée, en plus bref ; jamais sous prefers-reduced-motion.
 *
 * Le rendu serveur contient toujours le rideau, mais masqué par CSS tant
 * que `<html>` ne porte pas `data-rideau` : c'est le script d'amorçage
 * qui le pose, avant le premier rendu, quand le rideau doit jouer. Le
 * composant, lui, ne fait que lire cette décision — et signale TOUJOURS
 * sa fin au Header, qu'il ait joué ou non.
 */
export function Preloader() {
  const [phase, setPhase] = useState<'covering' | 'lifting' | 'done'>(
    'covering',
  )
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const joue = root.getAttribute(PRELOADER_HTML_ATTRIBUTE) === '1'

    /* Une fois par visite : la signature se joue au premier chargement,
       pas à chaque page ni à chaque retour arrière — une seconde de
       rideau à chaque fois, c'est un site qui paraît lent. La clé est
       posée quel que soit le verdict, comme avant : revenir de l'admin
       puis recharger ne doit pas faire jouer le rideau. */
    try {
      window.sessionStorage.setItem(PRELOADER_SESSION_KEY, '1')
    } catch {
      /* Stockage indisponible : rien à retenir. */
    }

    if (!joue) {
      setPhase('done')
      /* Signal différé d'un tour : le Header, monté juste après, doit
         avoir posé son écouteur — sinon il attendait son garde-fou. */
      const signal = window.setTimeout(
        () => window.dispatchEvent(new Event(PRELOADER_DONE_EVENT)),
        0,
      )
      return () => window.clearTimeout(signal)
    }

    /* Lève le wordmark une frame après le premier rendu. */
    const raf = requestAnimationFrame(() => setRevealed(true))

    const lift = window.setTimeout(() => {
      setPhase('lifting')
      window.dispatchEvent(new Event(PRELOADER_DONE_EVENT))
    }, 750)

    const remove = window.setTimeout(() => {
      setPhase('done')
      root.removeAttribute(PRELOADER_HTML_ATTRIBUTE)
    }, 1500)

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
        'transition-transform duration-700 ease-[cubic-bezier(.76,0,.24,1)]',
        phase === 'lifting' && '-translate-y-full',
      )}
    >
      <div className="overflow-hidden">
        <span
          className={cn(
            'block pl-[0.3em] font-serif text-[clamp(30px,4.5vw,58px)] font-light tracking-[0.3em] text-ink',
            'transition-transform delay-[30ms] duration-[650ms] ease-[var(--ease)]',
            revealed ? 'translate-y-0' : 'translate-y-[110%]',
          )}
        >
          ANASAWI
        </span>
      </div>
      <span className="absolute bottom-9 left-1/2 -translate-x-1/2">
        <span className="block animate-[anasawi-spin_3.5s_linear_infinite] font-serif text-[18px] text-blue-deep">
          ✳︎
        </span>
      </span>
    </div>
  )
}
