'use server'

import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import { adminAction } from './admin'
import { MESSAGES } from './messages'
import {
  revalidatePage,
  shiftSiblingsFrom,
  siblingScope,
  slugOf,
  validateParent,
} from './page-helpers'
import {
  fail,
  formError,
  isUuid,
  ok,
  uuidListSchema,
  type ActionResult,
} from './types'
import { getBlock, isBlockType } from '@/blocks/registry'
import { gridPositionSchema, type GridPosition } from '@/lib/grid'
import { nodeStylesSchema, type NodeStyles } from '@/lib/node-styles'
import { sectionSettingsSchema } from '@/lib/section-settings'
import { db, runBatch } from '@/server/db'
import { sections } from '@/server/db/schema'

/* ════════════════════════════════════════════════════════════════════
   Sections — CRUD
   ════════════════════════════════════════════════════════════════════ */

/**
 * Champs modifiables par l'édition en direct (double-clic dans l'aperçu),
 * par type de bloc. Liste blanche stricte : cette action reçoit un nom de
 * champ venu du client et fusionne dans un JSONB — sans elle, n'importe
 * quelle clé du payload serait inscriptible en contournant le schéma Zod.
 */
const INLINE_EDITABLE: Record<string, Set<string>> = {
  heading: new Set(['text']),
  text: new Set(['body']),
  button: new Set(['label']),
  badge: new Set(['label']),
  citation: new Set(['text']),
  carte: new Set(['title']),
  atout: new Set(['title']),
  avatar: new Set(['name']),
  encart: new Set(['title']),
  tarif: new Set(['title']),
  barre: new Set(['label']),
}

/** Écrit un champ texte d'un bloc — le chemin de l'édition en direct. */
export async function updateTextField(
  id: string,
  fieldName: string,
  value: string,
): Promise<ActionResult<void>> {
  return adminAction(async () => {
    if (!isUuid(id)) return fail(MESSAGES.sectionIntrouvable)
    if (typeof fieldName !== 'string' || typeof value !== 'string') {
      return fail(MESSAGES.texteRefuse)
    }

    const trimmed = value.slice(0, 8000)

    const [section] = await db
      .select({
        pageId: sections.pageId,
        type: sections.type,
        payload: sections.payload,
      })
      .from(sections)
      .where(eq(sections.id, id))
      .limit(1)

    if (!section) return fail(MESSAGES.sectionIntrouvable)
    if (!INLINE_EDITABLE[section.type]?.has(fieldName)) {
      return fail(MESSAGES.texteNonEditableEnDirect)
    }

    const block = getBlock(section.type)
    if (!block) return fail(MESSAGES.blocIndisponible)

    /* Repasse par le schéma du bloc : la fusion ne peut pas produire un
       payload que le rendu refuserait. */
    const merged = block.schema.safeParse({
      ...(section.payload as Record<string, unknown>),
      [fieldName]: trimmed,
    })
    if (!merged.success) return fail(MESSAGES.texteRefuse)

    await db
      .update(sections)
      .set({ payload: merged.data, updatedAt: new Date() })
      .where(eq(sections.id, id))

    revalidatePage(await slugOf(section.pageId))
    return ok()
  })
}

/**
 * Insère un bloc à une position précise.
 *
 * `parentId` et `columnIndex` placent le bloc dans une colonne ; `position`
 * est le rang souhaité parmi ses futurs frères. Les frères situés à partir de
 * ce rang sont décalés d'un cran, dans le même lot que l'insertion — TOUT
 * est validé avant : un placement refusé ne laisse pas de trou dans les
 * rangs.
 */
export async function insertSection({
  pageId,
  type,
  position,
  parentId = null,
  columnIndex = 0,
  placement = null,
}: {
  pageId: string
  type: string
  position: number
  parentId?: string | null
  columnIndex?: number
  /** Position initiale dans une grille — cellules du point de dépôt. */
  placement?: GridPosition | null
}): Promise<ActionResult<{ id: string }>> {
  return adminAction(async () => {
    if (!isUuid(pageId)) return fail(MESSAGES.pageIntrouvable)
    if (parentId !== null && !isUuid(parentId)) return fail(MESSAGES.sectionIntrouvable)
    if (!Number.isInteger(position) || position < 0 || position > 10000) {
      return fail(MESSAGES.placementImpossible)
    }
    if (!Number.isInteger(columnIndex) || columnIndex < 0 || columnIndex > 8) {
      return fail(MESSAGES.placementImpossible)
    }

    const block = isBlockType(type) ? getBlock(type) : null
    if (!block) return fail(MESSAGES.blocIndisponible)

    const invalid = await validateParent({ block, parentId, pageId })
    if (invalid) return fail(invalid)

    const parsedPlacement = placement ? gridPositionSchema.safeParse(placement) : null
    if (parsedPlacement && !parsedPlacement.success) {
      return fail(MESSAGES.placementImpossible)
    }

    const scope = siblingScope({ pageId, parentId, columnIndex })
    const [, created] = await db.batch([
      shiftSiblingsFrom(scope, position),
      db
        .insert(sections)
        .values({
          pageId,
          parentId,
          columnIndex,
          placement: parsedPlacement?.data ?? null,
          type,
          /* Une ancre n'a de sens que sur une section de premier niveau : on
             ne navigue pas vers le tiers d'une colonne. */
          anchor: parentId ? null : block.suggestedAnchor || null,
          navLabel: !parentId && block.navigable ? block.label : null,
          showInNav: !parentId && (block.navigable ?? false),
          sortOrder: position,
          payload: block.schema.parse(block.defaults),
        })
        .returning({ id: sections.id }),
    ])

    if (!created[0]) return fail(MESSAGES.enregistrementEchoue)

    revalidatePage(await slugOf(pageId))
    return ok({ id: created[0].id })
  })
}

const sectionMetaSchema = z.object({
  anchor: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]*$/, 'Minuscules, chiffres et tirets uniquement.')
    .max(60)
    .nullable(),
  navLabel: z.string().trim().max(60).nullable(),
  showInNav: z.boolean(),
  isActive: z.boolean(),
  /* Seul le fond est stocké. La couleur du texte est dérivée au rendu, ce
     qui rend structurellement impossible d'enregistrer une section dont le
     texte serait illisible sur son propre fond. */
  backgroundColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Couleur hexadécimale attendue, ex. #fcfaf7.')
    .transform((hex) => hex.toLowerCase()),
})

export async function updateSection(
  id: string,
  meta: z.input<typeof sectionMetaSchema>,
  payload: unknown,
  styles?: unknown,
): Promise<ActionResult<void>> {
  return adminAction(async () => {
    if (!isUuid(id)) return fail(MESSAGES.sectionIntrouvable)

    const [section] = await db
      .select({ pageId: sections.pageId, type: sections.type })
      .from(sections)
      .where(eq(sections.id, id))
      .limit(1)

    if (!section) return fail(MESSAGES.sectionIntrouvable)

    const block = getBlock(section.type)
    if (!block) return fail(MESSAGES.blocIndisponible)

    const parsedMeta = sectionMetaSchema.safeParse(meta)
    if (!parsedMeta.success) return formError(parsedMeta.error, MESSAGES.champsACorriger)

    /* Le payload est validé par le schéma du bloc avant d'atteindre la base :
       aucune section illisible ne peut y être écrite. */
    const parsedPayload = block.schema.safeParse(payload)
    if (!parsedPayload.success) {
      return formError(parsedPayload.error, MESSAGES.contenuInvalide)
    }

    if (parsedMeta.data.showInNav && !parsedMeta.data.anchor) {
      return fail(MESSAGES.ancreRequise)
    }

    /* Styles : `undefined` = ne pas toucher ; `null` = tout réinitialiser ;
       sinon validation stricte — nombres bornés, couleurs hexadécimales. */
    let parsedStyles: NodeStyles | null | undefined
    if (styles === undefined) {
      parsedStyles = undefined
    } else if (styles === null) {
      parsedStyles = null
    } else {
      const result = nodeStylesSchema.safeParse(styles)
      if (!result.success) return fail(MESSAGES.apparenceRefusee)
      parsedStyles = result.data
    }

    await db
      .update(sections)
      .set({
        ...parsedMeta.data,
        payload: parsedPayload.data,
        ...(parsedStyles !== undefined ? { styles: parsedStyles } : {}),
        updatedAt: new Date(),
      })
      .where(eq(sections.id, id))

    revalidatePage(await slugOf(section.pageId))
    return ok()
  })
}

/** Bascule la visibilité d'un bloc — chemin léger pour le panneau Calques. */
export async function toggleSection(
  id: string,
  isActive: boolean,
): Promise<ActionResult<void>> {
  return adminAction(async () => {
    if (!isUuid(id)) return fail(MESSAGES.sectionIntrouvable)

    const [section] = await db
      .update(sections)
      .set({ isActive: Boolean(isActive), updatedAt: new Date() })
      .where(eq(sections.id, id))
      .returning({ pageId: sections.pageId })
    if (!section) return fail(MESSAGES.sectionIntrouvable)

    revalidatePage(await slugOf(section.pageId))
    return ok()
  })
}

/** Renomme un bloc dans le panneau Calques. Vide = retour au libellé du type. */
export async function renameSection(
  id: string,
  name: string,
): Promise<ActionResult<void>> {
  return adminAction(async () => {
    if (!isUuid(id)) return fail(MESSAGES.sectionIntrouvable)
    if (typeof name !== 'string') return fail(MESSAGES.champsACorriger)

    const [section] = await db
      .update(sections)
      .set({ name: name.trim().slice(0, 80) || null, updatedAt: new Date() })
      .where(eq(sections.id, id))
      .returning({ pageId: sections.pageId })
    if (!section) return fail(MESSAGES.sectionIntrouvable)

    revalidatePage(await slugOf(section.pageId))
    return ok()
  })
}

export async function deleteSection(id: string): Promise<ActionResult<void>> {
  return adminAction(async () => {
    if (!isUuid(id)) return fail(MESSAGES.sectionIntrouvable)

    const [section] = await db
      .delete(sections)
      .where(eq(sections.id, id))
      .returning({ pageId: sections.pageId })
    if (!section) return fail(MESSAGES.sectionIntrouvable)

    revalidatePage(await slugOf(section.pageId))
    return ok()
  })
}

export async function duplicateSection(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  return adminAction(async () => {
    if (!isUuid(id)) return fail(MESSAGES.sectionIntrouvable)

    const [source] = await db
      .select()
      .from(sections)
      .where(eq(sections.id, id))
      .limit(1)

    if (!source) return fail(MESSAGES.sectionIntrouvable)

    /* La copie prend la place juste après l'original : les frères situés
       à partir de ce rang sont décalés d'un cran, comme à l'insertion, et
       dans le même lot. Sans cela, deux lignes partageaient le même rang
       et l'ordre affiché dépendait de la date de création. */
    const scope = siblingScope({
      pageId: source.pageId,
      parentId: source.parentId,
      columnIndex: source.columnIndex,
    })

    const [, created] = await db.batch([
      shiftSiblingsFrom(scope, source.sortOrder + 1),
      db
        .insert(sections)
        .values({
          pageId: source.pageId,
          parentId: source.parentId,
          columnIndex: source.columnIndex,
          type: source.type,
          name: source.name ? `${source.name} (copie)` : null,
          /* L'ancre n'est pas dupliquée : deux id identiques casseraient le
             scroll et la navigation. */
          anchor: null,
          navLabel: null,
          showInNav: false,
          sortOrder: source.sortOrder + 1,
          /* Même visibilité que l'original : rien n'est en ligne avant
             « Publier », inutile de cacher la copie par défaut. */
          isActive: source.isActive,
          backgroundColor: source.backgroundColor,
          payload: source.payload,
          styles: source.styles,
          settings: source.settings,
          placement: source.placement,
        })
        .returning({ id: sections.id }),
    ])

    if (!created[0]) return fail(MESSAGES.copieEchouee)

    revalidatePage(await slugOf(source.pageId))
    return ok({ id: created[0].id })
  })
}

/** Écrit les réglages d'une section (animation d'apparition). */
export async function updateSectionSettings(
  id: string,
  input: unknown,
): Promise<ActionResult<void>> {
  return adminAction(async () => {
    if (!isUuid(id)) return fail(MESSAGES.sectionIntrouvable)

    const parsed = sectionSettingsSchema.safeParse(input)
    if (!parsed.success) return fail(MESSAGES.champsACorriger)

    const [section] = await db
      .update(sections)
      .set({ settings: parsed.data, updatedAt: new Date() })
      .where(eq(sections.id, id))
      .returning({ pageId: sections.pageId })
    if (!section) return fail(MESSAGES.sectionIntrouvable)

    revalidatePage(await slugOf(section.pageId))
    return ok()
  })
}

/** Réordonnancement en une seule requête, plutôt qu'un UPDATE par section. */
export async function reorderSections(
  pageId: string,
  orderedIds: string[],
): Promise<ActionResult<void>> {
  return adminAction(async () => {
    if (!isUuid(pageId)) return fail(MESSAGES.pageIntrouvable)
    const ids = uuidListSchema.safeParse(orderedIds)
    if (!ids.success) return fail(MESSAGES.sectionIntrouvable)
    if (ids.data.length === 0) return ok()

    const cases = ids.data
      .map((id, index) => sql`when ${sections.id} = ${id} then ${index}`)
      .reduce((acc, part) => sql`${acc} ${part}`)

    await runBatch([
      db
        .update(sections)
        .set({ sortOrder: sql`case ${cases} else ${sections.sortOrder} end` })
        .where(eq(sections.pageId, pageId)),
    ])

    revalidatePage(await slugOf(pageId))
    return ok()
  })
}
