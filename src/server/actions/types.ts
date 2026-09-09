/**
 * Résultat uniforme des Server Actions.
 * Les composants clients n'ont ainsi qu'une seule forme à gérer, et une
 * erreur de validation Zod remonte au bon champ.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

export function ok(): ActionResult<void>
export function ok<T>(data: T): ActionResult<T>
export function ok<T>(data?: T): ActionResult<T | void> {
  return { ok: true, data: data as T }
}

export function fail(
  error: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { ok: false, error, ...(fieldErrors ? { fieldErrors } : {}) }
}

/**
 * Emballe une action : garantit qu'aucune exception ne fuit vers le client
 * sous forme d'erreur non gérée, et qu'aucun message d'erreur brut de la base
 * n'est renvoyé au navigateur.
 */
export async function guard<T>(
  fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    return await fn()
  } catch (error) {
    console.error('[action]', error)
    const message =
      error instanceof Error && error.message === 'Non autorisé.'
        ? 'Session expirée. Reconnectez-vous.'
        : 'Une erreur est survenue. Réessayez.'
    return fail(message)
  }
}
