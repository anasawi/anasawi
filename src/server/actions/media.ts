'use server'

import { del } from '@vercel/blob'
import { eq } from 'drizzle-orm'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'

import { fail, guard, ok, type ActionResult } from './types'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/server/db'
import { media, type Media } from '@/server/db/schema'
import { tags } from '@/server/queries'

const registerSchema = z.object({
  url: z.string().url(),
  pathname: z.string().min(1),
  filename: z.string().min(1).max(255),
  alt: z
    .string()
    .trim()
    .min(1, 'Le texte alternatif est obligatoire.')
    .max(300),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  blurDataUrl: z.string().nullable(),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
})

/**
 * Enregistre en base un fichier déjà déposé sur Vercel Blob.
 *
 * Le texte alternatif est requis au niveau du schéma : le CMS ne peut pas
 * créer un média sans alt. C'est une contrainte d'accessibilité et de SEO
 * qu'il vaut mieux imposer à l'entrée que rattraper plus tard.
 */
export async function registerMedia(
  input: z.input<typeof registerSchema>,
): Promise<ActionResult<Media>> {
  return guard(async () => {
    await requireAdmin()

    const parsed = registerSchema.safeParse(input)
    if (!parsed.success) {
      return fail('Métadonnées invalides.', parsed.error.flatten().fieldErrors)
    }

    const [created] = await db.insert(media).values(parsed.data).returning()
    if (!created) return fail('Enregistrement impossible.')

    revalidateTag(tags.media)
    revalidatePath('/admin/medias')
    return ok(created)
  })
}

export async function deleteMedia(id: string): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

    const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1)
    if (!row) return fail('Média introuvable.')

    /* On supprime d'abord la ligne : si l'appel Blob échoue, on préfère un
       fichier orphelin sur le stockage à une image cassée sur le site. */
    await db.delete(media).where(eq(media.id, id))

    try {
      await del(row.url)
    } catch (error) {
      console.error('[media] suppression Blob impossible', error)
    }

    revalidateTag(tags.media)
    revalidatePath('/admin/medias')
    revalidatePath('/', 'layout')
    return ok()
  })
}
