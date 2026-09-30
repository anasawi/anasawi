'use server'

import { eq } from 'drizzle-orm'
import { revalidateTag } from 'next/cache'
import type { z } from 'zod'

import { adminAction } from './admin'
import { MESSAGES } from './messages'
import { revalidatePage, slugOf } from './page-helpers'
import { fail, formError, isUuid, ok, type ActionResult } from './types'
import { seoFormSchema } from '@/lib/schemas'
import { db } from '@/server/db'
import { pages, seoMeta, settings } from '@/server/db/schema'
import { tags } from '@/server/queries'

/* ════════════════════════════════════════════════════════════════════
   SEO
   ════════════════════════════════════════════════════════════════════ */

export async function updateSeo(
  pageId: string,
  input: z.input<typeof seoFormSchema>,
): Promise<ActionResult<void>> {
  return adminAction(async () => {
    if (!isUuid(pageId)) return fail(MESSAGES.pageIntrouvable)

    const parsed = seoFormSchema.safeParse(input)
    if (!parsed.success) return formError(parsed.error)

    /* La page doit exister : sans ce contrôle, l'upsert échouait sur la
       clé étrangère en message générique. */
    const [page] = await db
      .select({ slug: pages.slug })
      .from(pages)
      .where(eq(pages.id, pageId))
      .limit(1)
    if (!page) return fail(MESSAGES.pageIntrouvable)

    const values = {
      ...parsed.data,
      canonical: parsed.data.canonical || null,
      updatedAt: new Date(),
    }

    /* Les deux écritures dans un même lot : les métadonnées de la page et
       les réglages « par défaut » du site (titre, description, image de
       partage) suivent ce qui vient d'être saisi — UNE seule source. Avant,
       deux écrans proposaient « Titre pour Google » pour une seule page, et
       l'un pouvait contredire l'autre ; et une panne entre les deux
       requêtes les faisait diverger. */
    await db.batch([
      db
        .insert(seoMeta)
        .values({ pageId, ...values })
        .onConflictDoUpdate({ target: seoMeta.pageId, set: values }),
      db
        .update(settings)
        .set({
          defaultSeoTitle: values.title ?? null,
          defaultSeoDescription: values.description ?? null,
          defaultOgMediaId: values.ogMediaId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(settings.id, 'singleton')),
    ])
    revalidateTag(tags.settings)

    revalidatePage(await slugOf(pageId))
    return ok()
  })
}
