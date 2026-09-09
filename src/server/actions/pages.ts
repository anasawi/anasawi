'use server'

import { and, asc, eq, gt, gte, isNull, max, ne, sql } from 'drizzle-orm'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'

import { fail, guard, ok, type ActionResult } from './types'
import { getBlock, isBlockType } from '@/blocks/registry'
import { requireAdmin } from '@/lib/auth'
import { convertLegacySection } from '@/lib/convert-legacy'
import {
  defaultPosition,
  gridPositionSchema,
  parseGridPosition,
  type GridPosition,
} from '@/lib/grid'
import { nodeStylesSchema, type NodeStyles } from '@/lib/node-styles'
import { projectSection } from '@/lib/publish'
import { sectionSettingsSchema } from '@/lib/section-settings'
import { getTemplate } from '@/lib/templates'
import { seoFormSchema, slugSchema } from '@/lib/schemas'
import { db } from '@/server/db'
import { pages, savedSections, sections, seoMeta } from '@/server/db/schema'
import { tags } from '@/server/queries'

/** Invalide la home, la page concernée et la liste des pages. */
function revalidatePage(slug: string) {
  revalidateTag(tags.page(slug))
  revalidateTag(tags.pages)
  revalidatePath('/', 'layout')
}

async function slugOf(pageId: string): Promise<string> {
  const [row] = await db
    .select({ slug: pages.slug })
    .from(pages)
    .where(eq(pages.id, pageId))
    .limit(1)
  return row?.slug ?? ''
}

/* ════════════════════════════════════════════════════════════════════
   Sections — CRUD
   ════════════════════════════════════════════════════════════════════ */

/**
 * Vérifie qu'un bloc peut être placé dans le parent visé.
 *
 * Partagée par l'insertion et le déplacement : sans cela, on peut créer par
 * déplacement une configuration que l'insertion interdit — et un bloc placé
 * à un niveau que le rendu ne descend pas disparaît sans erreur.
 *
 * Renvoie un message d'erreur, ou `null` si le placement est valide.
 */
async function validateParent({
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
  if (block.container) {
    return 'Un bloc « Colonnes » ne peut pas être placé dans une colonne.'
  }

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

  if (!parent) return 'Section introuvable.'
  if (parent.parentId) return 'Imbrication trop profonde.'

  /* Toute section racine accueille des blocs : les conteneurs dans leurs
     colonnes, les sections toutes faites dans leurs deux zones (avant et
     après leur contenu composé). Le rendu couvre les deux cas — aucune
     ligne ne peut être écrite sans être rendue. */

  /* Et il doit appartenir à la même page : `pageId` et `parentId` viennent
     tous deux du client, sans recoupement une ligne orpheline est possible. */
  if (parent.pageId !== pageId) {
    return 'Le conteneur appartient à une autre page.'
  }

  return null
}

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
  temoignage: new Set(['quote']),
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
  return guard(async () => {
    await requireAdmin()

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

    if (!section) return fail('Bloc introuvable.')
    if (!INLINE_EDITABLE[section.type]?.has(fieldName)) {
      return fail('Ce champ ne se modifie pas en direct.')
    }

    const block = getBlock(section.type)
    if (!block) return fail('Type de bloc inconnu.')

    /* Repasse par le schéma du bloc : la fusion ne peut pas produire un
       payload que le rendu refuserait. */
    const merged = block.schema.safeParse({
      ...(section.payload as Record<string, unknown>),
      [fieldName]: trimmed,
    })
    if (!merged.success) return fail('Texte invalide pour ce bloc.')

    await db
      .update(sections)
      .set({ payload: merged.data, updatedAt: new Date() })
      .where(eq(sections.id, id))

    revalidatePage(await slugOf(section.pageId))
    return ok()
  })
}

/**
 * Déplace ou redimensionne un bloc dans une grille.
 *
 * Action distincte d'`updateSection` : elle est appelée à la fin de chaque
 * geste de souris, et ne doit toucher ni au payload ni aux réglages. La
 * position est en CELLULES (colonne, ligne, étendues), par breakpoint —
 * `gridPositionSchema` borne chaque entier.
 */
export async function updateGridPlacement(
  id: string,
  input: GridPosition,
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

    const parsed = gridPositionSchema.safeParse(input)
    if (!parsed.success) return fail('Position invalide.')

    const [section] = await db
      .select({ pageId: sections.pageId, parentId: sections.parentId })
      .from(sections)
      .where(eq(sections.id, id))
      .limit(1)

    if (!section?.parentId) return fail('Bloc introuvable ou hors grille.')

    await db
      .update(sections)
      .set({ placement: parsed.data, updatedAt: new Date() })
      .where(eq(sections.id, id))

    revalidatePage(await slugOf(section.pageId))
    return ok()
  })
}

/**
 * Règle la hauteur d'une grille — son nombre de lignes.
 *
 * Appelée à la fin du geste sur le bord bas d'un canevas. Le payload est
 * refondu puis revalidé par le schéma du bloc : rien d'autre que `rows`
 * ne peut être écrit par ce chemin.
 */
export async function updateCanvasRows(
  id: string,
  rows: number,
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

    const parsedRows = z.number().int().min(8).max(120).safeParse(rows)
    if (!parsedRows.success) return fail('Nombre de lignes invalide.')

    const [section] = await db
      .select({
        pageId: sections.pageId,
        type: sections.type,
        payload: sections.payload,
      })
      .from(sections)
      .where(eq(sections.id, id))
      .limit(1)

    if (!section) return fail('Section introuvable.')

    const block = getBlock(section.type)
    if (!block?.freeform) return fail('Cette section n’est pas une grille.')

    const merged = block.schema.safeParse({
      ...((section.payload as Record<string, unknown>) ?? {}),
      rows: parsedRows.data,
    })
    if (!merged.success) return fail('Réglage invalide.')

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
 * ce rang sont décalés d'un cran, en une seule requête.
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
  return guard(async () => {
    await requireAdmin()

    const block = isBlockType(type) ? getBlock(type) : null
    if (!block) return fail('Type de bloc inconnu.')

    const invalid = await validateParent({ block, parentId, pageId })
    if (invalid) return fail(invalid)

    const siblingScope = parentId
      ? and(
          eq(sections.parentId, parentId),
          eq(sections.columnIndex, columnIndex),
        )
      : and(eq(sections.pageId, pageId), isNull(sections.parentId))

    await db
      .update(sections)
      .set({ sortOrder: sql`${sections.sortOrder} + 1` })
      .where(and(siblingScope, gte(sections.sortOrder, position)))

    const parsedPlacement = placement
      ? gridPositionSchema.safeParse(placement)
      : null
    if (parsedPlacement && !parsedPlacement.success) {
      return fail('Position invalide.')
    }

    const [created] = await db
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
      .returning({ id: sections.id })

    if (!created) return fail('Création impossible.')

    revalidatePage(await slugOf(pageId))
    return ok({ id: created.id })
  })
}

/**
 * Instancie un modèle : l'arbre sérialisé devient de vrais nœuds en base,
 * entièrement modifiables. Chaque payload repasse par le schéma Zod de son
 * type — un modèle mal écrit échoue ici, jamais au rendu.
 */
export async function instantiateTemplate(
  pageId: string,
  templateId: string,
): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireAdmin()

    const template = getTemplate(templateId)
    if (!template) return fail('Modèle inconnu.')

    const rootBlock = getBlock(template.root.type)
    if (!rootBlock) return fail('Type racine inconnu.')

    const rootPayload = rootBlock.schema.safeParse(template.root.payload)
    if (!rootPayload.success) return fail('Modèle invalide (racine).')

    const [{ value: currentMax } = { value: null }] = await db
      .select({ value: max(sections.sortOrder) })
      .from(sections)
      .where(and(eq(sections.pageId, pageId), isNull(sections.parentId)))

    const [root] = await db
      .insert(sections)
      .values({
        pageId,
        type: template.root.type,
        name: template.root.name ?? template.label,
        sortOrder: (currentMax ?? -1) + 1,
        backgroundColor: template.backgroundColor,
        payload: rootPayload.data,
        styles: template.root.styles ?? null,
      })
      .returning({ id: sections.id })

    if (!root) return fail('Création impossible.')

    const children = template.root.children ?? []
    if (children.length > 0) {
      const rows = []
      for (const [index, child] of children.entries()) {
        const block = getBlock(child.type)
        if (!block) return fail(`Type inconnu dans le modèle : ${child.type}.`)
        const parsed = block.schema.safeParse(child.payload)
        if (!parsed.success) {
          return fail(`Modèle invalide (${child.type}).`)
        }
        rows.push({
          pageId,
          parentId: root.id,
          columnIndex: 0,
          sortOrder: index,
          type: child.type,
          name: child.name ?? null,
          payload: parsed.data,
          styles: child.styles ?? null,
          placement: child.placement ?? null,
        })
      }
      await db.insert(sections).values(rows)
    }

    revalidatePage(await slugOf(pageId))
    return ok({ id: root.id })
  })
}

/** Ajout en fin de page. */
export async function createSection(
  pageId: string,
  type: string,
): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    /* L'authentification passe avant la moindre requête : cette action est
       un endpoint POST appelable sans session, et un SELECT déclenché avant
       la garde serait une lecture accessible à n'importe qui. */
    await requireAdmin()

    const [{ value: currentMax } = { value: null }] = await db
      .select({ value: max(sections.sortOrder) })
      .from(sections)
      .where(and(eq(sections.pageId, pageId), isNull(sections.parentId)))

    return insertSection({ pageId, type, position: (currentMax ?? -1) + 1 })
  })
}

/**
 * Déplace un bloc existant vers une nouvelle position, éventuellement dans
 * une autre colonne ou hors de toute colonne.
 */
export async function moveSection({
  id,
  position,
  parentId = null,
  columnIndex = 0,
}: {
  id: string
  position: number
  parentId?: string | null
  columnIndex?: number
}): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

    const [section] = await db
      .select()
      .from(sections)
      .where(eq(sections.id, id))
      .limit(1)

    if (!section) return fail('Bloc introuvable.')
    if (parentId === id) return fail('Un bloc ne peut pas se contenir lui-même.')

    const block = getBlock(section.type)
    if (!block) return fail('Type de bloc inconnu.')

    const invalid = await validateParent({
      block,
      parentId,
      pageId: section.pageId,
    })
    if (invalid) return fail(invalid)

    /* On referme d'abord le trou laissé à l'ancienne position, puis on ouvre
       la place à la nouvelle. Fait dans cet ordre, le cas « même colonne,
       rang plus bas » reste juste sans calcul d'index particulier. */
    const oldScope = section.parentId
      ? and(
          eq(sections.parentId, section.parentId),
          eq(sections.columnIndex, section.columnIndex),
        )
      : and(eq(sections.pageId, section.pageId), isNull(sections.parentId))

    await db
      .update(sections)
      .set({ sortOrder: sql`${sections.sortOrder} - 1` })
      .where(and(oldScope, gt(sections.sortOrder, section.sortOrder)))

    const newScope = parentId
      ? and(
          eq(sections.parentId, parentId),
          eq(sections.columnIndex, columnIndex),
        )
      : and(eq(sections.pageId, section.pageId), isNull(sections.parentId))

    await db
      .update(sections)
      .set({ sortOrder: sql`${sections.sortOrder} + 1` })
      .where(
        and(newScope, gte(sections.sortOrder, position), ne(sections.id, id)),
      )

    /* Entrée dans une grille : un bloc sans placement en cellules recevrait
       le flux par défaut — on lui donne une position de départ visible en
       haut à gauche (l'ancien format en pourcentages est converti). */
    let placementPatch: Record<string, unknown> = {}
    if (parentId) {
      const [parent] = await db
        .select({ type: sections.type })
        .from(sections)
        .where(eq(sections.id, parentId))
        .limit(1)
      if (parent && getBlock(parent.type)?.freeform) {
        placementPatch = {
          placement:
            parseGridPosition(section.placement) ?? defaultPosition(section.type),
        }
      }
    }

    await db
      .update(sections)
      .set({
        parentId,
        columnIndex,
        sortOrder: position,
        ...placementPatch,
        ...(parentId
          ? { anchor: null, navLabel: null, showInNav: false }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(sections.id, id))

    revalidatePage(await slugOf(section.pageId))
    return ok()
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
  return guard(async () => {
    await requireAdmin()

    const [section] = await db
      .select({ pageId: sections.pageId, type: sections.type })
      .from(sections)
      .where(eq(sections.id, id))
      .limit(1)

    if (!section) return fail('Section introuvable.')

    const block = getBlock(section.type)
    if (!block) return fail('Type de section inconnu.')

    const parsedMeta = sectionMetaSchema.safeParse(meta)
    if (!parsedMeta.success) {
      return fail('Réglages invalides.', parsedMeta.error.flatten().fieldErrors)
    }

    /* Le payload est validé par le schéma du bloc avant d'atteindre la base :
       aucune section illisible ne peut y être écrite. */
    const parsedPayload = block.schema.safeParse(payload)
    if (!parsedPayload.success) {
      return fail(
        'Contenu invalide.',
        parsedPayload.error.flatten().fieldErrors as Record<string, string[]>,
      )
    }

    if (parsedMeta.data.showInNav && !parsedMeta.data.anchor) {
      return fail(
        'Une section visible dans la navigation doit avoir une ancre.',
      )
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
      if (!result.success) return fail('Styles invalides.')
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
  return guard(async () => {
    await requireAdmin()

    const [section] = await db
      .select({ pageId: sections.pageId })
      .from(sections)
      .where(eq(sections.id, id))
      .limit(1)
    if (!section) return fail('Bloc introuvable.')

    await db
      .update(sections)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(sections.id, id))

    revalidatePage(await slugOf(section.pageId))
    return ok()
  })
}

/** Renomme un bloc dans le panneau Calques. Vide = retour au libellé du type. */
export async function renameSection(
  id: string,
  name: string,
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

    const [section] = await db
      .select({ pageId: sections.pageId })
      .from(sections)
      .where(eq(sections.id, id))
      .limit(1)
    if (!section) return fail('Bloc introuvable.')

    await db
      .update(sections)
      .set({ name: name.trim().slice(0, 80) || null, updatedAt: new Date() })
      .where(eq(sections.id, id))

    revalidatePage(await slugOf(section.pageId))
    return ok()
  })
}

export async function deleteSection(id: string): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

    const [section] = await db
      .select({ pageId: sections.pageId })
      .from(sections)
      .where(eq(sections.id, id))
      .limit(1)

    if (!section) return fail('Section introuvable.')

    await db.delete(sections).where(eq(sections.id, id))

    revalidatePage(await slugOf(section.pageId))
    return ok()
  })
}

export async function duplicateSection(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireAdmin()

    const [source] = await db
      .select()
      .from(sections)
      .where(eq(sections.id, id))
      .limit(1)

    if (!source) return fail('Section introuvable.')

    const [created] = await db
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
        isActive: false,
        backgroundColor: source.backgroundColor,
        payload: source.payload,
        styles: source.styles,
        placement: source.placement,
      })
      .returning({ id: sections.id })

    if (!created) return fail('Duplication impossible.')

    revalidatePage(await slugOf(source.pageId))
    return ok({ id: created.id })
  })
}

/**
 * Convertit une section héritée en canevas d'éléments libres.
 *
 * Le §12 du cahier des charges : la composition figée devient un canevas
 * dont chaque morceau — titre, image, texte, bouton — est un bloc
 * indépendant, déplaçable et redimensionnable. La section garde son
 * identifiant, son ancre, son entrée de menu et son fond.
 *
 * L'annulation passe par l'instantané pris côté client avant l'appel.
 */
export async function convertToCanvas(
  id: string,
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

    const [section] = await db
      .select()
      .from(sections)
      .where(eq(sections.id, id))
      .limit(1)

    if (!section) return fail('Section introuvable.')
    if (section.parentId) return fail('Seule une section entière se convertit.')

    const conversion = convertLegacySection(section.type, section.payload)
    if (!conversion) {
      return fail(
        'Cette section est connectée à des données (accompagnements, FAQ, contact) et ne se décompose pas.',
      )
    }

    /* Chaque enfant repasse par le schéma Zod de son type : une conversion
       mal écrite échoue ici, jamais au rendu. */
    const rows = []
    for (const [index, child] of conversion.children.entries()) {
      const block = getBlock(child.type)
      const parsed = block?.schema.safeParse(child.payload)
      if (!block || !parsed?.success) {
        return fail(`Conversion invalide (${child.type}).`)
      }
      rows.push({
        pageId: section.pageId,
        parentId: section.id,
        columnIndex: 0,
        sortOrder: index,
        type: child.type,
        name: child.name ?? null,
        payload: parsed.data,
        placement: child.placement,
      })
    }

    /* Les enfants déjà présents (déposés dans les zones avant/après) sont
       conservés et décalés après les blocs issus de la conversion. */
    await db
      .update(sections)
      .set({ sortOrder: sql`${sections.sortOrder} + ${rows.length}` })
      .where(eq(sections.parentId, section.id))

    await db
      .update(sections)
      .set({
        type: 'canvas',
        payload: { height: 'moyen', rows: conversion.rows },
        updatedAt: new Date(),
      })
      .where(eq(sections.id, section.id))

    if (rows.length > 0) await db.insert(sections).values(rows)

    revalidatePage(await slugOf(section.pageId))
    return ok()
  })
}

/** Écrit les réglages d'une section (animation d'apparition). */
export async function updateSectionSettings(
  id: string,
  input: unknown,
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

    const parsed = sectionSettingsSchema.safeParse(input)
    if (!parsed.success) return fail('Réglages invalides.')

    const [section] = await db
      .select({ pageId: sections.pageId })
      .from(sections)
      .where(eq(sections.id, id))
      .limit(1)
    if (!section) return fail('Section introuvable.')

    await db
      .update(sections)
      .set({ settings: parsed.data, updatedAt: new Date() })
      .where(eq(sections.id, id))

    revalidatePage(await slugOf(section.pageId))
    return ok()
  })
}

/* ════════════════════════════════════════════════════════════════════
   Pages — CRUD
   ════════════════════════════════════════════════════════════════════ */

const pageFormSchema = z.object({
  title: z.string().trim().min(1, 'Le titre est requis.').max(120),
  slug: slugSchema,
})

async function slugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const [row] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(eq(pages.slug, slug))
    .limit(1)
  return row !== undefined && row.id !== exceptId
}

/** Crée une page vide, en brouillon. */
export async function createPage(
  input: z.input<typeof pageFormSchema>,
): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireAdmin()

    const parsed = pageFormSchema.safeParse(input)
    if (!parsed.success) {
      return fail('Formulaire invalide.', parsed.error.flatten().fieldErrors)
    }
    if (await slugTaken(parsed.data.slug)) {
      return fail('Ce slug est déjà utilisé par une autre page.')
    }

    const [created] = await db
      .insert(pages)
      .values({ title: parsed.data.title, slug: parsed.data.slug, status: 'draft' })
      .returning({ id: pages.id })

    if (!created) return fail('Création impossible.')

    revalidatePage(parsed.data.slug)
    return ok({ id: created.id })
  })
}

/** Renomme une page (titre, slug). Le slug de l'accueil ne bouge pas. */
export async function updatePageMeta(
  id: string,
  input: z.input<typeof pageFormSchema>,
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

    const parsed = pageFormSchema.safeParse(input)
    if (!parsed.success) {
      return fail('Formulaire invalide.', parsed.error.flatten().fieldErrors)
    }

    const [page] = await db
      .select({ isHome: pages.isHome, slug: pages.slug })
      .from(pages)
      .where(eq(pages.id, id))
      .limit(1)
    if (!page) return fail('Page introuvable.')

    const slug = page.isHome ? page.slug : parsed.data.slug
    if (!page.isHome && (await slugTaken(slug, id))) {
      return fail('Ce slug est déjà utilisé par une autre page.')
    }

    await db
      .update(pages)
      .set({ title: parsed.data.title, slug, updatedAt: new Date() })
      .where(eq(pages.id, id))

    revalidatePage(page.slug)
    revalidatePage(slug)
    return ok()
  })
}

/** Duplique une page avec toutes ses sections, en brouillon. */
export async function duplicatePage(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireAdmin()

    const [source] = await db
      .select()
      .from(pages)
      .where(eq(pages.id, id))
      .limit(1)
    if (!source) return fail('Page introuvable.')

    /* Slug unique : -copie, -copie-2, -copie-3… */
    let slug = `${source.slug}-copie`.slice(0, 80)
    for (let i = 2; await slugTaken(slug); i++) {
      slug = `${source.slug}-copie-${i}`.slice(0, 80)
    }

    const [created] = await db
      .insert(pages)
      .values({
        title: `${source.title} (copie)`,
        slug,
        status: 'draft',
      })
      .returning({ id: pages.id })
    if (!created) return fail('Duplication impossible.')

    const rows = await db
      .select()
      .from(sections)
      .where(eq(sections.pageId, id))

    if (rows.length > 0) {
      await db.insert(sections).values(
        rows.map((row) => ({
          pageId: created.id,
          parentId: null,
          columnIndex: row.columnIndex,
          placement: row.placement,
          styles: row.styles,
          settings: row.settings,
          name: row.name,
          type: row.type,
          anchor: row.anchor,
          navLabel: row.navLabel,
          showInNav: row.showInNav,
          sortOrder: row.sortOrder,
          isActive: row.isActive,
          backgroundColor: row.backgroundColor,
          payload: row.payload,
        })),
      )
    }

    revalidatePage(slug)
    return ok({ id: created.id })
  })
}

/** Supprime une page et ses sections. L'accueil est indestructible. */
export async function deletePage(id: string): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

    const [page] = await db
      .select({ isHome: pages.isHome, slug: pages.slug })
      .from(pages)
      .where(eq(pages.id, id))
      .limit(1)
    if (!page) return fail('Page introuvable.')
    if (page.isHome) return fail('La page d’accueil ne peut pas être supprimée.')

    await db.delete(pages).where(eq(pages.id, id))

    revalidatePage(page.slug)
    return ok()
  })
}

/** Retire une page du site public sans toucher à son contenu. */
export async function unpublishPage(id: string): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

    const [page] = await db
      .select({ isHome: pages.isHome, slug: pages.slug })
      .from(pages)
      .where(eq(pages.id, id))
      .limit(1)
    if (!page) return fail('Page introuvable.')
    if (page.isHome) return fail('La page d’accueil ne peut pas être dépubliée.')

    await db
      .update(pages)
      .set({ status: 'draft', updatedAt: new Date() })
      .where(eq(pages.id, id))

    revalidatePage(page.slug)
    return ok()
  })
}

/* ════════════════════════════════════════════════════════════════════
   Mes sections — modèles personnels
   ════════════════════════════════════════════════════════════════════ */

/**
 * Enregistre une section personnalisée comme modèle personnel. Le contenu
 * est relu EN BASE (pas depuis le client) : on fige exactement ce qui est
 * enregistré, rien d'autre.
 */
export async function saveSectionAsTemplate(
  sectionId: string,
  name: string,
): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireAdmin()

    const trimmed = name.trim().slice(0, 80)
    if (!trimmed) return fail('Donnez un nom à ce modèle.')

    const [section] = await db
      .select()
      .from(sections)
      .where(eq(sections.id, sectionId))
      .limit(1)

    if (!section) return fail('Section introuvable.')
    if (section.parentId) return fail('Seule une section entière s’enregistre.')
    if (!getBlock(section.type)) return fail('Type de section inconnu.')

    const [created] = await db
      .insert(savedSections)
      .values({
        name: trimmed,
        type: section.type,
        backgroundColor: section.backgroundColor,
        payload: section.payload,
        settings: section.settings,
      })
      .returning({ id: savedSections.id })

    if (!created) return fail('Enregistrement impossible.')
    return ok({ id: created.id })
  })
}

export async function deleteSavedSection(
  id: string,
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()
    await db.delete(savedSections).where(eq(savedSections.id, id))
    return ok()
  })
}

/** Insère un modèle personnel dans une page, à une position donnée. */
export async function insertSavedSection({
  pageId,
  savedId,
  position,
}: {
  pageId: string
  savedId: string
  position: number
}): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireAdmin()

    const [saved] = await db
      .select()
      .from(savedSections)
      .where(eq(savedSections.id, savedId))
      .limit(1)

    if (!saved) return fail('Modèle introuvable.')

    const block = getBlock(saved.type)
    if (!block) return fail('Type de section inconnu.')

    /* Le payload repasse par le schéma du type : un modèle enregistré
       avant une évolution du template reste insérable proprement. */
    const payload = block.schema.safeParse(saved.payload)
    if (!payload.success) return fail('Ce modèle n’est plus compatible.')

    await db
      .update(sections)
      .set({ sortOrder: sql`${sections.sortOrder} + 1` })
      .where(
        and(
          eq(sections.pageId, pageId),
          isNull(sections.parentId),
          gte(sections.sortOrder, position),
        ),
      )

    const [created] = await db
      .insert(sections)
      .values({
        pageId,
        type: saved.type,
        name: saved.name,
        sortOrder: position,
        backgroundColor: saved.backgroundColor,
        payload: payload.data,
        settings: saved.settings,
      })
      .returning({ id: sections.id })

    if (!created) return fail('Insertion impossible.')

    revalidatePage(await slugOf(pageId))
    return ok({ id: created.id })
  })
}

/* ════════════════════════════════════════════════════════════════════
   Publication
   ════════════════════════════════════════════════════════════════════ */

/**
 * Publie une page : copie l'état courant de ses sections dans
 * l'instantané servi au public. Entre deux publications, l'admin édite
 * librement — les visiteurs ne voient rien.
 */
export async function publishPage(pageId: string): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

    const rows = await db
      .select()
      .from(sections)
      .where(eq(sections.pageId, pageId))
      .orderBy(asc(sections.sortOrder), asc(sections.createdAt))

    await db
      .update(pages)
      .set({
        publishedSnapshot: rows.map(projectSection),
        publishedAt: new Date(),
        status: 'published',
        updatedAt: new Date(),
      })
      .where(eq(pages.id, pageId))

    revalidatePage(await slugOf(pageId))
    return ok()
  })
}

/* ════════════════════════════════════════════════════════════════════
   Restauration — l'inverse d'une suppression
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
})

/**
 * Restaure un sous-arbre supprimé — le ⌘Z d'une suppression.
 *
 * Les lignes sont réinsérées avec leurs identifiants D'ORIGINE : les autres
 * entrées d'historique qui les référencent restent valides. Chaque ligne est
 * revalidée intégralement (payload par le schéma de son type, styles,
 * placement) : un instantané forgé côté client ne peut rien écrire que les
 * formulaires n'auraient pas accepté.
 */
export async function restoreSections(
  input: unknown,
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

    const parsed = z.array(snapshotRowSchema).min(1).max(200).safeParse(input)
    if (!parsed.success) return fail('Instantané invalide.')
    const rows = parsed.data

    const pageId = rows[0]?.pageId
    if (!pageId || rows.some((row) => row.pageId !== pageId)) {
      return fail('Instantané incohérent.')
    }

    const validated = []
    for (const row of rows) {
      const block = getBlock(row.type)
      if (!block) return fail(`Type inconnu : ${row.type}.`)

      const payload = block.schema.safeParse(row.payload)
      if (!payload.success) return fail('Contenu invalide dans l’instantané.')

      let styles: NodeStyles | null = null
      if (row.styles !== null) {
        const parsedStyles = nodeStylesSchema.safeParse(row.styles)
        if (!parsedStyles.success) return fail('Styles invalides.')
        styles = parsedStyles.data
      }

      let placement: GridPosition | null = null
      if (row.placement !== null) {
        /* Accepte le format en cellules ET l'ancien format en pourcentages
           (converti) : un instantané pris avant la migration reste
           restaurable. */
        placement = parseGridPosition(row.placement)
        if (!placement) return fail('Position invalide.')
      }

      validated.push({ ...row, payload: payload.data, styles, placement })
    }

    /* Les parents d'abord : une ligne dont le parent fait partie de
       l'instantané doit être insérée après lui (contrainte de clé
       étrangère auto-référente). */
    const ids = new Set(validated.map((row) => row.id))
    const roots = validated.filter(
      (row) => !row.parentId || !ids.has(row.parentId),
    )
    const children = validated.filter(
      (row) => row.parentId && ids.has(row.parentId),
    )

    if (roots.length > 0) await db.insert(sections).values(roots)
    if (children.length > 0) await db.insert(sections).values(children)

    revalidatePage(await slugOf(pageId))
    return ok()
  })
}

/** Réordonnancement en une seule requête, plutôt qu'un UPDATE par section. */
export async function reorderSections(
  pageId: string,
  orderedIds: string[],
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

    if (orderedIds.length === 0) return ok()

    const cases = orderedIds
      .map((id, index) => sql`when ${sections.id} = ${id} then ${index}`)
      .reduce((acc, part) => sql`${acc} ${part}`)

    await db
      .update(sections)
      .set({ sortOrder: sql`case ${cases} else ${sections.sortOrder} end` })
      .where(eq(sections.pageId, pageId))

    revalidatePage(await slugOf(pageId))
    return ok()
  })
}

/* ════════════════════════════════════════════════════════════════════
   SEO
   ════════════════════════════════════════════════════════════════════ */

export async function updateSeo(
  pageId: string,
  input: z.input<typeof seoFormSchema>,
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

    const parsed = seoFormSchema.safeParse(input)
    if (!parsed.success) {
      return fail('Formulaire invalide.', parsed.error.flatten().fieldErrors)
    }

    const values = {
      ...parsed.data,
      canonical: parsed.data.canonical || null,
      updatedAt: new Date(),
    }

    await db
      .insert(seoMeta)
      .values({ pageId, ...values })
      .onConflictDoUpdate({ target: seoMeta.pageId, set: values })

    revalidatePage(await slugOf(pageId))
    return ok()
  })
}
