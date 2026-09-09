import { z } from 'zod'

/**
 * Moteur de grille du constructeur visuel.
 *
 * Chaque section-canevas est une grille : 12 colonnes en desktop, 8 en
 * tablette, 4 en mobile. Un élément n'est jamais positionné en pixels ni en
 * pourcentages — il occupe des CELLULES : colonne de départ, ligne de
 * départ, nombre de colonnes, nombre de lignes. Le snap n'est pas un guide
 * cosmétique : c'est l'arithmétique du modèle. Une position invalide est
 * inexprimable.
 *
 * Les lignes ont une hauteur minimale fixe mais peuvent grandir avec leur
 * contenu (`minmax`) : un texte trop long agrandit ses lignes au lieu de
 * déborder — la page ne casse jamais.
 *
 * Tout ici est pur (zéro DOM) : utilisable côté serveur (génération CSS,
 * validation) comme côté client (éditeur).
 */

export type Breakpoint = 'desktop' | 'tablet' | 'mobile'

export const BREAKPOINTS: readonly Breakpoint[] = ['desktop', 'tablet', 'mobile']

/** Nombre de colonnes par breakpoint — grille fine, cellules quasi
    carrées : la liberté de placement vient de la densité. */
export const GRID_COLS: Record<Breakpoint, number> = {
  desktop: 48,
  tablet: 24,
  mobile: 12,
}

/** Facteurs d'échelle pour les compositions écrites « en base 12 »
    (conversions héritées, modèles) : une colonne d'auteur = 4 colonnes
    réelles, une ligne d'auteur (48 px) = 2 lignes réelles. Changer la
    densité de la grille ne demande plus de réécrire une seule valeur. */
export const AUTHOR_COL_FACTOR = GRID_COLS.desktop / 12
export const AUTHOR_ROW_FACTOR = 2

/** Pas de gouttière : le quadrillage est une vraie feuille — toutes les
    cellules sont identiques, et l'espacement se compose en laissant des
    cellules vides. */
export const GRID_GAP: Record<Breakpoint, number> = {
  desktop: 0,
  tablet: 0,
  mobile: 0,
}

/** Hauteur minimale d'une ligne de grille, en px. */
export const ROW_UNIT = 24

/** Largeurs de composition de l'éditeur — le canvas est rendu à taille
    fixe puis mis à l'échelle, pour que desktop reste desktop quel que
    soit l'écran de l'admin. */
export const GRID_VIEWPORTS: Record<Breakpoint, number> = {
  desktop: 1280,
  tablet: 834,
  mobile: 414,
}

/** Bornes des media queries du CSS public. */
export const TABLET_MAX = 1023
export const MOBILE_MAX = 639

const MAX_ROWS = 200

/* ── Modèle ─────────────────────────────────────────────────────────── */

export const gridPlacementSchema = z.object({
  /** Colonne de départ (1 = première). */
  col: z.number().int().min(1).max(48),
  /** Ligne de départ (1 = première). */
  row: z.number().int().min(1).max(MAX_ROWS),
  colSpan: z.number().int().min(1).max(48),
  rowSpan: z.number().int().min(1).max(MAX_ROWS),
})

/**
 * Position d'un élément, par breakpoint.
 *
 * `desktop` est la source de vérité. `tablet` et `mobile` sont des
 * SURCHARGES : absentes, la position y est dérivée (remap proportionnel en
 * tablette, empilement pleine largeur dans l'ordre de lecture en mobile).
 * Ajuster un élément dans la vue tablette crée sa surcharge — le desktop
 * n'est jamais touché.
 */
export const gridPositionSchema = z
  .object({
    desktop: gridPlacementSchema,
    tablet: gridPlacementSchema.optional(),
    mobile: gridPlacementSchema.optional(),
  })
  .strict()

export type GridPlacement = z.infer<typeof gridPlacementSchema>
export type GridPosition = z.infer<typeof gridPositionSchema>

/* ── Lecture, avec compatibilité ascendante ─────────────────────────── */

const legacySchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  w: z.number().min(0).max(100),
  h: z.number().min(0).max(100).optional(),
})

/** Ramène un placement dans les bornes d'une grille de `cols` colonnes. */
export function clampPlacement(p: GridPlacement, cols: number): GridPlacement {
  const col = Math.min(Math.max(1, Math.round(p.col)), cols)
  const colSpan = Math.min(Math.max(1, Math.round(p.colSpan)), cols - col + 1)
  const row = Math.min(Math.max(1, Math.round(p.row)), MAX_ROWS)
  const rowSpan = Math.min(Math.max(1, Math.round(p.rowSpan)), MAX_ROWS - row + 1)
  return { col, row, colSpan, rowSpan }
}

/** Ancien format en pourcentages → cellules. Approximation honnête :
    12 lignes de référence sur la hauteur du canevas d'origine. */
function fromLegacy(p: z.infer<typeof legacySchema>): GridPosition {
  const cols = GRID_COLS.desktop
  const col = Math.round((p.x / 100) * cols) + 1
  const colSpan = Math.max(1, Math.round((p.w / 100) * cols))
  const row = Math.round((p.y / 100) * 24) + 1
  const rowSpan = p.h ? Math.max(1, Math.round((p.h / 100) * 24)) : 6
  return {
    desktop: clampPlacement({ col, row, colSpan, rowSpan }, cols),
  }
}

/**
 * Lit un placement depuis la base : nouveau format en cellules, ancien
 * format en pourcentages (converti à la volée — persistant au prochain
 * enregistrement), ou `null`.
 */
export function parseGridPosition(value: unknown): GridPosition | null {
  if (!value) return null

  const grid = gridPositionSchema.safeParse(value)
  if (grid.success) return grid.data

  const legacy = legacySchema.safeParse(value)
  if (legacy.success) return fromLegacy(legacy.data)

  return null
}

/* ── Dérivation responsive ──────────────────────────────────────────── */

/** Remap proportionnel 12 → 8 colonnes : la composition tient, plus étroite. */
export function deriveTablet(d: GridPlacement): GridPlacement {
  const cols = GRID_COLS.tablet
  const col = Math.round(((d.col - 1) * cols) / GRID_COLS.desktop) + 1
  const colSpan = Math.round((d.colSpan * cols) / GRID_COLS.desktop)
  return clampPlacement({ ...d, col, colSpan }, cols)
}

/**
 * Position effective d'un élément à un breakpoint.
 *
 * `null` en mobile signifie « en flux » : pleine largeur, empilé dans
 * l'ordre de lecture — le défaut sain sur 4 colonnes, tant que l'admin n'a
 * pas placé l'élément à la main dans la vue mobile.
 */
export function resolvePlacement(
  position: GridPosition,
  bp: Breakpoint,
): GridPlacement | null {
  if (bp === 'desktop') return position.desktop
  if (bp === 'tablet') return position.tablet ?? deriveTablet(position.desktop)
  return position.mobile ?? null
}

/** Écrit la position d'un breakpoint (surcharge pour tablette/mobile). */
export function withPlacement(
  position: GridPosition,
  bp: Breakpoint,
  placement: GridPlacement,
): GridPosition {
  const clamped = clampPlacement(placement, GRID_COLS[bp])
  if (bp === 'desktop') return { ...position, desktop: clamped }
  return { ...position, [bp]: clamped }
}

/* ── Défauts par type de bloc ───────────────────────────────────────── */

/** Empreinte initiale d'un élément déposé depuis la palette — écrite en
    base 12, mise à l'échelle de la grille réelle. */
const DEFAULT_SPANS: Record<string, { colSpan: number; rowSpan: number }> = {
  heading: { colSpan: 6, rowSpan: 2 },
  text: { colSpan: 5, rowSpan: 3 },
  image: { colSpan: 4, rowSpan: 5 },
  /* 1,5 ligne d'auteur = 3 lignes réelles (72 px) : un bouton fait ~52 px,
     il tient avec de l'air — jamais en débordement dès la pose. */
  button: { colSpan: 3, rowSpan: 1.5 },
  list: { colSpan: 5, rowSpan: 5 },
  divider: { colSpan: 6, rowSpan: 1 },
  spacer: { colSpan: 2, rowSpan: 2 },
  badge: { colSpan: 2, rowSpan: 1.5 },
  citation: { colSpan: 5, rowSpan: 3 },
  stat: { colSpan: 3, rowSpan: 2 },
  carte: { colSpan: 4, rowSpan: 7 },
  atout: { colSpan: 4, rowSpan: 3 },
  temoignage: { colSpan: 5, rowSpan: 4 },
  video: { colSpan: 6, rowSpan: 6 },
  accordeon: { colSpan: 6, rowSpan: 6 },
  onglets: { colSpan: 6, rowSpan: 4 },
  tableau: { colSpan: 6, rowSpan: 4 },
  tarif: { colSpan: 4, rowSpan: 8 },
  galerie: { colSpan: 8, rowSpan: 6 },
  avatar: { colSpan: 3, rowSpan: 2 },
  encart: { colSpan: 5, rowSpan: 3 },
  barre: { colSpan: 4, rowSpan: 1.5 },
  acces: { colSpan: 5, rowSpan: 6 },
  coordonnees: { colSpan: 4, rowSpan: 4 },
  horaires: { colSpan: 4, rowSpan: 4 },
  reseaux: { colSpan: 3, rowSpan: 1.5 },
}

export function defaultSpan(type: string): { colSpan: number; rowSpan: number } {
  const s = DEFAULT_SPANS[type] ?? { colSpan: 4, rowSpan: 3 }
  return {
    colSpan: Math.round(s.colSpan * AUTHOR_COL_FACTOR),
    rowSpan: Math.round(s.rowSpan * AUTHOR_ROW_FACTOR),
  }
}

/** Position par défaut quand un bloc entre dans un canevas sans point de
    dépôt connu (déplacement via les calques, par exemple). */
export function defaultPosition(type: string): GridPosition {
  const span = defaultSpan(type)
  return {
    desktop: clampPlacement(
      { col: 1, row: 1, colSpan: span.colSpan, rowSpan: span.rowSpan },
      GRID_COLS.desktop,
    ),
  }
}

/* ── Ordre de lecture ───────────────────────────────────────────────── */

/**
 * Ordre de lecture des éléments d'un canevas : ligne, puis colonne.
 * C'est l'ordre du DOM — invisible en desktop (placement explicite), mais
 * c'est lui qui fait l'empilement mobile et l'ordre pour les lecteurs
 * d'écran. Déplacer un bloc met le mobile à jour tout seul.
 */
export function readingOrder<T>(
  items: T[],
  positionOf: (item: T) => GridPosition | null,
): T[] {
  return [...items].sort((a, b) => {
    const pa = positionOf(a)?.desktop ?? { row: 999, col: 999 }
    const pb = positionOf(b)?.desktop ?? { row: 999, col: 999 }
    return pa.row - pb.row || pa.col - pb.col
  })
}

/* ── Hauteur d'un canevas ───────────────────────────────────────────── */

const HEIGHT_ROWS = { petit: 14, moyen: 20, grand: 28, ecran: 32 } as const

/** Bornes du nombre de lignes d'un canevas. */
export const MIN_CANVAS_ROWS = 8
export const MAX_CANVAS_ROWS = 120

/** Nombre de lignes garanties d'un canevas (sa hauteur minimale). */
export function canvasRows(payload: unknown): number {
  const p = (payload ?? {}) as { rows?: unknown; height?: unknown }
  if (typeof p.rows === 'number' && Number.isFinite(p.rows)) {
    return Math.min(MAX_CANVAS_ROWS, Math.max(MIN_CANVAS_ROWS, Math.round(p.rows)))
  }
  const height = typeof p.height === 'string' ? p.height : 'moyen'
  return HEIGHT_ROWS[height as keyof typeof HEIGHT_ROWS] ?? 20
}

/* ── Génération CSS ─────────────────────────────────────────────────── */

function safeClass(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
}

export function gridContainerClass(id: string): string {
  return `gc-${safeClass(id)}`
}

export function gridItemClass(id: string): string {
  return `gi-${safeClass(id)}`
}

/**
 * Taille d'une ligne de grille.
 *
 * Desktop et tablette : FIXE. La grille est une feuille rigide — un
 * contenu trop grand déborde de son cadre (l'éditeur le signale), il ne
 * déforme jamais le quadrillage. Mobile : extensible — les blocs y sont
 * empilés en flux de lecture, leur hauteur est leur contenu.
 */
function rowSize(bp: Breakpoint): string {
  return bp === 'mobile' ? `minmax(${ROW_UNIT}px,auto)` : `${ROW_UNIT}px`
}

function containerDecl(bp: Breakpoint, rows: number): string {
  return [
    'display:grid',
    `grid-template-columns:repeat(${GRID_COLS[bp]},minmax(0,1fr))`,
    `grid-template-rows:repeat(${rows},${rowSize(bp)})`,
    `grid-auto-rows:${rowSize(bp)}`,
    `gap:${GRID_GAP[bp]}px`,
  ].join(';')
}

function itemDecl(p: GridPlacement): string {
  return `grid-column:${p.col}/span ${p.colSpan};grid-row:${p.row}/span ${p.rowSpan}`
}

/** Élément en flux (mobile sans surcharge) : pleine largeur, ligne auto. */
const FLOW_DECL = 'grid-column:1/-1;grid-row:auto'

export type GridCanvasNode = {
  id: string
  rows: number
  children: { id: string; position: GridPosition | null }[]
}

/**
 * CSS des canevas d'une page.
 *
 * Public (`flattenTo` absent) : règles desktop + media queries tablette et
 * mobile. Éditeur (`flattenTo` fourni) : uniquement les règles du breakpoint
 * affiché, sans media query — le canvas de l'éditeur est un viewport
 * simulé, les media queries du navigateur n'y font pas foi.
 *
 * Sûr par construction : toutes les valeurs sont des entiers bornés issus
 * de `gridPlacementSchema`, les classes sont dérivées d'identifiants
 * filtrés alphanumériques.
 */
export function generateGridCss(
  canvases: GridCanvasNode[],
  flattenTo?: Breakpoint,
): string {
  const rulesFor = (bp: Breakpoint): string => {
    const out: string[] = []
    for (const canvas of canvases) {
      out.push(`.${gridContainerClass(canvas.id)}{${containerDecl(bp, canvas.rows)}}`)
      for (const child of canvas.children) {
        const cls = gridItemClass(child.id)
        if (!child.position) {
          out.push(`.${cls}{${FLOW_DECL}}`)
          continue
        }
        const placement = resolvePlacement(child.position, bp)
        out.push(
          `.${cls}{${
            placement
              ? itemDecl(clampPlacement(placement, GRID_COLS[bp]))
              : FLOW_DECL
          }}`,
        )
      }
    }
    return out.join('')
  }

  if (flattenTo) return rulesFor(flattenTo)

  let css = rulesFor('desktop')
  css += `@media (max-width:${TABLET_MAX}px){${rulesFor('tablet')}}`
  css += `@media (max-width:${MOBILE_MAX}px){${rulesFor('mobile')}}`
  return css
}
