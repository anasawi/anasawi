'use client'

import { animate, m, useMotionValue } from 'motion/react'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { createPortal } from 'react-dom'

import { ActionLink } from '@/components/site/ActionLink'
import { EASE, useAnimEnabled } from '@/components/site/anim'
import { BlockImage } from '@/components/site/BlockImage'
import { Eyebrow } from '@/components/site/Eyebrow'
import { Prose } from '@/components/site/Prose'
import { cn } from '@/lib/utils'
import type { ServiceWithMedia } from '@/server/db/schema'
import { numberWordFr } from '@/lib/format'

/*
 * Fiche d'un accompagnement — le panneau qui s'ouvre depuis une liste.
 *
 * Deux gestes selon l'écran, un seul composant :
 *   - large : une carte flottante qui glisse depuis la droite, détachée des
 *     bords et arrondie comme l'îlot de navigation ;
 *   - étroit : une feuille qui monte du bas, qu'on referme en la tirant
 *     vers le bas — le geste natif du téléphone.
 *
 * Se ferme par la croix, Échap, un clic hors du panneau, le bouton Retour
 * du navigateur (le parent gère l'URL) et, au doigt, le glissement.
 *
 * Cycle de vie tenu à la main, en trois phases (fermé → ouvert → en
 * fermeture → fermé) : l'élément reste monté le temps que l'animation de
 * sortie joue, puis disparaît quand elle le signale. On n'y confie pas
 * AnimatePresence, dont le démontage différé s'est révélé capricieux ici
 * (le menu mobile du site contourne le même écueil en restant monté).
 *
 * Accessibilité : rôle dialog modal, focus posé sur la croix à l'ouverture
 * et rendu à l'élément déclencheur à la fermeture, tabulation confinée au
 * panneau, défilement de la page bloqué derrière. Le portail vers <body>
 * l'affranchit du contexte d'empilement de la section qui l'a ouvert.
 */


const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

const WIDE_QUERY = '(min-width: 768px)'

function subscribeWide(onChange: () => void) {
  const media = window.matchMedia(WIDE_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

/**
 * Vrai au-dessus du point de rupture `md` de Tailwind (768px).
 *
 * Lu comme un magasin externe plutôt que posé dans un état par effet :
 * la valeur est juste dès le premier rendu client, sans un rendu « faux
 * puis vrai » qui faisait partir la carte du bas de l'écran avant de la
 * rattraper à droite. Le serveur, lui, ne rend rien (voir `monte`).
 */
function useIsWide(): boolean {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false,
  )
}

/**
 * Vrai une fois hydraté — le portail vers <body> n'existe qu'alors.
 * Même mécanisme : `useSyncExternalStore` rend `false` pour le serveur
 * et l'hydratation, `true` ensuite, sans effet ni re-rendu superflu.
 */
function useMonte(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )
}

type Phase = 'closed' | 'open' | 'closing'

/** Durées, en secondes — la sortie plus vive que l'entrée. */
const ENTER_S = 0.55
const EXIT_S = 0.32
const EXIT_MS = EXIT_S * 1000

export function ServicePanel({
  service,
  index,
  onClose,
  onLeave = onClose,
  bookingHref,
  ctaLabel = 'Prendre rendez-vous',
}: {
  /** L'accompagnement à afficher ; `null` ferme le panneau. */
  service: ServiceWithMedia | null
  /** Position dans la liste, pour l'index en toutes lettres. */
  index: number
  onClose: () => void
  /**
   * Fermeture quand on QUITTE la fiche par son bouton d'action : le
   * parent peut y nettoyer l'adresse sans remonter l'historique — un
   * `history.back()` en concurrence avec la navigation qui suit
   * rouvrirait la fiche au hasard des délais.
   */
  onLeave?: () => void
  bookingHref: string
  ctaLabel?: string
}) {
  const on = useAnimEnabled()
  const wide = useIsWide()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnFocusTo = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const open = service !== null

  /* Portail : n'existe qu'après montage, le serveur ne rend rien. */
  const mounted = useMonte()

  /* ── Cycle de vie ─────────────────────────────────────────────────────
     `shown` garde la dernière fiche affichée pour continuer à la rendre
     pendant que le panneau se referme — `service` est déjà null. */
  const [phase, setPhase] = useState<Phase>('closed')
  const shown = useRef<{ service: ServiceWithMedia; index: number } | null>(
    null,
  )

  useEffect(() => {
    if (service) {
      shown.current = { service, index }
      setPhase('open')
      return
    }
    /* Sans animation, rien à attendre : on démonte tout de suite. */
    setPhase((current) =>
      current === 'open' ? (on ? 'closing' : 'closed') : current,
    )
  }, [service, index, on])

  /* Démontage à l'issue de la sortie, tenu par une minuterie calée sur sa
     durée : le rappel de fin d'animation de Motion ne s'est pas montré
     fiable ici, et un panneau fantôme resterait sinon dans le DOM. */
  useEffect(() => {
    if (phase !== 'closing') return
    const timer = window.setTimeout(() => setPhase('closed'), EXIT_MS + 60)
    return () => window.clearTimeout(timer)
  }, [phase])

  /* Position de la feuille sous le doigt (écran étroit). */
  const dragY = useMotionValue(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  /* ── Focus, clavier, défilement ───────────────────────────────────── */
  useEffect(() => {
    if (!open) return

    returnFocusTo.current = document.activeElement as HTMLElement | null
    dragY.set(0)
    const root = document.documentElement
    const previousOverflow = root.style.overflow
    root.style.overflow = 'hidden'

    /* Le panneau n'existe qu'après le rendu qui suit le changement de phase. */
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 30)

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return

      const focusables = [
        ...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ]
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (!first || !last) return

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKey)
      root.style.overflow = previousOverflow
      returnFocusTo.current?.focus?.()
    }
  }, [open, onClose, dragY])

  /* ── Glissement vers le bas, sur écran étroit ───────────────────────
     Geste maison sur une valeur de mouvement : Motion n'est chargé qu'avec
     `domAnimation`, qui n'inclut pas `drag`. Le tirage ne commence que si
     le contenu est en haut de son défilement — sinon on défile, on ne
     referme pas. Au relâché : au-delà de 110px ou d'un geste vif, on
     ferme ; sinon la feuille revient en place. */
  const touch = useRef<{ startY: number; startAt: number; active: boolean }>({
    startY: 0,
    startAt: 0,
    active: false,
  })

  const onTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (wide || !on) return
      const t = event.touches[0]
      if (!t) return
      touch.current = {
        startY: t.clientY,
        startAt: performance.now(),
        active: (scrollRef.current?.scrollTop ?? 0) <= 0,
      }
    },
    [wide, on],
  )

  const onTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (!touch.current.active) return
      const t = event.touches[0]
      if (!t) return
      const dy = t.clientY - touch.current.startY
      /* Vers le haut : on rend la main au défilement du contenu. */
      dragY.set(dy <= 0 ? 0 : dy)
    },
    [dragY],
  )

  const onTouchEnd = useCallback(() => {
    if (!touch.current.active) return
    const dy = dragY.get()
    const elapsed = Math.max(1, performance.now() - touch.current.startAt)
    const velocity = (dy / elapsed) * 1000
    touch.current.active = false

    if (dy > 110 || velocity > 600) {
      onClose()
      return
    }
    animate(dragY, 0, { duration: 0.45, ease: EASE })
  }, [dragY, onClose])

  if (!mounted || phase === 'closed' || !shown.current) return null

  const { service: fiche, index: rang } = shown.current
  const isOpen = phase === 'open'
  const offscreen = wide ? { x: '108%', y: 0 } : { x: 0, y: '108%' }

  return createPortal(
    /* z-150 : au-dessus de l'îlot de navigation (110) et du menu mobile
       (105), sous le préchargeur (200) et le curseur (209). Pendant la
       fermeture, le calque laisse passer les clics. */
    <m.div
      className={cn('fixed inset-0 z-[150]', !isOpen && 'pointer-events-none')}
      initial={{ opacity: 0 }}
      animate={{ opacity: isOpen ? 1 : 0 }}
      transition={{ duration: on ? (isOpen ? 0.5 : EXIT_S) : 0, ease: EASE }}
      aria-hidden={!isOpen}
    >
      {/* Voile — le fond nuit, adouci, qui floute la page derrière. */}
      <div
        className="absolute inset-0 bg-night/35 backdrop-blur-[6px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Le conteneur positionne et joue l'entrée/sortie ; la feuille à
          l'intérieur suit le doigt. Deux éléments, parce qu'un même `y`
          ne peut pas être piloté à la fois par `animate` et par le geste.
          Sortie plus vive que l'entrée : on referme d'un geste. */}
      <m.div
        className={cn(
          'absolute',
          /* Étroit : depuis le bas, en laissant respirer le haut. */
          'inset-x-0 bottom-0 top-[7vh]',
          /* Large : carte flottante à droite, détachée des bords. */
          'md:inset-auto md:bottom-3 md:right-3 md:top-3 md:w-[min(600px,92vw)]',
        )}
        initial={offscreen}
        animate={isOpen ? { x: 0, y: 0 } : offscreen}
        transition={{ duration: on ? (isOpen ? ENTER_S : EXIT_S) : 0, ease: EASE }}
      >
        <m.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          style={{ y: dragY }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
          className="relative flex h-full w-full flex-col overflow-hidden rounded-t-[28px] bg-ivory text-ink shadow-[0_30px_80px_-20px_rgba(46,66,79,0.45)] md:rounded-[32px]"
        >
          {/* Poignée — visible seulement sur écran étroit. */}
          <span
            aria-hidden="true"
            className="mx-auto mt-3 block h-1 w-10 shrink-0 rounded-full bg-line-strong md:hidden"
          />

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer la fiche"
            data-cursor-stick
            className="absolute right-4 top-4 z-[2] flex h-11 w-11 items-center justify-center rounded-full border border-line bg-ivory/85 text-ink backdrop-blur transition-[background-color,border-color,transform] duration-[350ms] ease-[var(--ease)] hover:border-ink hover:bg-ivory active:scale-95 md:right-5 md:top-5"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-[13px] w-[13px]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            >
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>

          <div
            ref={scrollRef}
            className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-7 pb-10 pt-12 md:px-12 md:pb-14 md:pt-16"
          >
            <Stagger on={on} delay={0.18}>
              <Eyebrow>
                Accompagnement · {numberWordFr(rang)}
              </Eyebrow>
            </Stagger>

            <Stagger on={on} delay={0.24}>
              <h2
                id={titleId}
                className="mt-5 font-serif text-[clamp(2rem,4.6vw,3.1rem)] font-light leading-[1.05]"
              >
                {fiche.title}
              </h2>
            </Stagger>

            {fiche.media && (
              <Stagger on={on} delay={0.3}>
                <BlockImage
                  media={fiche.media}
                  sizes="(max-width: 768px) 92vw, 540px"
                  className="mt-8 aspect-[4/3] w-full rounded-arch"
                  instant
                />
              </Stagger>
            )}

            {fiche.excerpt && (
              <Stagger on={on} delay={0.36}>
                <p className="mt-8 text-[length:var(--text-lead)] leading-[1.7] text-ink">
                  {fiche.excerpt}
                </p>
              </Stagger>
            )}

            {fiche.body && (
              <Stagger on={on} delay={0.42}>
                <Prose text={fiche.body} className="mt-6" />
              </Stagger>
            )}

            {fiche.duration && (
              <Stagger on={on} delay={0.48}>
                <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
                  {fiche.duration}
                </p>
              </Stagger>
            )}

            <Stagger on={on} delay={0.54}>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                {/* La fiche se referme AVANT de suivre le lien : vers
                    l'ancre `#contact`, on doit voir la section arriver,
                    pas la deviner derrière un voile ; vers l'agenda en
                    ligne, revenir sur le site ne doit pas rouvrir la
                    fiche. */}
                <ActionLink
                  href={bookingHref}
                  variant="primary"
                  onClick={onLeave}
                >
                  {ctaLabel}
                </ActionLink>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft transition-colors duration-300 hover:text-ink"
                >
                  Fermer
                </button>
              </div>
            </Stagger>
          </div>
        </m.div>
      </m.div>
    </m.div>,
    document.body,
  )
}

/** Apparition en cascade du contenu, une fois le panneau en place. */
function Stagger({
  on,
  delay,
  children,
}: {
  on: boolean
  delay: number
  children: React.ReactNode
}) {
  if (!on) return <div>{children}</div>
  return (
    <m.div
      initial={{ opacity: 0, y: 18, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      /* Les délais des fiches sont écrits en absolu (0.2, 0.48, 0.54…) :
         ramenés de moitié, l'ordre reste, le bouton arrive avant qu'on
         ne le cherche. */
      transition={{ duration: 0.6, ease: EASE, delay: delay * 0.55 }}
    >
      {children}
    </m.div>
  )
}
