import Link from 'next/link'

import { cn } from '@/lib/utils'

/**
 * Pastille flottante d'administration.
 *
 * Purement présentationnelle et partagée par les deux côtés : le site public
 * la monte après vérification de session côté client, l'administration la
 * rend directement puisqu'elle dispose déjà de la session. Le composant ne
 * sait rien de tout cela — il ne fait qu'afficher.
 */
export function AdminPill({
  status,
  actionLabel,
  actionHref,
  actionDisabledHint,
  icon,
  homeHref,
  name,
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
  /** Cible du bouton rond de droite. */
  homeHref: string
  name: string
  className?: string
  /** Ouvre l'action dans un nouvel onglet (« Voir le site » depuis
      l'éditeur : la version en ligne, sans quitter le brouillon). */
  newTab?: boolean
  /** Couleur de la pastille d'état — vert par défaut. */
  dotClassName?: string
}) {
  const initial = name.trim().charAt(0).toUpperCase() || 'A'

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

        <Link
          href={homeHref}
          aria-label={`Tableau de bord — connecté en tant que ${name}`}
          title={name}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-ivory-warm text-[0.78rem] font-medium text-ink-soft transition-colors duration-300 hover:bg-ivory-deep hover:text-ink"
        >
          {initial}
        </Link>
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
