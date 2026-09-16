'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'

import { fail, guard, ok, type ActionResult } from './types'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/server/db'
import { settings } from '@/server/db/schema'
import { tags } from '@/server/queries'

/**
 * Menu du site — écrit dans `settings.navigation`.
 *
 * Chaque entrée pointe vers une ancre nue (`contact`), un chemin interne
 * (`/approche`, `/#contact`) ou une URL https. Rien d'autre n'est
 * inscriptible — pas de javascript:, pas de data:.
 */
const navItemSchema = z.object({
  label: z.string().trim().min(1, 'Libellé requis.').max(40),
  href: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(
      /^(\/[a-z0-9\-/#]*|#?[a-z0-9-]+|https:\/\/\S+)$/i,
      'Lien invalide — ancre, chemin interne ou URL https.',
    ),
})

export async function updateNavigation(
  input: unknown,
): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()

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
      return fail('Menu invalide.', fieldErrors)
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
