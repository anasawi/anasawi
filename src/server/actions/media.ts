'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'

import { adminAction } from './admin'
import { MESSAGES } from './messages'
import { describeError, fail, formError, isUuid, ok, type ActionResult } from './types'
import { ALLOWED_MIME_TYPES } from '@/lib/media-kind'
import { mediaFormSchema } from '@/lib/schemas'
import { publicUrlForKey, removeObject } from '@/lib/storage'
import { db } from '@/server/db'
import { media, type Media } from '@/server/db/schema'
import { tags } from '@/server/queries'

/**
 * Une clé telle que `buildObjectKey` la produit : préfixe lisible, douze
 * caractères hexadécimaux, extension connue. Rien d'autre n'est
 * enregistrable — la ligne en base ne peut pointer que vers un objet que
 * la route d'envoi a pu écrire.
 */
const OBJECT_KEY_PATTERN = /^[a-z0-9-]+-[a-f0-9]{12}\.(jpg|png|webp|avif|mp4|webm)$/

const registerSchema = z
  .object({
    url: z.string().min(1).max(300),
    pathname: z.string().regex(OBJECT_KEY_PATTERN, 'Clé de média invalide.'),
    filename: z.string().min(1).max(255),
    alt: z
      .string()
      .trim()
      .min(1, 'Le texte alternatif est obligatoire.')
      .max(300),
    width: z.number().int().nonnegative().max(20000),
    height: z.number().int().nonnegative().max(20000),
    /* La miniature floue est une image en data-URL, générée par le
       navigateur : quelques centaines d'octets. Bornée, et d'un type
       image — un `data:text/html` inséré dans un `src` serait rendu. */
    blurDataUrl: z
      .string()
      .max(4096)
      .regex(/^data:image\//, 'Miniature invalide.')
      .nullable(),
    mimeType: z.enum(ALLOWED_MIME_TYPES),
    size: z.number().int().nonnegative(),
  })
  /* L'URL est DÉDUITE de la clé, jamais libre : le client ne peut pas
     enregistrer une ligne qui pointe ailleurs que vers `/api/media/…`. */
  .refine((value) => value.url === publicUrlForKey(value.pathname), {
    path: ['url'],
    message: 'URL de média invalide.',
  })

/** Ce que le client envoie : le type MIME y est une chaîne libre (celle
    du fichier), c'est le schéma qui la restreint aux types acceptés. */
export type RegisterMediaInput = Omit<z.input<typeof registerSchema>, 'mimeType'> & {
  mimeType: string
}

/**
 * Enregistre en base un fichier déjà déposé sur le stockage.
 *
 * Le texte alternatif est requis au niveau du schéma : le CMS ne peut pas
 * créer un média sans alt. C'est une contrainte d'accessibilité et de SEO
 * qu'il vaut mieux imposer à l'entrée que rattraper plus tard.
 */
export async function registerMedia(
  input: RegisterMediaInput,
): Promise<ActionResult<Media>> {
  return adminAction(async () => {
    const parsed = registerSchema.safeParse(input)
    if (!parsed.success) return formError(parsed.error, MESSAGES.champsACorriger)

    const [created] = await db.insert(media).values(parsed.data).returning()
    if (!created) return fail(MESSAGES.enregistrementEchoue)

    revalidateTag(tags.media)
    revalidatePath('/admin/medias')
    return ok(created)
  })
}

export async function updateMedia(
  id: string,
  input: z.input<typeof mediaFormSchema>,
): Promise<ActionResult<void>> {
  return adminAction(async () => {
    if (!isUuid(id)) return fail(MESSAGES.imageIntrouvable)

    const parsed = mediaFormSchema.safeParse(input)
    if (!parsed.success) return formError(parsed.error, MESSAGES.champsACorriger)

    const [updated] = await db
      .update(media)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(media.id, id))
      .returning({ id: media.id })
    if (!updated) return fail(MESSAGES.imageIntrouvable)

    revalidateTag(tags.media)
    revalidatePath('/', 'layout')
    return ok()
  })
}

export async function deleteMedia(id: string): Promise<ActionResult<void>> {
  return adminAction(async () => {
    if (!isUuid(id)) return fail(MESSAGES.imageIntrouvable)

    const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1)
    if (!row) return fail(MESSAGES.imageIntrouvable)

    /* On supprime d'abord la ligne : si l'effacement du fichier échoue, on
       préfère un objet orphelin sur le stockage à une image cassée. */
    await db.delete(media).where(eq(media.id, id))

    /* Les médias hérités de l'ancien stockage ont une URL absolue : leur
       `pathname` ne désigne rien ici, on laisse simplement le fichier. */
    if (row.url.startsWith('/')) {
      try {
        await removeObject(row.pathname)
      } catch (error) {
        console.error('[media] suppression du fichier impossible', describeError(error))
      }
    }

    revalidateTag(tags.media)
    revalidatePath('/admin/medias')
    revalidatePath('/', 'layout')
    return ok()
  })
}
