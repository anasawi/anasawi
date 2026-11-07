'use client'

import Link, { useLinkStatus } from 'next/link'
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

/**
 * Le verre de la pastille. Chrome et Edge DÉFORMENT ce qui est derrière
 * (filtre SVG `#adm-verre`), puis le floutent et l'avivent. Safari ne sait
 * pas déformer : il garde la déclaration préfixée, un grand flou seul.
 * L'ordre compte — la préfixée d'abord, la standard ensuite.
 */
const VERRE: React.CSSProperties = {
  WebkitBackdropFilter: 'blur(14px) saturate(1.9) brightness(0.92)',
  backdropFilter: 'url(#adm-verre) blur(1.5px) saturate(1.9) brightness(0.92)',
}
/** Le même verre pour le menu, un peu plus flou : du texte s'y lit. */
const VERRE_MENU: React.CSSProperties = {
  WebkitBackdropFilter: 'blur(18px) saturate(1.9) brightness(0.85)',
  backdropFilter: 'url(#adm-verre) blur(4px) saturate(1.9) brightness(0.85)',
}

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
          /* Du verre BLEU NUIT : la page se devine dessous, très floue. Un
             liseré clair fait la tranche, une lueur pastel monte du bas. */
          'group/pilule pointer-events-auto relative isolate flex items-center gap-1.5 overflow-hidden rounded-full p-1.5',
          'bg-[#1b3440]/30',
          'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),inset_0_1px_0_rgba(255,255,255,0.16),0_2px_6px_rgba(16,36,44,0.18),0_20px_48px_-14px_rgba(16,36,44,0.55)]',
          'animate-[adm-pilule-entree_0.9s_cubic-bezier(0.22,1,0.36,1)_both]',
          status && 'pl-3.5',
        )}
        style={VERRE}
      >
        {/* Le verre DÉFORMANT : un bruit doux sert de carte de relief, et
            décale ce qui est derrière — comme à travers un verre soufflé. */}
        <svg aria-hidden="true" width="0" height="0" className="absolute">
          <filter id="adm-verre" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="2" seed="11" result="bruit" />
            <feGaussianBlur in="bruit" stdDeviation="2.5" result="relief" />
            <feDisplacementMap in="SourceGraphic" in2="relief" scale="38" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
        {/* Le reflet du verre : une lumière en haut, une ombre douce en bas. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.04)_45%,rgba(0,0,0,0.12)_100%)]"
        />
        {/* Une lueur irisée, très douce, au fond du verre — l'écho du bouton. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[60%] -z-10 bg-[radial-gradient(closest-side_at_30%_80%,rgba(120,210,220,0.22),transparent),radial-gradient(closest-side_at_75%_85%,rgba(236,170,200,0.18),transparent)] blur-[14px] motion-safe:animate-[adm-drift_14s_ease-in-out_infinite_alternate]"
        />

        {status && (
          <span className="flex h-8 items-center gap-2 rounded-full bg-white/[0.08] px-3 text-[0.8rem] font-medium text-white/85 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
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
            /* Préchargé : l'éditeur est prêt avant le clic. */
            prefetch
            target={newTab ? '_blank' : undefined}
            rel={newTab ? 'noopener' : undefined}
            className="group/action relative isolate flex h-9 items-center gap-2 overflow-hidden rounded-full px-4 text-[0.82rem] font-semibold text-[#164951] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55),inset_0_1px_0_rgba(255,255,255,0.9),0_6px_20px_-6px_rgba(170,200,240,0.55)] transition-[transform,translate,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7),inset_0_1px_0_rgba(255,255,255,0.95),0_10px_26px_-6px_rgba(200,180,240,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b3440]"
          >
            {/* L'ARC-EN-CIEL : cyan, menthe, rose, lavande, en dégradé qui tourne
                lentement — et plus vite au survol. */}
            <span
              aria-hidden="true"
              className="absolute -inset-[120%] -z-10 motion-safe:animate-[adm-tourne-rotation_8s_linear_infinite] group-hover/action:[animation-duration:2.5s]"
              style={{ background: 'conic-gradient(from 0deg, #8fdde3, #b2e8bf, #f3e09c, #f2b3cb, #c7b8f4, #9fcbf2, #8fdde3)' }}
            />
            {/* Un voile laiteux pour l'adoucir, et un reflet qui passe au survol. */}
            <span aria-hidden="true" className="absolute inset-0 -z-10 bg-white/10" />
            <span
              aria-hidden="true"
              className="absolute inset-y-0 -left-1/2 -z-10 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 transition-[left,opacity] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/action:left-[120%] group-hover/action:opacity-100"
            />
            <EtatAction icon={icon} label={actionLabel} />
          </Link>
        ) : (
          /* Page jamais publiée : rien à voir en ligne — le bouton le dit
             au lieu de mener à une page introuvable. */
          <span
            title={actionDisabledHint}
            className="flex h-9 cursor-default items-center gap-2 rounded-full bg-white/[0.08] px-4 text-[0.82rem] text-white/50"
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
              'flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.1] text-[0.8rem] font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] transition-[background-color,transform] duration-300 hover:scale-[1.04] hover:bg-white/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
              ouvert && 'bg-white/[0.18]',
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
            style={VERRE_MENU}
            className="pointer-events-auto relative isolate w-[240px] overflow-hidden rounded-[18px] bg-[#1b3440]/55 p-1.5 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14),inset_0_1px_0_rgba(255,255,255,0.18),0_24px_56px_-16px_rgba(16,36,44,0.6)] animate-[adm-pilule-menu_0.35s_cubic-bezier(0.22,1,0.36,1)_both]"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-[40%] -z-10 bg-[radial-gradient(closest-side_at_20%_10%,rgba(120,210,220,0.22),transparent),radial-gradient(closest-side_at_85%_95%,rgba(236,170,200,0.18),transparent)] blur-[16px]"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 rounded-[18px] bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.03)_40%,rgba(0,0,0,0.1)_100%)]"
            />
            {/* Le compte, sur un voile MULTICOLORE très discret : l'arc-en-ciel
                de « Modifier », à peine perceptible sous le verre bleu nuit. */}
            <div className="relative isolate mb-1 overflow-hidden rounded-[12px] px-2.5 py-2">
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 -z-10 aspect-square w-[180%] -translate-x-1/2 -translate-y-1/2 opacity-[0.22] blur-[10px] motion-safe:animate-[adm-tourne-rotation_16s_linear_infinite]"
                style={{ background: 'conic-gradient(from 0deg, #8fdde3, #b2e8bf, #f3e09c, #f2b3cb, #c7b8f4, #9fcbf2, #8fdde3)' }}
              />
              <p className="truncate text-[0.82rem] font-semibold text-white">{name}</p>
              {email && <p className="truncate text-[0.74rem] text-white/60">{email}</p>}
            </div>
            {RACCOURCIS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                tabIndex={-1}
                onClick={() => setOuvert(false)}
                className="block rounded-[10px] px-2.5 py-2 text-[0.8rem] text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:outline-none"
              >
                {item.label}
              </Link>
            ))}
            <div role="separator" className="mx-1 my-1 border-t border-white/10" />
            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                tabIndex={-1}
                className="block w-full rounded-[10px] px-2.5 py-2 text-left text-[0.8rem] text-[#f4a8a0] transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
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

/**
 * L'intérieur du bouton d'action : dès le clic, il le DIT (« Ouverture… »,
 * un petit cercle qui tourne) — on ne reste jamais sans réponse pendant
 * que l'éditeur arrive.
 */
function EtatAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  const { pending } = useLinkStatus()
  return (
    <>
      <span className="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/action:-rotate-12">
        {pending ? (
          <span aria-hidden="true" className="block h-3.5 w-3.5 animate-spin rounded-full border-[1.75px] border-current border-r-transparent" />
        ) : (
          icon
        )}
      </span>
      <span aria-live="polite">{pending ? 'Ouverture…' : label}</span>
    </>
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
