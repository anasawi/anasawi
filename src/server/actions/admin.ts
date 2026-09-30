import { guard, type ActionResult } from './types'
import { requireAdmin, type AdminUser } from '@/lib/auth'

/*
 * Séparé de `types.ts` à dessein : ce module tire l'authentification (donc
 * bcrypt et le driver de base), alors que `types.ts` est importé par des
 * composants clients pour `ActionResult` et `fail`.
 */

/**
 * `guard` + `requireAdmin` — le préambule de toute action d'écriture de
 * l'administration. La personne connectée (relue en base) est passée à
 * l'action, pour celles qui en ont besoin (« c'est moi ? », « suis-je
 * propriétaire ? »).
 */
export function adminAction<T>(
  fn: (user: AdminUser) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  return guard(async () => fn(await requireAdmin()))
}
