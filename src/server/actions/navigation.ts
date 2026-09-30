'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'

import { adminAction } from './admin'
import { MESSAGES } from './messages'
import { fail, ok, type ActionResult } from './types'
import { safeHrefSchema } from '@/lib/links'
import { db } from '@/server/db'
import { settings } from '@/server/db/schema'
import { tags } from '@/server/queries'

/**
 * Menu du site — écrit dans `settings.navigation`.
 *
 * Chaque entrée pointe vers une ancre nue (`contact`, l'ancien format),
 * une ancre (`#contact`), un chemin interne (`/approche`, `/#contact`),
 * une URL http(s), un `mailto:` ou un `tel:` — la liste fermée de
 * `safeHrefSchema` (`lib/links.ts`). Rien d'autre n'est inscriptible —
 * pas de javascript:, pas de data:.
 */
const navItemSchema = z.object({
  label: z.string().trim().min(1, 'Libellé requis.').max(40),
  href: z.union([
    /* L'ancre nue, sans dièse : le format historique du menu, que le
       Header sait encore lire. */
    z.string().trim().regex(/^[a-z0-9-]+$/i),
    safeHrefSchema.pipe(z.string().max(200, 'Ce lien est trop long.')),
  ], { errorMap: () => ({ message: 'Lien invalide — ancre, chemin interne, adresse web, e-mail ou téléphone.' }) }),
})

export async function updateNavigation(
  input: unknown,
): Promise<ActionResult<void>> {
  return adminAction(async () => {
    const parsed = z.array(navItemSchema).max(12).safeParse(input)
    if (!parsed.success) {
      /* Erreurs par champ, clés `<index>.<champ>` (« 2.href ») : l'éditeur
         les affiche sous l'entrée concernée. `flatten()` ne garderait que
         l'index. Une erreur sur le tableau lui-même (trop d'entrées) va
         sous la clé `_`. */
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path.length > 0 ? issue.path.join('.') : '_'
        ;(fieldErrors[key] ??= []).push(issue.message)
      }
      return fail(MESSAGES.liensMenuACorriger, fieldErrors)
    }

    await db
      .update(settings)
      .set({ navigation: parsed.data, updatedAt: new Date() })
      .where(eq(settings.id, 'singleton'))

    revalidateTag(tags.settings)
    revalidateTag(tags.pages)
    revalidatePath('/', 'layout')
    return ok()
  })
}
