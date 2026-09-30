import type { Section } from '@/server/db/schema'
import type { SnapshotRow } from '@/types/content'

/**
 * Instantané publié — la projection d'une section, et son inverse.
 *
 * Module PUR : aucune dépendance au registre de blocs ni aux schémas Zod.
 * C'est ce qui permet à `server/queries` de relire un instantané sans
 * embarquer tous les composants de rendu, et ce qui garde `lib/publish.ts`
 * (la comparaison, qui a besoin du registre) séparé de la lecture.
 */

export type { SnapshotRow }

/** Ce qui est figé dans `pages.published_snapshot` : la ligne sans ses
    horodatages. */
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
 * Une ligne de section complète et typée, à partir d'un fragment.
 *
 * Pour les aperçus (bibliothèque de templates, éditeur) qui fabriquent des
 * sections qui n'existent pas en base : les défauts sont ceux du schéma,
 * et le résultat est un `Section` sans `as` — ajouter une colonne à la
 * table fait échouer la compilation ici, au lieu de laisser passer un
 * objet incomplet.
 */
export function makeSectionRow(patch: Partial<Section> & { type: string }): Section {
  const now = new Date()
  return {
    id: `preview-${patch.type}`,
    pageId: 'preview',
    parentId: null,
    columnIndex: 0,
    placement: null,
    settings: null,
    styles: null,
    name: null,
    anchor: null,
    navLabel: null,
    showInNav: false,
    sortOrder: 0,
    isActive: true,
    backgroundColor: '#fcfaf7',
    payload: {},
    createdAt: now,
    updatedAt: now,
    ...patch,
  }
}

/** Relit un instantané comme des lignes de sections rendables. */
export function sectionsFromSnapshot(snapshot: unknown): Section[] | null {
  if (!Array.isArray(snapshot)) return null
  const epoch = new Date(0)
  return (snapshot as SnapshotRow[]).map((row) =>
    makeSectionRow({ ...row, createdAt: epoch, updatedAt: epoch }),
  )
}
