'use server'

import { eq } from 'drizzle-orm'

import { adminAction } from './admin'
import { MESSAGES } from './messages'
import {
  revalidatePage,
  shiftSiblingsFrom,
  siblingScope,
  slugOf,
} from './page-helpers'
import { fail, isUuid, ok, type ActionResult } from './types'
import { getBlock } from '@/blocks/registry'
import { db } from '@/server/db'
import { savedSections, sections, type SavedSection } from '@/server/db/schema'

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
  return adminAction(async () => {
    if (!isUuid(sectionId)) return fail(MESSAGES.sectionIntrouvable)
    if (typeof name !== 'string') return fail(MESSAGES.nomDeModeleRequis)

    const trimmed = name.trim().slice(0, 80)
    if (!trimmed) return fail(MESSAGES.nomDeModeleRequis)

    const [section] = await db
      .select()
      .from(sections)
      .where(eq(sections.id, sectionId))
      .limit(1)

    if (!section) return fail(MESSAGES.sectionIntrouvable)
    if (section.parentId) return fail(MESSAGES.seuleSectionEntiere)
    if (!getBlock(section.type)) return fail(MESSAGES.blocIndisponible)

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

    if (!created) return fail(MESSAGES.enregistrementEchoue)
    /* La ligne complète est renvoyée : l'éditeur l'ajoute à « Mes
       sections » sans recharger la page. */
    return ok(created)
  })
}

export async function deleteSavedSection(
  id: string,
): Promise<ActionResult<void>> {
  return adminAction(async () => {
    if (!isUuid(id)) return fail(MESSAGES.modeleIntrouvable)
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
  return adminAction(async () => {
    if (!isUuid(pageId)) return fail(MESSAGES.pageIntrouvable)
    if (!isUuid(savedId)) return fail(MESSAGES.modeleIntrouvable)
    if (!Number.isInteger(position) || position < 0 || position > 10000) {
      return fail(MESSAGES.placementImpossible)
    }

    const [saved] = await db
      .select()
      .from(savedSections)
      .where(eq(savedSections.id, savedId))
      .limit(1)

    if (!saved) return fail(MESSAGES.modeleIntrouvable)

    const block = getBlock(saved.type)
    if (!block) return fail(MESSAGES.blocIndisponible)

    /* Le payload repasse par le schéma du type : un modèle enregistré
       avant une évolution du template reste insérable proprement. */
    const payload = block.schema.safeParse(saved.payload)
    if (!payload.success) return fail(MESSAGES.modeleAncienneVersion)

    /* Décalage des frères et insertion dans le même lot : pas de trou
       dans les rangs si l'insertion échoue. */
    const scope = siblingScope({ pageId, parentId: null, columnIndex: 0 })
    const [, created] = await db.batch([
      shiftSiblingsFrom(scope, position),
      db
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
        .returning({ id: sections.id }),
    ])

    if (!created[0]) return fail(MESSAGES.ajoutSectionEchoue)

    revalidatePage(await slugOf(pageId))
    return ok({ id: created[0].id })
  })
}
