'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath, revalidateTag } from 'next/cache'

import { fail, guard, ok, type ActionResult } from './types'
import { identitySchema } from '@/lib/identity'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/server/db'
import { settings } from '@/server/db/schema'
import { tags } from '@/server/queries'

/** Écrit l'identité globale du site (settings.identity). */
export async function updateIdentity(
  input: unknown,
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

    const parsed = identitySchema.safeParse(input)
    if (!parsed.success) return fail('Réglages invalides.')

    await db
      .update(settings)
      .set({ identity: parsed.data, updatedAt: new Date() })
      .where(eq(settings.id, 'singleton'))

    revalidateTag(tags.settings)
    revalidateTag(tags.pages)
    revalidatePath('/', 'layout')
    return ok()
  })
}
