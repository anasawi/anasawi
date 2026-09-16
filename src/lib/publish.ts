import { parseNodeStyles } from '@/lib/node-styles'
import { parseSectionSettings } from '@/lib/section-settings'
import type { Section } from '@/server/db/schema'

/**
 * Publication en deux temps.
 *
 * L'admin édite les sections vivantes ; le site public sert l'instantané
 * copié au moment de « Publier ». Ce module définit LA projection d'une
 * section dans l'instantané — la même pour écrire (action de publication)
 * et pour comparer (badge « modifications non publiées »).
 */

export type SnapshotRow = {
  id: string
  pageId: string
  parentId: string | null
  columnIndex: number
  placement: unknown
  styles: unknown
  settings: unknown
  name: string | null
  type: string
  anchor: string | null
  navLabel: string | null
  showInNav: boolean
  sortOrder: number
  isActive: boolean
  backgroundColor: string
  payload: unknown
}

export function projectSection(section: Section): SnapshotRow {
  return {
    id: section.id,
    pageId: section.pageId,
    parentId: section.parentId,
    columnIndex: section.columnIndex,
    placement: section.placement ?? null,
    styles: section.styles ?? null,
    settings: section.settings ?? null,
    name: section.name,
    type: section.type,
    anchor: section.anchor,
    navLabel: section.navLabel,
    showInNav: section.showInNav,
    sortOrder: section.sortOrder,
    isActive: section.isActive,
    backgroundColor: section.backgroundColor,
    payload: section.payload,
  }
}

/**
 * JSON canonique : clés triées à tous les niveaux, `undefined` ramené à
 * `null`. Indispensable : Postgres réordonne les clés d'un `jsonb` (et
 * celles des objets imbriqués — payloads, réglages), si bien qu'un
 * instantané relu de la base n'a jamais le même ordre de clés que les
 * sections vivantes. Sans canonisation, le badge « à publier » restait
 * allumé juste après une publication.
 */
function canonical(value: unknown): unknown {
  if (value === undefined) return null
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = canonical((value as Record<string, unknown>)[key])
    }
    return out
  }
  return value
}

/**
 * Styles ramenés à leur forme comparable : `null` quand ils sont vides
 * (`{}` ou `{ base: {} }` ne changent rien au rendu), sinon la forme
 * validée par le schéma.
 */
function comparableStyles(styles: unknown): unknown {
  const parsed = parseNodeStyles(styles)
  if (!parsed) return null
  const empty =
    Object.keys(parsed.base).length === 0 &&
    (!parsed.tablet || Object.keys(parsed.tablet).length === 0) &&
    (!parsed.mobile || Object.keys(parsed.mobile).length === 0)
  return empty ? null : parsed
}

/**
 * Sérialisation stable pour comparaison.
 *
 * Deux états qui se RENDENT pareil doivent se comparer égaux :
 * — le rang (`sortOrder`) est remplacé par la position parmi les frères :
 *   la base décale les rangs à l'insertion et ne les recompacte pas à la
 *   suppression, si bien qu'un ajout suivi d'une suppression laissait la
 *   page « à publier » alors que rien n'avait changé ;
 * — `settings: null` vaut les réglages par défaut, `styles` vides valent
 *   `null`, chaînes vides et `null` se confondent pour l'ancre, le nom du
 *   menu et le nom de la section ;
 * — les clés sont canonisées en profondeur (Postgres réordonne le jsonb).
 */
function serialize(rows: SnapshotRow[]): string {
  const ordered = [...rows]
    .map((row) => projectSection(row as Section))
    .sort((a, b) => a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : 1))

  const rankWithin = new Map<string, number>()
  const comparable = ordered.map((row) => {
    const scope = `${row.parentId ?? ''}|${row.parentId ? row.columnIndex : 0}`
    const rank = rankWithin.get(scope) ?? 0
    rankWithin.set(scope, rank + 1)
    return {
      ...row,
      sortOrder: rank,
      name: row.name || null,
      anchor: row.anchor || null,
      navLabel: row.navLabel || null,
      settings: parseSectionSettings(row.settings),
      styles: comparableStyles(row.styles),
    }
  })
  return JSON.stringify(canonical(comparable))
}

/** L'état courant diffère-t-il de l'instantané publié ? */
export function hasUnpublishedChanges(
  sections: Section[],
  publishedSnapshot: unknown,
): boolean {
  if (!Array.isArray(publishedSnapshot)) return sections.length > 0
  return (
    serialize(sections.map(projectSection)) !==
    serialize(publishedSnapshot as SnapshotRow[])
  )
}

/** Relit un instantané comme des lignes de sections rendables. */
export function sectionsFromSnapshot(snapshot: unknown): Section[] | null {
  if (!Array.isArray(snapshot)) return null
  const epoch = new Date(0)
  return (snapshot as SnapshotRow[]).map(
    (row) =>
      ({
        ...row,
        createdAt: epoch,
        updatedAt: epoch,
      }) as Section,
  )
}
