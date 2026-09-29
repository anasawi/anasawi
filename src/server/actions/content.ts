'use server'

import { eq, max, sql } from 'drizzle-orm'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'

import { fail, guard, ok, type ActionResult } from './types'
import { requireAdmin } from '@/lib/auth'
import {
  faqFormSchema,
  mediaFormSchema,
  serviceFormSchema,
  settingsFormSchema,
} from '@/lib/schemas'
import { db } from '@/server/db'
import {
  contactMessages,
  faqItems,
  media,
  serviceGroups,
  services,
  settings,
} from '@/server/db/schema'
import { tags } from '@/server/queries'

function refreshSite(tag: string) {
  revalidateTag(tag)
  revalidatePath('/', 'layout')
}

/** Garde contre un identifiant fabriqué : Postgres refuserait en 500. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUuid = (value: string) => UUID.test(value)

/* ════════════════════════════════════════════════════════════════════
   Accompagnements
   ════════════════════════════════════════════════════════════════════ */

export async function createService(
  input: z.input<typeof serviceFormSchema>,
): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireAdmin()

    const parsed = serviceFormSchema.safeParse(input)
    if (!parsed.success) {
      return fail('Formulaire invalide.', parsed.error.flatten().fieldErrors)
    }

    const [existing] = await db
      .select({ id: services.id })
      .from(services)
      .where(eq(services.slug, parsed.data.slug))
      .limit(1)
    if (existing) return fail('Ce slug est déjà utilisé.')

    const [{ value: currentMax } = { value: null }] = await db
      .select({ value: max(services.sortOrder) })
      .from(services)

    const [created] = await db
      .insert(services)
      .values({ ...parsed.data, sortOrder: (currentMax ?? -1) + 1 })
      .returning({ id: services.id })

    if (!created) return fail('Création impossible.')

    refreshSite(tags.services)
    return ok({ id: created.id })
  })
}

export async function updateService(
  id: string,
  input: z.input<typeof serviceFormSchema>,
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

    const parsed = serviceFormSchema.safeParse(input)
    if (!parsed.success) {
      return fail('Formulaire invalide.', parsed.error.flatten().fieldErrors)
    }

    /* Même contrôle qu'à la création : sans lui, l'index unique renvoyait
       une erreur générique au lieu d'un message lisible. */
    const [existing] = await db
      .select({ id: services.id })
      .from(services)
      .where(eq(services.slug, parsed.data.slug))
      .limit(1)
    if (existing && existing.id !== id) {
      return fail('Ce slug est déjà utilisé.')
    }

    await db
      .update(services)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(services.id, id))

    refreshSite(tags.services)
    return ok()
  })
}

export async function deleteService(id: string): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()
    await db.delete(services).where(eq(services.id, id))
    refreshSite(tags.services)
    return ok()
  })
}

export async function toggleService(
  id: string,
  isActive: boolean,
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()
    await db
      .update(services)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(services.id, id))
    refreshSite(tags.services)
    return ok()
  })
}

export async function reorderServices(
  orderedIds: string[],
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()
    if (orderedIds.length === 0) return ok()

    const cases = orderedIds
      .map((id, index) => sql`when ${services.id} = ${id} then ${index}`)
      .reduce((acc, part) => sql`${acc} ${part}`)

    await db
      .update(services)
      .set({ sortOrder: sql`case ${cases} else ${services.sortOrder} end` })

    refreshSite(tags.services)
    return ok()
  })
}

/* ════════════════════════════════════════════════════════════════════
   Familles d'accompagnements
   ════════════════════════════════════════════════════════════════════ */

const groupLabelSchema = z
  .string()
  .trim()
  .min(1, 'Le titre est requis.')
  .max(120)

export async function createServiceGroup(
  label: string,
): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireAdmin()

    const parsed = groupLabelSchema.safeParse(label)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Titre invalide.')

    /* La nouvelle famille se pose en fin de liste : on ne déplace jamais
       l'existant sans qu'on l'ait demandé. */
    const [{ value: currentMax } = { value: null }] = await db
      .select({ value: max(serviceGroups.sortOrder) })
      .from(serviceGroups)

    const [created] = await db
      .insert(serviceGroups)
      .values({ label: parsed.data, sortOrder: (currentMax ?? -1) + 1 })
      .returning({ id: serviceGroups.id })

    if (!created) return fail('Création impossible.')

    refreshSite(tags.services)
    return ok(created)
  })
}

export async function renameServiceGroup(
  id: string,
  label: string,
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()
    if (!isUuid(id)) return fail('Famille introuvable.')

    const parsed = groupLabelSchema.safeParse(label)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Titre invalide.')

    const [updated] = await db
      .update(serviceGroups)
      .set({ label: parsed.data })
      .where(eq(serviceGroups.id, id))
      .returning({ id: serviceGroups.id })

    if (!updated) return fail('Famille introuvable.')

    refreshSite(tags.services)
    return ok()
  })
}

/**
 * Supprime une famille — jamais ses accompagnements.
 *
 * La clé étrangère est en `set null` : les accompagnements qu'elle coiffait
 * se retrouvent simplement sans famille, à leur place. Retirer un titre ne
 * doit pas faire disparaître du contenu.
 */
export async function deleteServiceGroup(
  id: string,
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()
    if (!isUuid(id)) return fail('Famille introuvable.')

    await db.delete(serviceGroups).where(eq(serviceGroups.id, id))

    refreshSite(tags.services)
    return ok()
  })
}

export async function reorderServiceGroups(
  orderedIds: string[],
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()
    if (orderedIds.length === 0) return ok()
    if (!orderedIds.every(isUuid)) return fail('Famille introuvable.')

    const cases = orderedIds
      .map((id, index) => sql`when ${serviceGroups.id} = ${id} then ${index}`)
      .reduce((acc, part) => sql`${acc} ${part}`)

    await db
      .update(serviceGroups)
      .set({ sortOrder: sql`case ${cases} else ${serviceGroups.sortOrder} end` })

    refreshSite(tags.services)
    return ok()
  })
}

/**
 * Enregistre le plan complet après un glisser-déposer.
 *
 * On écrit l'ensemble plutôt que le seul élément déplacé : l'appelant connaît
 * l'état final voulu, et une écriture globale ne peut pas laisser deux
 * accompagnements au même rang dans la même famille.
 */
export async function arrangeServices(
  plan: { groupId: string | null; serviceIds: string[] }[],
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

    for (const [groupIndex, bloc] of plan.entries()) {
      if (bloc.groupId !== null && !isUuid(bloc.groupId)) {
        return fail('Famille introuvable.')
      }
      if (!bloc.serviceIds.every(isUuid)) return fail('Accompagnement introuvable.')

      for (const [index, serviceId] of bloc.serviceIds.entries()) {
        await db
          .update(services)
          .set({
            groupId: bloc.groupId,
            /* Le rang reste global : il départage aussi les accompagnements
               sans famille, qui ferment la liste. */
            sortOrder: groupIndex * 1000 + index,
          })
          .where(eq(services.id, serviceId))
      }
    }

    refreshSite(tags.services)
    return ok()
  })
}

/* ════════════════════════════════════════════════════════════════════
   FAQ
   ════════════════════════════════════════════════════════════════════ */

export async function createFaq(
  input: z.input<typeof faqFormSchema>,
): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireAdmin()

    const parsed = faqFormSchema.safeParse(input)
    if (!parsed.success) {
      return fail('Formulaire invalide.', parsed.error.flatten().fieldErrors)
    }

    const [{ value: currentMax } = { value: null }] = await db
      .select({ value: max(faqItems.sortOrder) })
      .from(faqItems)

    const [created] = await db
      .insert(faqItems)
      .values({ ...parsed.data, sortOrder: (currentMax ?? -1) + 1 })
      .returning({ id: faqItems.id })

    if (!created) return fail('Création impossible.')

    refreshSite(tags.faq)
    return ok({ id: created.id })
  })
}

export async function updateFaq(
  id: string,
  input: z.input<typeof faqFormSchema>,
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

    const parsed = faqFormSchema.safeParse(input)
    if (!parsed.success) {
      return fail('Formulaire invalide.', parsed.error.flatten().fieldErrors)
    }

    await db
      .update(faqItems)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(faqItems.id, id))

    refreshSite(tags.faq)
    return ok()
  })
}

export async function deleteFaq(id: string): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()
    await db.delete(faqItems).where(eq(faqItems.id, id))
    refreshSite(tags.faq)
    return ok()
  })
}

export async function toggleFaq(
  id: string,
  isActive: boolean,
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()
    await db
      .update(faqItems)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(faqItems.id, id))
    refreshSite(tags.faq)
    return ok()
  })
}

export async function reorderFaq(
  orderedIds: string[],
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()
    if (orderedIds.length === 0) return ok()

    const cases = orderedIds
      .map((id, index) => sql`when ${faqItems.id} = ${id} then ${index}`)
      .reduce((acc, part) => sql`${acc} ${part}`)

    await db
      .update(faqItems)
      .set({ sortOrder: sql`case ${cases} else ${faqItems.sortOrder} end` })

    refreshSite(tags.faq)
    return ok()
  })
}

/* ════════════════════════════════════════════════════════════════════
   Médias
   ════════════════════════════════════════════════════════════════════ */

export async function updateMedia(
  id: string,
  input: z.input<typeof mediaFormSchema>,
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

    const parsed = mediaFormSchema.safeParse(input)
    if (!parsed.success) {
      return fail('Formulaire invalide.', parsed.error.flatten().fieldErrors)
    }

    await db
      .update(media)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(media.id, id))

    revalidateTag(tags.media)
    revalidatePath('/', 'layout')
    return ok()
  })
}

/* ════════════════════════════════════════════════════════════════════
   Réglages
   ════════════════════════════════════════════════════════════════════ */

export async function updateSettings(
  input: z.input<typeof settingsFormSchema>,
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

    const parsed = settingsFormSchema.safeParse(input)
    if (!parsed.success) {
      return fail('Formulaire invalide.', parsed.error.flatten().fieldErrors)
    }

    const values = {
      ...parsed.data,
      contactEmail: parsed.data.contactEmail || null,
      bookingUrl: parsed.data.bookingUrl || null,
      updatedAt: new Date(),
    }
    /* Un champ absent n'écrase rien (référencement, réglé ailleurs). */
    for (const cle of Object.keys(values) as (keyof typeof values)[]) {
      if (values[cle] === undefined) delete values[cle]
    }

    await db
      .insert(settings)
      .values({ id: 'singleton', ...values })
      .onConflictDoUpdate({ target: settings.id, set: values })

    refreshSite(tags.settings)
    return ok()
  })
}

/* ════════════════════════════════════════════════════════════════════
   Messages
   ════════════════════════════════════════════════════════════════════ */

export async function markMessageRead(
  id: string,
  isRead: boolean,
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()
    await db
      .update(contactMessages)
      .set({ isRead })
      .where(eq(contactMessages.id, id))
    revalidatePath('/admin/messages')
    return ok()
  })
}

export async function deleteMessage(id: string): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()
    await db.delete(contactMessages).where(eq(contactMessages.id, id))
    revalidatePath('/admin/messages')
    return ok()
  })
}
