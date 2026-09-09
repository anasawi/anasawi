'use client'

import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Logo } from './Logo'
import { cn, navHref } from '@/lib/utils'

export type NavItem = { label: string; anchor: string }

/**
 * En-tête qui se resserre au scroll : 92 → 68 px, fond ivoire translucide
 * avec flou, et un filet inférieur qui se révèle. Aucune animation JS de
 * layout — uniquement des transitions CSS sur des classes.
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
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Surlignage de l'entrée courante — un seul observer pour toutes les
     sections, plutôt qu'un calcul de position à chaque frame de scroll. */
  useEffect(() => {
    if (items.length === 0) return

    const targets = items
      /* Le scroll-spy ne concerne que les ancres de la page courante. */
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

  /* Menu mobile : verrouillage du scroll et fermeture à Échap. */
  useEffect(() => {
    if (!menuOpen) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.documentElement.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <>
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-[60] focus:bg-ink focus:px-5 focus:py-3 focus:text-[0.8rem] focus:uppercase focus:tracking-[0.14em] focus:text-ivory"
      >
        Aller au contenu
      </a>

      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-[height,background-color,border-color,backdrop-filter] duration-[400ms] ease-[var(--ease-out-soft)]',
          scrolled
            ? 'h-[68px] border-b border-line bg-ivory/85 backdrop-blur-[14px]'
            : 'h-[64px] border-b border-transparent bg-transparent md:h-[100px]',
        )}
      >
        <div className="container-editorial flex h-full items-center justify-between gap-8">
          <Link
            href="/"
            className="text-ink transition-opacity duration-500 hover:opacity-65"
            aria-label="AMASWI — accueil"
          >
            <Logo
              wordmarkClassName={cn(
                'transition-opacity duration-500',
                'max-[380px]:hidden',
              )}
            />
          </Link>

          {/* ── Navigation desktop ─────────────────────────────── */}
          <nav
            aria-label="Navigation principale"
            className="hidden items-center gap-9 lg:flex"
          >
            {items.map((item) => {
              const isActive = activeAnchor === item.anchor
              return (
                <a
                  key={item.anchor}
                  href={navHref(item.anchor)}
                  aria-current={isActive ? 'true' : undefined}
                  className="group relative py-1 text-[0.88rem] text-ink-soft transition-colors duration-500 hover:text-ink"
                >
                  {item.label}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute -bottom-0.5 left-0 h-px bg-blue-deep transition-[width] duration-500 ease-[var(--ease-out-soft)]',
                      isActive ? 'w-full' : 'w-0 group-hover:w-full',
                    )}
                  />
                </a>
              )
            })}

            <a
              href={ctaHref}
              className="rounded-[2px] border border-blue-deep px-6 py-2.5 text-[0.8rem] text-ink transition-colors duration-500 ease-[var(--ease-out-soft)] hover:bg-blue-deep hover:text-ivory"
            >
              {ctaLabel}
            </a>
          </nav>

          {/* ── Bouton menu mobile ─────────────────────────────── */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="menu-mobile"
            className="relative z-[60] flex h-11 w-11 items-center justify-center lg:hidden"
          >
            <span className="sr-only">
              {menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            </span>
            <span aria-hidden="true" className="relative block h-3 w-6">
              <span
                className={cn(
                  'absolute left-0 block h-px w-6 bg-ink transition-transform duration-500 ease-[var(--ease-out-soft)]',
                  menuOpen ? 'top-1.5 rotate-45' : 'top-0',
                )}
              />
              <span
                className={cn(
                  'absolute left-0 block h-px w-6 bg-ink transition-transform duration-500 ease-[var(--ease-out-soft)]',
                  menuOpen ? 'top-1.5 -rotate-45' : 'top-3',
                )}
              />
            </span>
          </button>
        </div>
      </header>

      {/* ── Menu mobile plein écran ──────────────────────────────
          Pensé pour le pouce : entrées larges, ordre inversé de
          l'importance, CTA en bas. Ce n'est pas le menu desktop réduit. */}
      <AnimatePresence>
        {menuOpen && (
          <m.div
            id="menu-mobile"
            initial={reduced ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex flex-col bg-ivory lg:hidden"
          >
            <nav
              aria-label="Navigation principale"
              className="flex flex-1 flex-col justify-center px-[var(--spacing-gutter)]"
            >
              {items.map((item, i) => (
                <m.a
                  key={item.anchor}
                  href={navHref(item.anchor)}
                  onClick={() => setMenuOpen(false)}
                  initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: reduced ? 0 : 0.08 + i * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="border-b border-line py-5 font-serif text-[1.75rem] text-ink"
                >
                  {item.label}
                </m.a>
              ))}
            </nav>

            <div className="px-[var(--spacing-gutter)] pb-14">
              <a
                href={ctaHref}
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center justify-center gap-3 rounded-[2px] bg-blue px-8 py-5 text-[0.82rem] uppercase tracking-[0.14em] text-ink"
              >
                {ctaLabel}
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* ── Barre d'action fixe, mobile uniquement ───────────────
          Apparaît une fois le hero dépassé. Le CTA reste atteignable
          sans remonter, sans occuper l'écran au premier regard. */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ivory/92 px-4 py-3 backdrop-blur-[10px] transition-transform duration-500 ease-[var(--ease-out-soft)] lg:hidden',
          scrolled && !menuOpen ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <a
          href={ctaHref}
          className="flex w-full items-center justify-center gap-3 rounded-[2px] bg-blue px-6 py-3.5 text-[0.78rem] uppercase tracking-[0.14em] text-ink"
        >
          {ctaLabel}
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </>
  )
}
