import { z } from 'zod'

import { MESSAGES } from './messages'

/*
 * Ce module est importé par des composants CLIENTS (`ActionResult`, `fail`) :
 * il ne doit tirer ni la base, ni l'authentification. Ce qui a besoin d'une
 * session vit dans `./admin.ts`.
 */

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
 * Refus de formulaire, avec LA raison.
 *
 * « Formulaire invalide. » sur plusieurs champs ne dit pas quoi corriger.
 * Le schéma porte déjà des messages écrits pour être lus — « La
 * description dépasse 160 caractères. » — et ils se perdaient en route. On
 * remonte le premier, en gardant le détail par champ pour l'affichage sous
 * les libellés. `message` permet de garder le message générique attendu
 * par certains écrans (« Certains champs sont à corriger. »).
 */
export function formError(
  error: z.ZodError,
  message: string = error.issues[0]?.message || MESSAGES.champsACorriger,
): ActionResult<never> {
  const byField: Record<string, string[]> = {}
  for (const [field, messages] of Object.entries(error.flatten().fieldErrors)) {
    if (messages) byField[field] = messages
  }
  return fail(message, byField)
}

/**
 * Les identifiants viennent du client. Un uuid mal formé provoquerait une
 * erreur Postgres (`invalid input syntax for type uuid`) attrapée par
 * `guard` en message générique ; on préfère refuser proprement en amont,
 * avant toute écriture.
 */
export const uuidSchema = z.string().uuid()

/** Une liste d'identifiants à réordonner : bornée, pour qu'un client ne
    fabrique pas une requête `CASE` de plusieurs mégaoctets. */
export const uuidListSchema = z.array(uuidSchema).max(500)

export const isUuid = (value: unknown): value is string =>
  uuidSchema.safeParse(value).success

/**
 * Levée par `requireAdmin()` quand aucune session valable n'existe.
 *
 * Une classe, et non une chaîne comparée : `guard()` la reconnaît par
 * `instanceof`, ce qui ne dépend d'aucun texte.
 */
export class UnauthorizedError extends Error {
  constructor(message = 'Non autorisé.') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

/** Levée quand la session est valable mais le rôle insuffisant. */
export class ForbiddenError extends Error {
  constructor(message = 'Droits insuffisants.') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

/**
 * Emballe une action : garantit qu'aucune exception ne fuit vers le client
 * sous forme d'erreur non gérée, et qu'aucun message d'erreur brut de la base
 * n'est renvoyé au navigateur.
 *
 * Le journal ne porte que le nom, le code et le message de l'erreur — pas
 * l'objet entier : une erreur Postgres embarque la requête et ses
 * paramètres, donc potentiellement des données personnelles.
 */
export async function guard<T>(
  fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return fail(MESSAGES.sessionExpiree)
    }
    if (error instanceof ForbiddenError) {
      return fail(MESSAGES.droitsInsuffisants)
    }
    console.error('[action]', describeError(error))
    return fail(MESSAGES.erreurGenerique)
  }
}

/** Nom, code et message d'une erreur — rien d'autre. */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code
    return `${error.name}${typeof code === 'string' ? ` [${code}]` : ''}: ${error.message}`
  }
  return typeof error === 'string' ? error : 'Erreur inconnue.'
}
