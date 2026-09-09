'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { PRELOADER_DONE_EVENT } from './Preloader'
import { cn, navHref } from '@/lib/utils'

export type NavItem = { label: string; anchor: string }

/**
 * Navigation Α — « l'îlot flottant » de la planche V8.
 *
 * Capsule givrée détachée du bord (fixe, top 16px, centrée) : brand ✳ +
 * AMASWI, liens en pastilles, bouton « Rendez-vous » plein. Elle reste
 * cachée (-140 %) tant que le préchargeur n'a pas fini, se cache en
 * descendant au-delà de ~260px et revient dès qu'on remonte.
 *
 * Les entrées viennent du CMS (sections « visibles dans la navigation »),
 * comme avant : même interface, même scroll-spy.
 */
export function Header({
  items,
  ctaLabel,
  ctaHref,
}: {
  items: NavItem[]
  ctaLabel: string
  ctaHref: string
}) {
  const [entered, setEntered] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null)

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

    if (!document.querySelector('[data-amaswi-preloader]')) {
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
      .map((item) => document.getElementById(item.anchor))
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
          'rounded-full border border-line bg-ivory/80 py-[7px] pl-5 pr-2',
          'shadow-[0_10px_34px_rgba(43,47,44,0.07)] backdrop-blur-[16px]',
          'transition-transform duration-700 ease-[var(--ease)]',
          '-translate-x-1/2',
          entered && !hidden ? 'translate-y-0' : 'translate-y-[-140%]',
        )}
      >
        <Link
          href="/"
          aria-label="AMASWI — accueil"
          className="group mr-4 flex items-center gap-2.5 text-ink"
        >
          <span
            aria-hidden="true"
            className="inline-block font-serif text-[17px] text-blue-deep transition-transform duration-700 ease-[var(--ease)] group-hover:rotate-180"
          >
            ✳
          </span>
          <span className="font-serif text-[15.5px] font-light tracking-[0.26em]">
            AMASWI
          </span>
        </Link>

        <nav
          aria-label="Navigation principale"
          className="hidden items-center gap-1.5 md:flex"
        >
          {items.map((item) => {
            const isActive = activeAnchor === item.anchor
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
          className="ml-2.5 rounded-full bg-blue-deep px-5 py-[11px] text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ivory transition-colors duration-300 hover:bg-night"
        >
          {ctaLabel}
        </a>
      </header>
    </>
  )
}
