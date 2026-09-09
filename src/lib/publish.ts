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

/** Sérialisation stable pour comparaison — l'ordre des lignes est ramené
    au tri d'affichage, celui des clés est fixé par la projection. */
function serialize(rows: SnapshotRow[]): string {
  return JSON.stringify(
    [...rows].sort((a, b) => a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : 1)),
  )
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
