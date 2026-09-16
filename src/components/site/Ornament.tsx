'use client'

import { m, useReducedMotion } from 'motion/react'

import { cn } from '@/lib/utils'
import type { OrnamentMotif, OrnamentPosition, OrnamentSize } from '@/lib/section-settings'

/* ══════════════════════════════════════════════════════════════════════
   Ornements — « ondes et respiration »

   Des motifs au trait, posés en filigrane par-dessus une section. Ils ne
   portent aucune information : purement décoratifs, donc `aria-hidden` et
   `pointer-events: none`. Le trait se dessine lentement à l'entrée dans
   l'écran (stroke-dashoffset) — le geste d'une respiration, jamais une
   animation qui attire l'œil. Sous prefers-reduced-motion, ils sont
   simplement là, déjà tracés.
   ══════════════════════════════════════════════════════════════════════ */

/** Chaque motif : un viewBox 200×200 et ses tracés. */
const MOTIFS: Record<Exclude<OrnamentMotif, 'aucun'>, string[]> = {
  /* Ondes — trois lignes qui respirent. */
  ondes: [
    'M10 70c30-26 60-26 90 0s60 26 90 0',
    'M10 100c30-26 60-26 90 0s60 26 90 0',
    'M10 130c30-26 60-26 90 0s60 26 90 0',
  ],
  /* Cercles concentriques — l'onde qui s'éloigne. */
  cercles: [
    'M100 20a80 80 0 1 0 .1 0z',
    'M100 45a55 55 0 1 0 .1 0z',
    'M100 70a30 30 0 1 0 .1 0z',
    'M100 95a5 5 0 1 0 .1 0z',
  ],
  /* Arche — la signature du site, en creux. */
  arche: [
    'M30 190V95a70 70 0 0 1 140 0v95',
    'M60 190v-95a40 40 0 0 1 80 0v95',
  ],
  /* Soleil levant — l'horizon et ses rayons. */
  soleil: [
    'M20 140h160',
    'M100 60a80 80 0 0 1 74 50H26a80 80 0 0 1 74-50z',
    'M100 20v22',
    'M40 44l15 16',
    'M160 44l-15 16',
  ],
  /* Spirale douce — le retour au centre. */
  /* Demi-tours de rayon croissant : le bombement alterne tout seul, la
     spirale se déroule sans jamais se refermer. */
  spirale: [
    'M100 100a10 10 0 0 1 0-20a20 20 0 0 1 0 40a30 30 0 0 1 0-60a40 40 0 0 1 0 80a50 50 0 0 1 0-100',
  ],
  /* Horizon — deux lignes et un point, le plus discret. */
  horizon: ['M15 120h170', 'M45 150h110', 'M100 85a6 6 0 1 0 .1 0z'],
}

const SIZE: Record<OrnamentSize, string> = {
  petit: 'w-[clamp(90px,10vw,140px)]',
  moyen: 'w-[clamp(140px,18vw,240px)]',
  grand: 'w-[clamp(200px,28vw,380px)]',
}

/** Placement dans la section — la gouttière sert de marge. */
const POSITION: Record<OrnamentPosition, string> = {
  'haut-gauche': 'top-[6%] left-[var(--spacing-gutter)]',
  'haut-droite': 'top-[6%] right-[var(--spacing-gutter)]',
  'bas-gauche': 'bottom-[6%] left-[var(--spacing-gutter)]',
  'bas-droite': 'bottom-[6%] right-[var(--spacing-gutter)]',
  centre: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
}

export function Ornament({
  motif,
  position,
  size,
  dark = false,
}: {
  motif: OrnamentMotif
  position: OrnamentPosition
  size: OrnamentSize
  /** Section à fond sombre : le trait passe en ivoire. */
  dark?: boolean
}) {
  const reduced = useReducedMotion()
  if (motif === 'aucun') return null

  const paths = MOTIFS[motif]

  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn(
        /* z négatif : au-dessus du fond, sous le contenu. */
        'pointer-events-none absolute -z-10 h-auto',
        SIZE[size],
        POSITION[position],
        dark ? 'text-ivory/25' : 'text-blue-deep/20',
      )}
    >
      {paths.map((d, i) =>
        reduced ? (
          <path
            key={i}
            d={d}
            stroke="currentColor"
            strokeWidth={1}
            strokeLinecap="round"
          />
        ) : (
          <m.path
            key={i}
            d={d}
            stroke="currentColor"
            strokeWidth={1}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 1 }}
            viewport={{ once: true, amount: 0.2, margin: '0px 0px -10% 0px' }}
            transition={{
              duration: 2.2,
              delay: 0.2 + i * 0.25,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        ),
      )}
    </svg>
  )
}
