import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { cn } from '@/lib/utils'

/**
 * Blocs de mise en page : colonnes, filet, espace.
 *
 * Le bloc `columns` est le seul conteneur du registre. Il ne porte aucun
 * contenu propre — il place les blocs qu'on y dépose.
 */

/* ── Section libre ─────────────────────────────────────────────────── */

export const columnsSchema = z.object({
  count: z.coerce.number().int().min(1).max(3).default(1),
  width: z.enum(['etroit', 'normal', 'large']).default('normal'),
  gap: z.enum(['serré', 'normal', 'large']).default('normal'),
  align: z.enum(['start', 'center']).default('start'),
  /** Répartition, uniquement pour deux colonnes. */
  split: z.enum(['egal', 'gauche', 'droite']).default('egal'),
})

const gaps = {
  serré: 'gap-6 lg:gap-8',
  normal: 'gap-10 lg:gap-16',
  large: 'gap-12 lg:gap-24',
} as const

const widths = {
  etroit: 'max-w-[38rem]',
  normal: 'max-w-[52rem]',
  large: 'max-w-none',
} as const

/**
 * Section libre : le canevas vide du constructeur.
 *
 * Elle ne porte aucun contenu propre — on la crée vierge, puis on y empile
 * les blocs fins (titre, texte, image, bouton…) par glisser-déposer. En une
 * colonne, c'est une pile verticale à largeur de lecture ; en deux ou trois,
 * une grille qui se replie toujours sous `lg` — le rendu mobile reste
 * garanti quoi qu'on y compose.
 */
function FreeSection({
  data,
  columns = [],
  columnProps = [],
}: BlockProps<z.output<typeof columnsSchema>>) {
  /* Une seule colonne : pile verticale bornée à une largeur de lecture,
     centrée. C'est la forme « page vierge » que l'on remplit de haut en
     bas. */
  if (data.count === 1) {
    return (
      <div className="container-editorial">
        <div
          {...(columnProps[0] ?? {})}
          className={cn(
            'mx-auto flex min-w-0 flex-col',
            gaps[data.gap],
            widths[data.width],
            /* `min-h` en édition seulement : une section vide doit rester
               une cible de dépôt, alors qu'elle mesurerait zéro pixel. */
            columnProps[0] && 'min-h-32',
          )}
        >
          {columns[0]}
        </div>
      </div>
    )
  }

  const template =
    data.count === 3
      ? 'lg:grid-cols-3'
      : data.split === 'gauche'
        ? 'lg:grid-cols-[1.6fr_1fr]'
        : data.split === 'droite'
          ? 'lg:grid-cols-[1fr_1.6fr]'
          : 'lg:grid-cols-2'

  return (
    <div className="container-editorial">
      <div
        className={cn(
          'grid grid-cols-1',
          template,
          gaps[data.gap],
          data.align === 'center' && 'items-center',
        )}
      >
        {Array.from({ length: data.count }, (_, i) => (
          <div
            key={i}
            {...(columnProps[i] ?? {})}
            className={cn(
              'flex min-w-0 flex-col gap-8',
              columnProps[i] && 'min-h-24',
            )}
          >
            {columns[i]}
          </div>
        ))}
      </div>
    </div>
  )
}

/* Le type reste `columns` dans le registre et en base : le renommer
   invaliderait les sections déjà enregistrées. */
export const columnsBlock: BlockDefinition<typeof columnsSchema> = {
  label: 'Section libre',
  description:
    'Une section vierge à composer : empilez-y titres, textes et images, en une ou plusieurs colonnes.',
  group: 'Sections',
  container: true,
  schema: columnsSchema,
  fields: [
    field.select('count', 'Colonnes', [
      { value: '1', label: 'Une — pile verticale' },
      { value: '2', label: 'Deux' },
      { value: '3', label: 'Trois' },
    ]),
    field.select('width', 'Largeur du contenu (une colonne)', [
      { value: 'etroit', label: 'Étroite — lecture' },
      { value: 'normal', label: 'Normale' },
      { value: 'large', label: 'Pleine largeur' },
    ]),
    field.select('split', 'Répartition (deux colonnes)', [
      { value: 'egal', label: 'Égale' },
      { value: 'gauche', label: 'Gauche plus large' },
      { value: 'droite', label: 'Droite plus large' },
    ]),
    field.select('gap', 'Écart entre les blocs', [
      { value: 'serré', label: 'Serré' },
      { value: 'normal', label: 'Normal' },
      { value: 'large', label: 'Large' },
    ]),
    field.select('align', 'Alignement vertical (colonnes)', [
      { value: 'start', label: 'En haut' },
      { value: 'center', label: 'Centré' },
    ]),
  ],
  defaults: {
    count: 1,
    width: 'normal',
    gap: 'normal',
    align: 'start',
    split: 'egal',
  },
  Component: FreeSection,
}

/* ── Canevas libre ─────────────────────────────────────────────────── */

export const canvasSchema = z.object({
  /* Héritage : l'ancienne hauteur nommée reste lisible — elle sert de
     valeur de repli à `canvasRows` tant que `rows` n'est pas défini. */
  height: z.enum(['petit', 'moyen', 'grand', 'ecran']).default('moyen'),
  /** Nombre de lignes garanties de la grille (hauteur minimale). */
  rows: z.coerce.number().int().min(8).max(120).optional(),
})

/**
 * Section grille : le canevas du constructeur visuel.
 *
 * C'est une grille CSS — 12 colonnes en desktop, 8 en tablette, 4 en
 * mobile, lignes de 48 px extensibles. Les colonnes, lignes et placements
 * des enfants sont générés par `SectionsView` (classe portée par
 * `columnProps`) : ce composant ne fait que poser le conteneur.
 */
function Canvas({
  columns = [],
  columnProps = [],
}: BlockProps<z.output<typeof canvasSchema>>) {
  const { className, ...attrs } = columnProps[0] ?? {}
  return (
    /* La grille occupe TOUTE la section — pas de conteneur éditorial.
       Les marges se composent avec la grille elle-même : on laisse une
       colonne vide, comme sur une vraie feuille quadrillée. Le liseré de
       24 px évite seulement que le contenu touche le bord de l'écran. */
    <div className="p-6 lg:p-8">
      <div {...attrs} className={cn('min-w-0', className)}>
        {columns[0]}
      </div>
    </div>
  )
}

export const canvasBlock: BlockDefinition<typeof canvasSchema> = {
  label: 'Section grille',
  description:
    'Une grille vierge : déposez-y titres, textes et images, déplacez et redimensionnez chaque bloc à la souris.',
  group: 'Sections',
  container: true,
  freeform: true,
  /* Pleine section : pas de respiration verticale imposée — la hauteur,
     c'est le nombre de lignes de la grille, rien d'autre. */
  bleed: true,
  schema: canvasSchema,
  fields: [
    field.number('rows', 'Hauteur — lignes de grille', {
      help: 'Une ligne = 24 px. La grille grandit d’elle-même si le contenu déborde.',
    }),
  ],
  defaults: { height: 'moyen' },
  Component: Canvas,
}

/* ── Filet ─────────────────────────────────────────────────────────── */

export const dividerSchema = z.object({
  style: z.enum(['ligne', 'trait-court', 'point']).default('ligne'),
  space: z.enum(['petit', 'moyen', 'grand']).default('moyen'),
})

function Divider({ data }: BlockProps<z.output<typeof dividerSchema>>) {
  const spaces = { petit: 'py-6', moyen: 'py-12', grand: 'py-20' } as const

  return (
    <div className={cn('container-editorial', spaces[data.space])}>
      {data.style === 'ligne' && <hr className="border-t border-line" />}
      {data.style === 'trait-court' && (
        <hr className="mx-auto w-16 border-t border-line-strong" />
      )}
      {data.style === 'point' && (
        <div className="flex justify-center" aria-hidden="true">
          <span className="h-1 w-1 rounded-full bg-stone" />
        </div>
      )}
    </div>
  )
}

export const dividerBlock: BlockDefinition<typeof dividerSchema> = {
  label: 'Filet',
  description: 'Séparation discrète entre deux blocs.',
  group: 'Mise en page',
  inline: true,
  bleed: true,
  schema: dividerSchema,
  fields: [
    field.select('style', 'Style', [
      { value: 'ligne', label: 'Ligne pleine largeur' },
      { value: 'trait-court', label: 'Trait court centré' },
      { value: 'point', label: 'Point centré' },
    ]),
    field.select('space', 'Espace autour', [
      { value: 'petit', label: 'Petit' },
      { value: 'moyen', label: 'Moyen' },
      { value: 'grand', label: 'Grand' },
    ]),
  ],
  defaults: { style: 'ligne', space: 'moyen' },
  Component: Divider,
}

/* ── Espace ────────────────────────────────────────────────────────── */

export const spacerSchema = z.object({
  size: z.enum(['petit', 'moyen', 'grand', 'immense']).default('moyen'),
})

function Spacer({ data }: BlockProps<z.output<typeof spacerSchema>>) {
  const sizes = {
    petit: 'h-8 lg:h-12',
    moyen: 'h-16 lg:h-24',
    grand: 'h-24 lg:h-40',
    immense: 'h-36 lg:h-64',
  } as const

  return <div aria-hidden="true" className={sizes[data.size]} />
}

export const spacerBlock: BlockDefinition<typeof spacerSchema> = {
  label: 'Espace',
  description: 'Respiration verticale ajustable.',
  group: 'Mise en page',
  inline: true,
  bleed: true,
  schema: spacerSchema,
  fields: [
    field.select('size', 'Hauteur', [
      { value: 'petit', label: 'Petite' },
      { value: 'moyen', label: 'Moyenne' },
      { value: 'grand', label: 'Grande' },
      { value: 'immense', label: 'Très grande' },
    ]),
  ],
  defaults: { size: 'moyen' },
  Component: Spacer,
}
