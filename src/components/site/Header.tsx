'use client'

import Link from 'next/link'
import { m, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { PRELOADER_DONE_EVENT } from './Preloader'
import { anchorId, cn, navHref, toE164 } from '@/lib/utils'

export type NavItem = { label: string; anchor: string }

/** Courbe signature — la même que les primitives d'animation. */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** Point de bascule capsule complète / menu mobile : `lg` de Tailwind. */
const DESKTOP_QUERY = '(min-width: 1024px)'

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Navigation Α — « l'îlot flottant » de la planche V8.
 *
 * Capsule givrée détachée du bord (fixe, top 16px, centrée) : brand ✳ +
 * ANASAWI, liens en pastilles, bouton « Rendez-vous » plein. Elle reste
 * cachée (-140 %) tant que le préchargeur n'a pas fini, se cache en
 * descendant au-delà de ~260px et revient dès qu'on remonte.
 *
 * Sous 1024px, les pastilles cèdent la place à un bouton « Menu » (deux
 * traits fins qui se croisent à l'ouverture) : il déplie un panneau plein
 * écran fond nuit — liens en serif Cormorant grands, apparition en
 * cascade, coordonnées en méta en bas. Le défilement de la page est
 * bloqué tant qu'il est ouvert ; Échap, un lien ou la croix le referment.
 *
 * Les entrées viennent du CMS (sections « visibles dans la navigation »),
 * comme avant : même interface, même scroll-spy.
 */
export function Header({
  items,
  ctaLabel,
  ctaHref,
  phone = null,
  email = null,
}: {
  items: NavItem[]
  ctaLabel: string
  ctaHref: string
  /** Coordonnées affichées en bas du menu mobile — rien si absentes. */
  phone?: string | null
  email?: string | null
}) {
  const [entered, setEntered] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const reduced = useReducedMotion()
  const panelId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => setOpen(false), [])

  /* ── Entrée après le préchargeur ────────────────────────────────
     Sans préchargeur dans le DOM (aperçu, session déjà chargée), la
     capsule apparaît immédiatement ; sinon elle attend son signal,
     avec un garde-fou temporel. */
  useEffect(() => {
    let done = false
    const show = () => {
      if (!done) {
        done = true
        setEntered(true)
      }
    }

    if (!document.querySelector('[data-anasawi-preloader]')) {
      show()
      return
    }

    window.addEventListener(PRELOADER_DONE_EVENT, show)
    const failsafe = window.setTimeout(show, 1900)

    return () => {
      window.removeEventListener(PRELOADER_DONE_EVENT, show)
      window.clearTimeout(failsafe)
    }
  }, [])

  /* ── Cache à la descente, revient à la remontée ────────────────── */
  useEffect(() => {
    let last = window.scrollY

    const onScroll = () => {
      const y = window.scrollY
      const delta = y - last
      if (delta > 4 && y > 260) setHidden(true)
      else if (delta < -4) setHidden(false)
      last = y
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* ── Scroll-spy — un seul observer pour toutes les sections ────── */
  useEffect(() => {
    if (items.length === 0) return

    const targets = items
      /* Seules les ancres de la page courante sont concernées. */
      .filter(
        (item) => !item.anchor.startsWith('/') && !item.anchor.startsWith('http'),
      )
      .map((item) => document.getElementById(anchorId(item.anchor)))
      .filter((el): el is HTMLElement => el !== null)

    if (targets.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActiveAnchor(visible.target.id)
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5] },
    )

    for (const target of targets) observer.observe(target)
    return () => observer.disconnect()
  }, [items])

  /* ── Menu mobile : scroll bloqué, Échap, piège de focus, bascule
     desktop ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return

    const { body } = document
    const previousOverflow = body.style.overflow
    body.style.overflow = 'hidden'

    /* Le focus entre dans le panneau ; il revient au bouton à la
       fermeture. */
    const toggle = toggleRef.current
    const firstLink = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    firstLink?.focus({ preventScroll: true })

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        return
      }
      if (event.key !== 'Tab') return

      /* Piège simple : le bouton de la capsule + les éléments du
         panneau forment une boucle. */
      const inPanel = panelRef.current
        ? Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        : []
      const ring = toggle ? [toggle, ...inPanel] : inPanel
      if (ring.length === 0) return

      const first = ring[0]
      const last = ring[ring.length - 1]
      if (!first || !last) return

      const current = document.activeElement
      const inRing = current instanceof HTMLElement && ring.includes(current)
      if (event.shiftKey && (current === first || !inRing)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && current === last) {
        event.preventDefault()
        first.focus()
      }
    }

    /* Élargir la fenêtre au-delà de `lg` referme le menu : la capsule
       complète reprend la main. */
    const media = window.matchMedia(DESKTOP_QUERY)
    const onMedia = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false)
    }
    media.addEventListener('change', onMedia)
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
      media.removeEventListener('change', onMedia)
      body.style.overflow = previousOverflow
      toggle?.focus({ preventScroll: true })
    }
  }, [open])

  const showCapsule = entered && (!hidden || open)

  return (
    <>
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-[220] focus:bg-ink focus:px-5 focus:py-3 focus:text-[0.8rem] focus:uppercase focus:tracking-[0.14em] focus:text-ivory"
      >
        Aller au contenu
      </a>

      <header
        className={cn(
          'fixed left-1/2 top-4 z-[110] flex items-center gap-1.5',
          'rounded-full border border-line bg-[rgba(251,248,242,0.82)] py-[7px] pl-5 pr-2',
          'shadow-[0_10px_34px_rgba(43,47,44,0.07)] backdrop-blur-[16px]',
          'transition-transform duration-700 ease-[var(--ease)]',
          '-translate-x-1/2',
          /* Sous `lg`, la capsule ne dépasse jamais l'écran. */
          'max-lg:max-w-[calc(100vw-24px)] max-lg:pl-4',
          showCapsule ? 'translate-y-0' : 'translate-y-[-140%]',
        )}
      >
        <Link
          href="/"
          aria-label="ANASAWI — accueil"
          onClick={close}
          className="group mr-4 flex items-center gap-2.5 text-ink max-lg:mr-2"
        >
          <span
            aria-hidden="true"
            className="inline-block font-serif text-[17px] text-blue-deep transition-transform duration-700 ease-[var(--ease)] group-hover:rotate-180"
          >
            ✳
          </span>
          <span className="font-serif text-[15.5px] font-light tracking-[0.26em]">
            ANASAWI
          </span>
        </Link>

        {/* Pastilles — desktop uniquement. */}
        <nav
          aria-label="Navigation principale"
          className="hidden items-center gap-1.5 lg:flex"
        >
          {items.map((item) => {
            const isActive = activeAnchor === anchorId(item.anchor)
            return (
              <a
                key={item.anchor}
                href={navHref(item.anchor)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'rounded-full px-[13px] py-[9px] text-[10.5px] font-semibold uppercase tracking-[0.16em]',
                  'transition-colors duration-300',
                  isActive
                    ? 'bg-blue-mist text-blue-deep'
                    : 'text-ink-soft hover:bg-blue-mist hover:text-blue-deep',
                )}
              >
                {item.label}
              </a>
            )
          })}
        </nav>

        <a
          href={ctaHref}
          aria-label={ctaLabel}
          onClick={close}
          className={cn(
            'ml-2.5 whitespace-nowrap rounded-full bg-blue-deep px-5 py-[11px] text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ivory transition-colors duration-300 hover:bg-night',
            /* Compacte sous `lg` ; réduite à « RDV » sur les plus petits
               écrans pour que brand + pilule + menu tiennent à 360px. */
            'max-lg:ml-1 max-lg:px-4 max-lg:py-[9px]',
          )}
        >
          <span className="sm:hidden">RDV</span>
          <span className="hidden sm:inline">{ctaLabel}</span>
        </a>

        {/* Bouton « Menu » — deux traits fins, croix à l'ouverture. */}
        {items.length > 0 && (
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setOpen((v) => !v)}
            className="relative ml-0.5 grid size-[38px] shrink-0 place-items-center rounded-full text-ink transition-colors duration-300 hover:bg-blue-mist lg:hidden"
          >
            <span
              aria-hidden="true"
              className={cn(
                'absolute h-px w-[18px] bg-current transition-transform duration-500 ease-[var(--ease)]',
                open ? 'rotate-45' : '-translate-y-[3.5px]',
              )}
            />
            <span
              aria-hidden="true"
              className={cn(
                'absolute h-px w-[18px] bg-current transition-transform duration-500 ease-[var(--ease)]',
                open ? '-rotate-45' : 'translate-y-[3.5px]',
              )}
            />
          </button>
        )}
      </header>

      {/* ── Panneau mobile ─────────────────────────────────────────────
          Fond nuit plein écran, sous la capsule (qui reste visible pour
          fermer). Toujours monté : l'ouverture et la fermeture sont des
          transitions CSS, neutralisées par prefers-reduced-motion. */}
      {items.length > 0 && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal={open ? 'true' : undefined}
          aria-label="Menu"
          aria-hidden={!open}
          inert={!open ? true : undefined}
          className={cn(
            'fixed inset-0 z-[105] flex flex-col overflow-y-auto bg-night text-ivory lg:hidden',
            'transition-[opacity,visibility,transform] duration-700 ease-[var(--ease)]',
            open
              ? 'visible translate-y-0 opacity-100'
              : 'invisible -translate-y-3 opacity-0',
          )}
        >
          <nav
            aria-label="Navigation principale (mobile)"
            className="flex flex-1 flex-col justify-center px-[var(--spacing-gutter)] pb-10 pt-28"
          >
            <ul className="flex flex-col gap-1">
              {items.map((item, i) => {
                const isActive = activeAnchor === anchorId(item.anchor)
                const link = (
                  <a
                    href={navHref(item.anchor)}
                    aria-current={isActive ? 'true' : undefined}
                    onClick={close}
                    className={cn(
                      'group flex items-baseline gap-4 py-2.5 font-serif text-[clamp(34px,9vw,48px)] font-light leading-[1.1] tracking-[-0.01em]',
                      'transition-colors duration-300',
                      isActive ? 'text-ivory' : 'text-ivory/85 hover:text-ivory',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="w-7 shrink-0 font-sans text-[11px] font-semibold tracking-[0.24em] text-ivory/45"
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{item.label}</span>
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="ml-1 self-center font-serif text-[18px] text-blue"
                      >
                        ✳
                      </span>
                    )}
                  </a>
                )

                /* Cascade : chaque ligne monte depuis un masque, 70 ms
                   d'écart. Mouvement réduit : rendu direct. */
                if (reduced) {
                  return <li key={item.anchor}>{link}</li>
                }

                return (
                  <li key={item.anchor} className="overflow-hidden">
                    <m.div
                      initial={false}
                      animate={
                        open
                          ? { y: '0%', opacity: 1 }
                          : { y: '110%', opacity: 0 }
                      }
                      transition={
                        open
                          ? { duration: 0.9, ease: EASE, delay: 0.12 + i * 0.07 }
                          : { duration: 0.35, ease: EASE }
                      }
                    >
                      {link}
                    </m.div>
                  </li>
                )
              })}
            </ul>
          </nav>

          {(phone || email) && (
            <div className="border-t border-ivory/12 px-[var(--spacing-gutter)] pb-[max(28px,env(safe-area-inset-bottom))] pt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ivory/45">
                <span aria-hidden="true" className="font-serif text-[1.2em] font-normal normal-case tracking-normal">
                  ✳
                </span>
                &nbsp;&nbsp;Contact
              </p>
              <div className="mt-3 flex flex-col gap-1.5 text-[13px] leading-[1.7] text-ivory/80">
                {phone && (
                  <a
                    href={`tel:${toE164(phone)}`}
                    className="w-fit transition-colors duration-300 hover:text-ivory"
                  >
                    {phone}
                  </a>
                )}
                {email && (
                  <a
                    href={`mailto:${email}`}
                    className="w-fit break-all transition-colors duration-300 hover:text-ivory"
                  >
                    {email}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
