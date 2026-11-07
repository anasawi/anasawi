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
          /* Du verre IRISÉ, comme le bandeau du tableau de bord : un voile
             blanc très flou, et dessous une lumière arc-en-ciel pastel qui
             dérive lentement. Le liseré clair fait la tranche du verre. */
          'group/pilule pointer-events-auto relative isolate flex items-center gap-1.5 overflow-hidden rounded-full p-1.5',
          'bg-white/35 backdrop-blur-2xl backdrop-saturate-[1.8]',
          'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.75),inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(22,73,81,0.08),0_18px_44px_-14px_rgba(22,73,81,0.35)]',
          'animate-[adm-pilule-entree_0.9s_cubic-bezier(0.22,1,0.36,1)_both]',
          status && 'pl-3.5',
        )}
      >
        {/* L'arc-en-ciel : cyan, menthe, rose poudré, lavande — flouté, en dérive. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[60%] -z-10 bg-[radial-gradient(closest-side_at_14%_40%,rgba(160,232,236,1),transparent),radial-gradient(closest-side_at_40%_72%,rgba(184,232,206,0.95),transparent),radial-gradient(closest-side_at_66%_30%,rgba(248,196,214,1),transparent),radial-gradient(closest-side_at_90%_62%,rgba(206,196,250,1),transparent)] opacity-90 blur-[12px] motion-safe:animate-[adm-drift_14s_ease-in-out_infinite_alternate]"
        />
        {/* La tranche du verre : un liseré arc-en-ciel qui tourne doucement. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full p-px motion-safe:animate-[adm-tourne_9s_linear_infinite]"
          style={{
            background: 'conic-gradient(from var(--adm-angle, 0deg), rgba(126,214,220,0.9), rgba(170,226,190,0.9), rgba(246,190,210,0.9), rgba(196,184,248,0.9), rgba(126,214,220,0.9))',
            mask: 'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)',
            WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
          }}
        />
        {/* Un reflet qui traverse le verre au survol. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-1/3 -z-10 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 transition-[left,opacity] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/pilule:left-[110%] group-hover/pilule:opacity-100"
        />

        {status && (
          <span className="flex h-8 items-center gap-2 rounded-full bg-white/60 px-3 text-[0.8rem] font-medium text-[#164951] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]">
            <span aria-hidden="true" className="relative grid h-2 w-2 place-items-center">
              <span className={cn('absolute inset-0 rounded-full opacity-60 motion-safe:animate-[adm-ping_2s_cubic-bezier(0.22,1,0.36,1)_infinite]', dotClassName)} />
              <span className={cn('relative h-1.5 w-1.5 rounded-full', dotClassName)} />
            </span>
            {status}
          </span>
        )}

        {actionHref ? (
          <Link
            href={actionHref}
            target={newTab ? '_blank' : undefined}
            rel={newTab ? 'noopener' : undefined}
            className="group/action relative flex h-9 items-center gap-2 overflow-hidden rounded-full bg-[#164951] px-4 text-[0.82rem] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_16px_-6px_rgba(22,73,81,0.6)] transition-[transform,translate,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_22px_-8px_rgba(22,73,81,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#164951]"
          >
            <span className="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/action:-rotate-12">{icon}</span>
            {actionLabel}
          </Link>
        ) : (
          /* Page jamais publiée : rien à voir en ligne — le bouton le dit
             au lieu de mener à une page introuvable. */
          <span
            title={actionDisabledHint}
            className="flex h-9 cursor-default items-center gap-2 rounded-full bg-white/50 px-4 text-[0.82rem] text-[#46606c]/70"
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
              'flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-[0.8rem] font-semibold text-[#164951] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)] transition-[background-color,transform] duration-300 hover:scale-[1.04] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176c79]/50',
              ouvert && 'bg-white',
            )}
          >
            {initial}
          </button>
        </div>
      </nav>

      {/* Le menu de compte, hors du verre (qui coupe ce qui déborde) : posé
          au-dessus de la pastille, dans le même verre. */}
      {ouvert && (
        <div className="pointer-events-none absolute inset-x-0 bottom-full flex justify-center px-4 pb-2.5">
          <div
            ref={menu}
            id={menuId}
            role="menu"
            aria-label="Menu du compte"
            onKeyDown={onMenuKey}
            className="pointer-events-auto relative isolate w-[240px] overflow-hidden rounded-[18px] bg-white/[0.92] p-1.5 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8),0_20px_50px_-16px_rgba(22,73,81,0.35)] backdrop-blur-2xl backdrop-saturate-[1.8] animate-[adm-pilule-menu_0.35s_cubic-bezier(0.22,1,0.36,1)_both]"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-[40%] -z-10 bg-[radial-gradient(closest-side_at_20%_20%,rgba(196,240,242,0.7),transparent),radial-gradient(closest-side_at_85%_85%,rgba(246,214,224,0.6),transparent)] blur-[16px]"
            />
            <div className="px-2.5 pb-2 pt-1.5">
              <p className="truncate text-[0.82rem] font-semibold text-[#164951]">{name}</p>
              {email && <p className="truncate text-[0.74rem] text-[#46606c]">{email}</p>}
            </div>
            <div role="separator" className="mx-1 mb-1 border-t border-[#164951]/10" />
            {RACCOURCIS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                tabIndex={-1}
                onClick={() => setOuvert(false)}
                className="block rounded-[10px] px-2.5 py-2 text-[0.8rem] text-[#164951] transition-colors hover:bg-white/80 focus-visible:bg-white/80 focus-visible:outline-none"
              >
                {item.label}
              </Link>
            ))}
            <div role="separator" className="mx-1 my-1 border-t border-[#164951]/10" />
            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                tabIndex={-1}
                className="block w-full rounded-[10px] px-2.5 py-2 text-left text-[0.8rem] text-red-700 transition-colors hover:bg-red-50/80 focus-visible:bg-red-50/80 focus-visible:outline-none"
              >
                Se déconnecter
              </button>
            </form>
          </div>
        </div>
      )}
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
