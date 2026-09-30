'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { signOutAction } from '@/server/actions/auth'

/**
 * Pastille flottante d'administration.
 *
 * Partagée par les deux côtés : le site public la monte après vérification
 * de session côté client, l'administration la rend sur chacun de ses
 * écrans. Trois zones : l'état, l'action principale (Modifier / Voir le
 * site), et l'avatar — qui ouvre un menu de compte : raccourcis vers les
 * écrans et déconnexion. Le menu s'ouvre vers le haut (la pastille est en
 * bas), se ferme à Échap ou d'un clic ailleurs, et rend le focus.
 */

export type PillMenuItem = { label: string; href: string }

const RACCOURCIS: PillMenuItem[] = [
  { label: 'Tableau de bord', href: '/admin' },
  { label: 'Mon site', href: '/admin/accueil' },
  { label: 'Médias', href: '/admin/medias' },
  { label: 'Utilisateurs', href: '/admin/utilisateurs' },
  { label: 'Réglages', href: '/admin/reglages' },
]

export function AdminPill({
  status,
  actionLabel,
  actionHref,
  actionDisabledHint,
  icon,
  name,
  email,
  className,
  newTab = false,
  dotClassName = 'bg-[#12b981]',
}: {
  /** Libellé d'état à gauche. Omis dans l'éditeur de page, qui porte
      déjà son indicateur en haut — un seul état à l'écran. */
  status?: string
  actionLabel: string
  /** Sans cible, l'action est inerte (page jamais publiée). */
  actionHref?: string
  /** Explication affichée au survol quand l'action est inerte. */
  actionDisabledHint?: string
  icon: React.ReactNode
  name: string
  /** Affiché dans le menu de compte, sous le nom. */
  email?: string
  className?: string
  /** Ouvre l'action dans un nouvel onglet. Sans usage aujourd'hui :
      « Voir le site » revient sur le site dans le même onglet — jamais
      une autre page, jamais un autre onglet. */
  newTab?: boolean
  /** Couleur de la pastille d'état — vert par défaut. */
  dotClassName?: string
}) {
  const initial = name.trim().charAt(0).toUpperCase() || 'A'
  const [ouvert, setOuvert] = useState(false)
  const bouton = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!ouvert) return
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (menu.current?.contains(t) || bouton.current?.contains(t)) return
      setOuvert(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOuvert(false)
        bouton.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [ouvert])

  const onMenuKey = (e: React.KeyboardEvent) => {
    const els = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    const i = els.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      els[(i + 1) % els.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      els[(i - 1 + els.length) % els.length]?.focus()
    }
  }

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 z-[45] flex justify-center px-4',
        className,
      )}
    >
      <nav
        /* Pas « Administration » : la sidebar du CMS porte déjà ce nom, et
           deux repères de navigation homonymes se confondent au lecteur
           d'écran. */
        aria-label="Raccourcis d’administration"
        className={cn(
          'pointer-events-auto flex items-center gap-1.5 rounded-full border border-black/5 bg-white/92 p-1.5 shadow-[0_6px_28px_-6px_rgba(28,32,30,0.22),0_2px_8px_-2px_rgba(28,32,30,0.12)] backdrop-blur-xl',
          status && 'pl-4',
        )}
      >
        {status && (
          <span className="flex items-center gap-2 pr-1 text-[0.8rem] text-ink-soft">
            <span
              aria-hidden="true"
              className={cn('h-1.5 w-1.5 rounded-full', dotClassName)}
            />
            {status}
          </span>
        )}

        {actionHref ? (
          <Link
            href={actionHref}
            target={newTab ? '_blank' : undefined}
            rel={newTab ? 'noopener' : undefined}
            className="flex items-center gap-2 rounded-full bg-ivory-warm px-4 py-2 text-[0.82rem] font-medium text-ink transition-colors duration-300 hover:bg-ivory-deep"
          >
            {icon}
            {actionLabel}
          </Link>
        ) : (
          /* Page jamais publiée : rien à voir en ligne — le bouton le dit
             au lieu de mener à une page introuvable. */
          <span
            title={actionDisabledHint}
            className="flex cursor-default items-center gap-2 rounded-full bg-ivory-warm/60 px-4 py-2 text-[0.82rem] text-ink-soft/70"
          >
            {icon}
            {actionLabel}
          </span>
        )}

        <div className="relative">
          <button
            ref={bouton}
            type="button"
            aria-label={`Compte — ${name}`}
            aria-haspopup="menu"
            aria-expanded={ouvert}
            aria-controls={ouvert ? menuId : undefined}
            title={name}
            onClick={() => setOuvert((v) => !v)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full bg-ivory-warm text-[0.78rem] font-medium text-ink-soft transition-colors duration-300 hover:bg-ivory-deep hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-deep/50',
              ouvert && 'bg-ivory-deep text-ink',
            )}
          >
            {initial}
          </button>

          {ouvert && (
            <div
              ref={menu}
              id={menuId}
              role="menu"
              aria-label="Menu du compte"
              onKeyDown={onMenuKey}
              className="absolute bottom-[calc(100%+10px)] right-0 w-[230px] rounded-[12px] border border-black/5 bg-white p-1.5 text-left shadow-[0_10px_30px_rgba(28,32,30,0.18)]"
            >
              <div className="px-2.5 pb-2 pt-1.5">
                <p className="truncate text-[0.82rem] font-medium text-ink">{name}</p>
                {email && <p className="truncate text-[0.74rem] text-ink-soft">{email}</p>}
              </div>
              <div role="separator" className="mx-1 mb-1 border-t border-black/5" />
              {RACCOURCIS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => setOuvert(false)}
                  className="block rounded-md px-2.5 py-2 text-[0.8rem] text-ink transition-colors hover:bg-ivory-warm focus-visible:bg-ivory-warm focus-visible:outline-none"
                >
                  {item.label}
                </Link>
              ))}
              <div role="separator" className="mx-1 my-1 border-t border-black/5" />
              <form action={signOutAction}>
                <button
                  type="submit"
                  role="menuitem"
                  tabIndex={-1}
                  className="block w-full rounded-md px-2.5 py-2 text-left text-[0.8rem] text-red-700 transition-colors hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none"
                >
                  Se déconnecter
                </button>
              </form>
            </div>
          )}
        </div>
      </nav>
    </div>
  )
}

/* Icônes inline plutôt que lucide-react : le site public n'embarque aucune
   bibliothèque d'icônes, et un import ici en tirerait le runtime entier. */

const iconProps = {
  viewBox: '0 0 24 24',
  width: 14,
  height: 14,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export function PencilIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

export function EyeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
