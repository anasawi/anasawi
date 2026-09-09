import {
  AUTHOR_COL_FACTOR,
  AUTHOR_ROW_FACTOR,
  type GridPosition,
} from './grid'

/**
 * Conversion des sections héritées en éléments de grille.
 *
 * Chaque type de section composée (hero, à propos…) sait se décomposer en
 * blocs primitifs posés sur la grille 12 colonnes, en approchant sa mise en
 * page d'origine. Après conversion, chaque morceau — titre, image, texte,
 * bouton — se déplace et se redimensionne cellule par cellule.
 *
 * Les sections CONNECTÉES (accompagnements, FAQ, contact) ne se
 * décomposent pas : leur contenu vient de la base et doit y rester — les
 * éclater dupliquerait des données métier.
 */

type Child = {
  type: string
  name?: string
  payload: Record<string, unknown>
  placement: GridPosition
}

type Conversion = { rows: number; children: Child[] }

/** Position desktop écrite EN BASE 12 (colonnes d'auteur, lignes de
    48 px), mise à l'échelle de la grille réelle. Tablette et mobile sont
    dérivés au rendu. */
const at = (
  col: number,
  row: number,
  colSpan: number,
  rowSpan: number,
): GridPosition => ({
  desktop: {
    col: (col - 1) * AUTHOR_COL_FACTOR + 1,
    row: (row - 1) * AUTHOR_ROW_FACTOR + 1,
    colSpan: colSpan * AUTHOR_COL_FACTOR,
    rowSpan: rowSpan * AUTHOR_ROW_FACTOR,
  },
})

/** Hauteur de canevas écrite en lignes d'auteur (48 px). */
const rowsOf = (authorRows: number): number => authorRows * AUTHOR_ROW_FACTOR

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const lines = (v: unknown): string =>
  Array.isArray(v)
    ? v
        .map((l) => str((l as { text?: unknown })?.text))
        .filter(Boolean)
        .join(' ')
    : ''
const mediaId = (v: unknown): string | null =>
  typeof v === 'string' ? v : null

const heading = (
  text: string,
  p: GridPosition,
  extra: Record<string, unknown> = {},
): Child => ({
  type: 'heading',
  payload: {
    eyebrow: '',
    text,
    level: 'h2',
    size: 'large',
    align: 'left',
    ...extra,
  },
  placement: p,
})

const text = (
  body: string,
  p: GridPosition,
  extra: Record<string, unknown> = {},
): Child => ({
  type: 'text',
  payload: { body, size: 'base', align: 'left', ...extra },
  placement: p,
})

const image = (
  id: string | null,
  p: GridPosition,
  ratio = 'portrait',
): Child => ({
  type: 'image',
  payload: { mediaId: id, ratio, caption: '', rounded: false },
  placement: p,
})

const button = (
  label: string,
  href: string,
  p: GridPosition,
  variant = 'primary',
): Child => ({
  type: 'button',
  payload: { label, href, variant, align: 'left', external: false },
  placement: p,
})

const list = (
  items: unknown,
  p: GridPosition,
  numbered = false,
): Child => ({
  type: 'list',
  payload: {
    title: '',
    numbered,
    items: Array.isArray(items)
      ? items.map((item) => ({
          label: str((item as { label?: unknown })?.label),
          text: str((item as { text?: unknown })?.text),
        }))
      : [],
  },
  placement: p,
})

/** Décompositions par type. `null` = non convertible. */
const CONVERTERS: Record<string, (payload: Record<string, unknown>) => Conversion> = {
  hero: (p) => ({
    rows: rowsOf(12),
    children: [
      heading(lines(p.titleLines), at(1, 2, 6, 3), {
        eyebrow: str(p.eyebrow),
      }),
      ...(str(p.intro)
        ? [text(str(p.intro), at(1, 6, 5, 2), { size: 'lead' })]
        : []),
      ...(str(p.primaryLabel)
        ? [button(str(p.primaryLabel), str(p.primaryHref) || '#contact', at(1, 9, 3, 1))]
        : []),
      ...(str(p.secondaryLabel)
        ? [
            button(
              str(p.secondaryLabel),
              str(p.secondaryHref) || '#a-propos',
              at(4, 9, 3, 1),
              'outline',
            ),
          ]
        : []),
      image(mediaId(p.mediaId), at(8, 1, 5, 12)),
    ],
  }),

  about: (p) => ({
    rows: rowsOf(12),
    children: [
      image(mediaId(p.mediaId), at(1, 1, 5, 11)),
      heading(str(p.title), at(7, 1, 6, 2), {
        eyebrow: str(p.eyebrow),
        size: 'medium',
      }),
      ...(str(p.intro)
        ? [text(str(p.intro), at(7, 3, 6, 2), { size: 'lead' })]
        : []),
      ...(str(p.body) ? [text(str(p.body), at(7, 5, 6, 3))] : []),
      ...(Array.isArray(p.values) && p.values.length > 0
        ? [list(p.values, at(7, 8, 6, 4))]
        : []),
    ],
  }),

  approach: (p) => ({
    rows: rowsOf(12),
    children: [
      heading(str(p.title), at(1, 1, 5, 2), {
        eyebrow: str(p.eyebrow),
        size: 'medium',
      }),
      ...(str(p.body)
        ? [text(str(p.body), at(1, 3, 5, 2), { size: 'lead' })]
        : []),
      ...(Array.isArray(p.steps) && p.steps.length > 0
        ? [list(p.steps, at(1, 6, 5, 6), true)]
        : []),
      image(mediaId(p.mediaId), at(8, 2, 5, 10)),
    ],
  }),

  quote: (p) => ({
    rows: rowsOf(6),
    children: [
      heading(lines(p.lines), at(3, 2, 8, 3), {
        size: 'medium',
        align: 'center',
      }),
    ],
  }),

  cta: (p) => ({
    rows: rowsOf(7),
    children: [
      heading(lines(p.lines), at(3, 2, 8, 2), {
        size: 'medium',
        align: 'center',
      }),
      ...(str(p.text)
        ? [text(str(p.text), at(4, 4, 6, 2), { align: 'center' })]
        : []),
      ...(str(p.label)
        ? [
            {
              ...button(str(p.label), str(p.href) || '#contact', at(5, 6, 4, 1)),
              payload: {
                label: str(p.label),
                href: str(p.href) || '#contact',
                variant: 'primary',
                align: 'center',
                external: false,
              },
            },
          ]
        : []),
    ],
  }),

  imageText: (p) => {
    const imageLeft = p.imageSide !== 'right'
    const content = imageLeft ? 7 : 1
    return {
      rows: rowsOf(12),
      children: [
        image(mediaId(p.mediaId), at(imageLeft ? 1 : 8, 1, 5, 11)),
        heading(str(p.title), at(content, 2, 6, 2), {
          eyebrow: str(p.eyebrow),
          size: 'medium',
        }),
        ...(str(p.body) ? [text(str(p.body), at(content, 4, 6, 4))] : []),
        ...(str(p.ctaLabel)
          ? [
              button(
                str(p.ctaLabel),
                str(p.ctaHref) || '#contact',
                at(content, 9, 3, 1),
                'outline',
              ),
            ]
          : []),
      ],
    }
  },

  gallery: (p) => {
    const ids = Array.isArray(p.mediaIds)
      ? (p.mediaIds.filter((v) => typeof v === 'string') as string[])
      : []
    return {
      rows: rowsOf(9),
      children: [
        ...(str(p.title)
          ? [heading(str(p.title), at(1, 1, 6, 2), { size: 'medium' })]
          : []),
        ...ids
          .slice(0, 3)
          .map((id, i) => image(id, at(1 + i * 4, 3, 4, 6))),
      ],
    }
  },
}

export const CONVERTIBLE_TYPES = new Set(Object.keys(CONVERTERS))

export function convertLegacySection(
  type: string,
  payload: unknown,
): Conversion | null {
  const converter = CONVERTERS[type]
  if (!converter) return null
  return converter((payload as Record<string, unknown>) ?? {})
}
