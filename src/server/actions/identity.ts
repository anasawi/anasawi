'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath, revalidateTag } from 'next/cache'

import { adminAction } from './admin'
import { MESSAGES } from './messages'
import { fail, ok, type ActionResult } from './types'
import { identitySchema, parseIdentity } from '@/lib/identity'
import { db } from '@/server/db'
import { settings } from '@/server/db/schema'
import { tags } from '@/server/queries'

/** Écrit l'identité globale du site (settings.identity). */
export async function updateIdentity(
  input: unknown,
): Promise<ActionResult<void>> {
  return adminAction(async () => {
    const parsed = identitySchema.safeParse(input)
    if (!parsed.success) return fail(MESSAGES.champsACorriger)

    /* Fusion : l'onglet du site classique n'efface pas le style du site
       moderne, et inversement. */
    const [actuel] = await db.select({ identity: settings.identity }).from(settings).where(eq(settings.id, 'singleton')).limit(1)
    const precedente = parseIdentity(actuel?.identity)
    const identity = { ...precedente, ...parsed.data }

    await db
      .update(settings)
      .set({ identity, updatedAt: new Date() })
      .where(eq(settings.id, 'singleton'))

    revalidateTag(tags.settings)
    revalidateTag(tags.pages)
    revalidatePath('/', 'layout')
    return ok()
  })
}
