import { and, eq, gte, isNull, sql } from 'drizzle-orm'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'

import { MESSAGES } from './messages'
import { getBlock } from '@/blocks/registry'
import { parseGridPosition, type GridPosition } from '@/lib/grid'
import { nodeStylesSchema, type NodeStyles } from '@/lib/node-styles'
import { parseSectionSettings } from '@/lib/section-settings'
import { db } from '@/server/db'
import { pages, sections } from '@/server/db/schema'
import { tags } from '@/server/queries'

/*
 * Outils partagés par les actions de page (`sections.ts`,
 * `saved-sections.ts`, `publish.ts`, `seo.ts`). PAS un fichier
 * `'use server'` : rien ici ne doit devenir un endpoint.
 */

/** Invalide la home, la page concernée et la liste des pages. */
export function revalidatePage(slug: string) {
  revalidateTag(tags.page(slug))
  revalidateTag(tags.pages)
  revalidatePath('/', 'layout')
}

export async function slugOf(pageId: string): Promise<string> {
  const [row] = await db
    .select({ slug: pages.slug })
    .from(pages)
    .where(eq(pages.id, pageId))
    .limit(1)
  return row?.slug ?? ''
}

/** Les frères d'un emplacement : une colonne d'un parent, ou le premier
    niveau d'une page. */
export function siblingScope({
  pageId,
  parentId,
  columnIndex,
}: {
  pageId: string
  parentId: string | null
  columnIndex: number
}) {
  return parentId
    ? and(eq(sections.parentId, parentId), eq(sections.columnIndex, columnIndex))
    : and(eq(sections.pageId, pageId), isNull(sections.parentId))
}

/** Requête (non exécutée) qui décale d'un cran les frères à partir d'un
    rang — pour faire de la place à une insertion. */
export function shiftSiblingsFrom(
  scope: ReturnType<typeof siblingScope>,
  position: number,
) {
  return db
    .update(sections)
    .set({ sortOrder: sql`${sections.sortOrder} + 1` })
    .where(and(scope, gte(sections.sortOrder, position)))
}

/**
 * Vérifie qu'un bloc peut être placé dans le parent visé.
 *
 * Partagée par l'insertion et le déplacement : sans cela, on peut créer par
 * déplacement une configuration que l'insertion interdit — et un bloc placé
 * à un niveau que le rendu ne descend pas disparaît sans erreur.
 *
 * Renvoie un message d'erreur, ou `null` si le placement est valide.
 */
export async function validateParent({
  block,
  parentId,
  pageId,
}: {
  block: NonNullable<ReturnType<typeof getBlock>>
  parentId: string | null
  pageId: string
}): Promise<string | null> {
  if (!parentId) return null

  /* Un seul niveau d'imbrication. Sans ce plafond, une colonne pourrait
     contenir des colonnes, et le repliement mobile ne serait plus
     garantissable. */
  if (block.container) return MESSAGES.colonnesDansColonne

  if (!block.inline) {
    return `« ${block.label} » suppose toute la largeur et ne peut pas être placé dans une colonne.`
  }

  const [parent] = await db
    .select({
      parentId: sections.parentId,
      pageId: sections.pageId,
      type: sections.type,
    })
    .from(sections)
    .where(eq(sections.id, parentId))
    .limit(1)

  if (!parent) return MESSAGES.sectionIntrouvable
  if (parent.parentId) return MESSAGES.imbricationTropProfonde

  /* Toute section racine accueille des blocs : les conteneurs dans leurs
     colonnes, les sections toutes faites dans leurs deux zones (avant et
     après leur contenu composé). Le rendu couvre les deux cas — aucune
     ligne ne peut être écrite sans être rendue. */

  /* Et il doit appartenir à la même page : `pageId` et `parentId` viennent
     tous deux du client, sans recoupement une ligne orpheline est possible. */
  if (parent.pageId !== pageId) return MESSAGES.conteneurAutrePage

  return null
}

/* ════════════════════════════════════════════════════════════════════
   Instantanés — validation et réinsertion
   ════════════════════════════════════════════════════════════════════ */

const snapshotRowSchema = z.object({
  id: z.string().uuid(),
  pageId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  columnIndex: z.number().int().min(0).max(8),
  sortOrder: z.number().int().min(0).max(10000),
  type: z.string(),
  name: z.string().max(80).nullable(),
  anchor: z.string().max(60).nullable(),
  navLabel: z.string().max(60).nullable(),
  showInNav: z.boolean(),
  isActive: z.boolean(),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  payload: z.unknown(),
  styles: z.unknown().nullable(),
  placement: z.unknown().nullable(),
  /* Absent des instantanés pris avant l'arrivée des réglages de section :
     optionnel, et revalidé ligne par ligne ci-dessous. */
  settings: z.unknown().nullable().optional(),
})

export type ValidatedSnapshotRow = Omit<
  z.infer<typeof snapshotRowSchema>,
  'payload' | 'styles' | 'placement' | 'settings'
> & {
  payload: unknown
  styles: NodeStyles | null
  placement: GridPosition | null
  settings: unknown
}

/**
 * Revalide intégralement des lignes d'instantané (payload par le schéma
 * de leur type, styles, placement, réglages). Un instantané forgé côté
 * client — ou un instantané publié antérieur à une évolution des blocs —
 * ne peut rien écrire que les formulaires n'auraient pas accepté.
 */
export function validateSnapshotRows(
  input: unknown,
):
  | { ok: true; rows: ValidatedSnapshotRow[]; pageId: string | null }
  | { ok: false; error: string } {
  const parsed = z.array(snapshotRowSchema).max(500).safeParse(input)
  if (!parsed.success) return { ok: false, error: MESSAGES.instantaneIllisible }
  const rows = parsed.data

  const pageId = rows[0]?.pageId ?? null
  if (pageId !== null && rows.some((row) => row.pageId !== pageId)) {
    return { ok: false, error: MESSAGES.instantaneIllisible }
  }

  const validated: ValidatedSnapshotRow[] = []
  for (const row of rows) {
    /*
     * Une section dont le type a disparu du registre, ou dont le contenu
     * ne satisfait plus son schéma, n'est pas une raison de refuser TOUT
     * l'instantané : elle est reprise telle quelle. Le site ne la rend
     * pas, l'éditeur la signale (cartouche) — c'est déjà son état. La
     * refuser rendait « Annuler les modifications » impossible sur toute
     * page portant une section cassée, alors que c'est précisément là
     * qu'on veut pouvoir revenir en arrière. Ce qui est forgé (styles,
     * position) reste vérifié strictement.
     */
    const block = getBlock(row.type)
    const payload = block ? block.schema.safeParse(row.payload) : null
    const contenu = payload?.success ? payload.data : row.payload

    let styles: NodeStyles | null = null
    if (row.styles !== null) {
      const parsedStyles = nodeStylesSchema.safeParse(row.styles)
      if (!parsedStyles.success) return { ok: false, error: MESSAGES.apparenceRefusee }
      styles = parsedStyles.data
    }

    let placement: GridPosition | null = null
    if (row.placement !== null) {
      /* Accepte le format en cellules ET l'ancien format en pourcentages
         (converti) : un instantané pris avant la migration reste
         restaurable. */
      placement = parseGridPosition(row.placement)
      if (!placement) return { ok: false, error: MESSAGES.placementImpossible }
    }

    const settings =
      row.settings === null || row.settings === undefined
        ? null
        : parseSectionSettings(row.settings)

    validated.push({
      id: row.id,
      pageId: row.pageId,
      parentId: row.parentId,
      columnIndex: row.columnIndex,
      sortOrder: row.sortOrder,
      type: row.type,
      name: row.name,
      anchor: row.anchor,
      navLabel: row.navLabel,
      showInNav: row.showInNav,
      isActive: row.isActive,
      backgroundColor: row.backgroundColor,
      payload: contenu,
      styles,
      placement,
      settings,
    })
  }

  return { ok: true, rows: validated, pageId }
}

/**
 * Les requêtes (NON exécutées) qui réinsèrent des lignes validées, parents
 * d'abord — clé étrangère auto-référente : un enfant ne peut précéder son
 * parent. L'appelant les place dans un `db.batch`, avec ce qui doit partir
 * dans le même lot (la suppression du brouillon, par exemple).
 */
export function insertSnapshotRows(rows: ValidatedSnapshotRow[]) {
  const ids = new Set(rows.map((row) => row.id))
  const roots = rows.filter((row) => !row.parentId || !ids.has(row.parentId))
  const children = rows.filter((row) => row.parentId && ids.has(row.parentId))
  const queries = []
  if (roots.length > 0) queries.push(db.insert(sections).values(roots))
  if (children.length > 0) queries.push(db.insert(sections).values(children))
  return queries
}
