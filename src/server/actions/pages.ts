'use server'

import { and, asc, eq, gte, isNull, sql } from 'drizzle-orm'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'

import { fail, guard, ok, type ActionResult } from './types'
import { getBlock, isBlockType } from '@/blocks/registry'
import { requireAdmin } from '@/lib/auth'
import {
  gridPositionSchema,
  parseGridPosition,
  type GridPosition,
} from '@/lib/grid'
import { nodeStylesSchema, type NodeStyles } from '@/lib/node-styles'
import { projectSection } from '@/lib/publish'
import {
  parseSectionSettings,
  sectionSettingsSchema,
} from '@/lib/section-settings'
import { seoFormSchema } from '@/lib/schemas'
import { db } from '@/server/db'
import {
  pages,
  savedSections,
  sections,
  seoMeta,
  settings,
  type SavedSection,
  type Section,
} from '@/server/db/schema'
import { tags } from '@/server/queries'

/** Invalide la home, la page concernée et la liste des pages. */
function revalidatePage(slug: string) {
  revalidateTag(tags.page(slug))
  revalidateTag(tags.pages)
  revalidatePath('/', 'layout')
}

/**
 * Les identifiants viennent du client. Un uuid mal formé provoquerait une
 * erreur Postgres (`invalid input syntax for type uuid`) attrapée par
 * `guard` en message générique ; on préfère refuser proprement en amont,
 * avant toute écriture.
 */
const uuidSchema = z.string().uuid()
const isUuid = (value: unknown): value is string =>
  uuidSchema.safeParse(value).success

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

  if (!parent) return 'Cette section n’existe plus — elle a peut-être été supprimée. Rechargez la page.'
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

    if (!section) return fail('Cette section n’existe plus — elle a peut-être été supprimée. Rechargez la page.')
    if (!INLINE_EDITABLE[section.type]?.has(fieldName)) {
      return fail('Ce texte se modifie depuis le panneau de droite, pas directement dans la page.')
    }

    const block = getBlock(section.type)
    if (!block) return fail('Ce modèle de section n’est plus disponible.')

    /* Repasse par le schéma du bloc : la fusion ne peut pas produire un
       payload que le rendu refuserait. */
    const merged = block.schema.safeParse({
      ...(section.payload as Record<string, unknown>),
      [fieldName]: trimmed,
    })
    if (!merged.success) return fail('Ce texte n’est pas accepté pour cette section.')

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

    if (!isUuid(pageId)) return fail('La page n’a pas été trouvée. Rechargez l’administration.')
    if (parentId !== null && !isUuid(parentId)) {
      return fail('Cette section n’existe plus — elle a peut-être été supprimée. Rechargez la page.')
    }

    const block = isBlockType(type) ? getBlock(type) : null
    if (!block) return fail('Ce modèle de section n’est plus disponible.')

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
      return fail('Impossible de placer la section à cet endroit. Réessayez.')
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

    if (!created) return fail('L’enregistrement n’a pas abouti. Réessayez dans un instant.')

    revalidatePage(await slugOf(pageId))
    return ok({ id: created.id })
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

    if (!section) return fail('Cette section n’existe plus — elle a peut-être été supprimée. Rechargez la page.')

    const block = getBlock(section.type)
    if (!block) return fail('Ce modèle de section n’est plus disponible.')

    const parsedMeta = sectionMetaSchema.safeParse(meta)
    if (!parsedMeta.success) {
      return fail('Certains champs sont à corriger.', parsedMeta.error.flatten().fieldErrors)
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
      if (!result.success) return fail('Ces réglages d’apparence ne sont pas acceptés.')
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
    if (!section) return fail('Cette section n’existe plus — elle a peut-être été supprimée. Rechargez la page.')

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
    if (!section) return fail('Cette section n’existe plus — elle a peut-être été supprimée. Rechargez la page.')

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

    if (!section) return fail('Cette section n’existe plus — elle a peut-être été supprimée. Rechargez la page.')

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

    if (!source) return fail('Cette section n’existe plus — elle a peut-être été supprimée. Rechargez la page.')

    /* La copie prend la place juste après l'original : les frères situés
       à partir de ce rang sont décalés d'un cran, comme à l'insertion. Sans
       cela, deux lignes partageaient le même rang et l'ordre affiché
       dépendait de la date de création. */
    const siblingScope = source.parentId
      ? and(
          eq(sections.parentId, source.parentId),
          eq(sections.columnIndex, source.columnIndex),
        )
      : and(eq(sections.pageId, source.pageId), isNull(sections.parentId))

    await db
      .update(sections)
      .set({ sortOrder: sql`${sections.sortOrder} + 1` })
      .where(and(siblingScope, gte(sections.sortOrder, source.sortOrder + 1)))

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
        /* Même visibilité que l'original : rien n'est en ligne avant
           « Publier », inutile de cacher la copie par défaut. */
        isActive: source.isActive,
        backgroundColor: source.backgroundColor,
        payload: source.payload,
        styles: source.styles,
        settings: source.settings,
        placement: source.placement,
      })
      .returning({ id: sections.id })

    if (!created) return fail('La copie n’a pas abouti. Réessayez.')

    revalidatePage(await slugOf(source.pageId))
    return ok({ id: created.id })
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
    if (!parsed.success) return fail('Certains champs sont à corriger.')

    const [section] = await db
      .select({ pageId: sections.pageId })
      .from(sections)
      .where(eq(sections.id, id))
      .limit(1)
    if (!section) return fail('Cette section n’existe plus — elle a peut-être été supprimée. Rechargez la page.')

    await db
      .update(sections)
      .set({ settings: parsed.data, updatedAt: new Date() })
      .where(eq(sections.id, id))

    revalidatePage(await slugOf(section.pageId))
    return ok()
  })
}

/* ════════════════════════════════════════════════════════════════════
   Formulaires
   ════════════════════════════════════════════════════════════════════ */

/**
 * Refus de formulaire, avec LA raison.
 *
 * « Formulaire invalide. » sur plusieurs champs ne dit pas quoi corriger.
 * Le schéma porte déjà des messages écrits pour être lus — « La
 * description dépasse 160 caractères. » — et ils se perdaient en route. On remonte le premier,
 * en gardant le détail par champ pour l'affichage sous les libellés.
 */
function refusDeFormulaire(erreur: z.ZodError): ActionResult<never> {
  const premier = erreur.issues[0]?.message
  const parChamp: Record<string, string[]> = {}
  for (const [champ, messages] of Object.entries(erreur.flatten().fieldErrors)) {
    if (messages) parChamp[champ] = messages
  }
  return fail(premier || 'Certains champs sont à corriger.', parChamp)
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
): Promise<ActionResult<SavedSection>> {
  return guard(async () => {
    await requireAdmin()

    const trimmed = name.trim().slice(0, 80)
    if (!trimmed) return fail('Donnez un nom à ce modèle.')

    const [section] = await db
      .select()
      .from(sections)
      .where(eq(sections.id, sectionId))
      .limit(1)

    if (!section) return fail('Cette section n’existe plus — elle a peut-être été supprimée. Rechargez la page.')
    if (section.parentId) return fail('Seule une section entière peut devenir un modèle.')
    if (!getBlock(section.type)) return fail('Ce modèle de section n’est plus disponible.')

    const [created] = await db
      .insert(savedSections)
      .values({
        name: trimmed,
        type: section.type,
        backgroundColor: section.backgroundColor,
        payload: section.payload,
        settings: section.settings,
      })
      .returning()

    if (!created) return fail('L’enregistrement n’a pas abouti. Réessayez dans un instant.')
    /* La ligne complète est renvoyée : l'éditeur l'ajoute à « Mes
       sections » sans recharger la page. */
    return ok(created)
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

    if (!isUuid(pageId)) return fail('La page n’a pas été trouvée. Rechargez l’administration.')
    if (!isUuid(savedId)) return fail('Ce modèle n’existe plus. Rechargez la page.')

    const [saved] = await db
      .select()
      .from(savedSections)
      .where(eq(savedSections.id, savedId))
      .limit(1)

    if (!saved) return fail('Ce modèle n’existe plus. Rechargez la page.')

    const block = getBlock(saved.type)
    if (!block) return fail('Ce modèle de section n’est plus disponible.')

    /* Le payload repasse par le schéma du type : un modèle enregistré
       avant une évolution du template reste insérable proprement. */
    const payload = block.schema.safeParse(saved.payload)
    if (!payload.success) return fail('Ce modèle a été créé avec une ancienne version du site et ne peut plus être ajouté.')

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

    if (!created) return fail('L’ajout de la section n’a pas abouti. Réessayez.')

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

    if (!isUuid(pageId)) return fail('La page n’a pas été trouvée. Rechargez l’administration.')

    /* Sans ce contrôle, un identifiant arbitraire renvoyait `ok` sans
       rien écrire — l'éditeur affichait « Publié » à tort. */
    const [page] = await db
      .select({ slug: pages.slug })
      .from(pages)
      .where(eq(pages.id, pageId))
      .limit(1)
    if (!page) return fail('La page n’a pas été trouvée. Rechargez l’administration.')

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

    revalidatePage(page.slug)
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
  /* Absent des instantanés pris avant l'arrivée des réglages de section :
     optionnel, et revalidé ligne par ligne ci-dessous. */
  settings: z.unknown().nullable().optional(),
})

type ValidatedSnapshotRow = Omit<
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
function validateSnapshotRows(
  input: unknown,
):
  | { ok: true; rows: ValidatedSnapshotRow[]; pageId: string | null }
  | { ok: false; error: string } {
  const parsed = z.array(snapshotRowSchema).max(500).safeParse(input)
  if (!parsed.success) return { ok: false, error: 'La version en ligne de la page est illisible. Contactez la personne qui gère le site.' }
  const rows = parsed.data

  const pageId = rows[0]?.pageId ?? null
  if (pageId !== null && rows.some((row) => row.pageId !== pageId)) {
    return { ok: false, error: 'La version en ligne de la page est illisible. Contactez la personne qui gère le site.' }
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
      if (!parsedStyles.success) return { ok: false, error: 'Ces réglages d’apparence ne sont pas acceptés.' }
      styles = parsedStyles.data
    }

    let placement: GridPosition | null = null
    if (row.placement !== null) {
      /* Accepte le format en cellules ET l'ancien format en pourcentages
         (converti) : un instantané pris avant la migration reste
         restaurable. */
      placement = parseGridPosition(row.placement)
      if (!placement) return { ok: false, error: 'Impossible de placer la section à cet endroit. Réessayez.' }
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

/** Insère des lignes validées, parents d'abord (clé étrangère
    auto-référente : un enfant ne peut précéder son parent). */
async function insertSnapshotRows(rows: ValidatedSnapshotRow[]) {
  const ids = new Set(rows.map((row) => row.id))
  const roots = rows.filter((row) => !row.parentId || !ids.has(row.parentId))
  const children = rows.filter(
    (row) => row.parentId && ids.has(row.parentId),
  )
  if (roots.length > 0) await db.insert(sections).values(roots)
  if (children.length > 0) await db.insert(sections).values(children)
}

/**
 * Restaure un sous-arbre supprimé — le ⌘Z d'une suppression.
 *
 * Les lignes sont réinsérées avec leurs identifiants D'ORIGINE : les autres
 * entrées d'historique qui les référencent restent valides.
 */
export async function restoreSections(
  input: unknown,
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

    const validated = validateSnapshotRows(input)
    if (!validated.ok) return fail(validated.error)
    if (validated.rows.length === 0 || !validated.pageId) {
      return fail('Rien à publier : la page ne contient aucune section.')
    }

    await insertSnapshotRows(validated.rows)

    revalidatePage(await slugOf(validated.pageId))
    return ok()
  })
}

/**
 * Abandonne le brouillon : les sections vivantes de la page sont remplacées
 * par celles de la version en ligne (`published_snapshot`).
 *
 * Refusé si la page n'a jamais été publiée — il n'y aurait rien vers quoi
 * revenir. Les sections restaurées gardent leurs identifiants publiés ;
 * l'historique ⌘Z de l'éditeur est vidé côté client, puisqu'il pointait
 * vers un état qui n'existe plus. Les lignes réinsérées sont relues en
 * base et renvoyées telles quelles : l'éditeur remplace son état local
 * sans attendre un rechargement.
 */
export async function discardDraft(
  pageId: string,
): Promise<ActionResult<{ sections: Section[] }>> {
  return guard(async () => {
    await requireAdmin()

    const [page] = await db
      .select({
        slug: pages.slug,
        publishedAt: pages.publishedAt,
        publishedSnapshot: pages.publishedSnapshot,
      })
      .from(pages)
      .where(eq(pages.id, pageId))
      .limit(1)

    if (!page) return fail('La page n’a pas été trouvée. Rechargez l’administration.')
    if (!page.publishedAt || !Array.isArray(page.publishedSnapshot)) {
      return fail('Cette page n’a jamais été publiée : rien vers quoi revenir.')
    }

    const validated = validateSnapshotRows(page.publishedSnapshot)
    if (!validated.ok) return fail(validated.error)
    if (validated.pageId !== null && validated.pageId !== pageId) {
      return fail('La version en ligne ne correspond pas à cette page. Rechargez l’administration.')
    }

    /* Validation faite AVANT toute écriture : si l'instantané est
       inexploitable, le brouillon reste intact. */
    await db.delete(sections).where(eq(sections.pageId, pageId))
    await insertSnapshotRows(validated.rows)

    const restored = await db
      .select()
      .from(sections)
      .where(eq(sections.pageId, pageId))
      .orderBy(asc(sections.sortOrder), asc(sections.createdAt))

    revalidatePage(page.slug)
    return ok({ sections: restored })
  })
}

/** Réordonnancement en une seule requête, plutôt qu'un UPDATE par section. */
export async function reorderSections(
  pageId: string,
  orderedIds: string[],
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

    if (!isUuid(pageId)) return fail('La page n’a pas été trouvée. Rechargez l’administration.')
    if (orderedIds.length === 0) return ok()
    if (!orderedIds.every(isUuid)) return fail('Cette section n’existe plus — elle a peut-être été supprimée. Rechargez la page.')

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

    if (!isUuid(pageId)) return fail('La page n’a pas été trouvée. Rechargez l’administration.')

    const parsed = seoFormSchema.safeParse(input)
    if (!parsed.success) {
      return refusDeFormulaire(parsed.error)
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

    /* UNE seule source : les réglages « par défaut » du site (titre,
       description, image de partage) suivent ce qui vient d'être saisi.
       Avant, deux écrans proposaient « Titre pour Google » pour une seule
       page, et l'un pouvait contredire l'autre. */
    await db
      .update(settings)
      .set({
        defaultSeoTitle: values.title ?? null,
        defaultSeoDescription: values.description ?? null,
        defaultOgMediaId: values.ogMediaId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(settings.id, 'singleton'))
    revalidateTag(tags.settings)

    revalidatePage(await slugOf(pageId))
    return ok()
  })
}
