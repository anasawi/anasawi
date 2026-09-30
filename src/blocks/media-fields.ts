import type { FieldDescriptor } from './field'
import { getBlock } from './registry'

/**
 * Les champs média d'un payload, lus depuis les DESCRIPTEURS du bloc.
 *
 * Deux consommateurs parcouraient chacun le JSON à l'aveugle en devinant
 * les clés (« se termine par MediaId », « s'appelle mediaIds ») : le rendu
 * public pour charger les médias référencés, la bibliothèque de templates
 * pour illustrer les payloads par défaut. Les blocs déclarent pourtant
 * déjà chaque champ image ou vidéo (`kind: 'media' | 'mediaList'`), y
 * compris dans les listes : c'est cette déclaration qui fait foi ici, et
 * un champ média qui n'y figurerait pas ne serait de toute façon pas
 * éditable dans l'admin.
 */

/** Visite chaque champ média d'un payload, listes comprises. */
function visitMediaFields(
  fields: readonly FieldDescriptor[],
  payload: unknown,
  visit: (
    holder: Record<string, unknown>,
    field: FieldDescriptor,
  ) => void,
): void {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return
  const holder = payload as Record<string, unknown>

  for (const field of fields) {
    if (field.kind === 'media' || field.kind === 'mediaList') {
      visit(holder, field)
    } else if (field.kind === 'list' && field.itemFields) {
      const items = holder[field.name]
      if (!Array.isArray(items)) continue
      for (const item of items) visitMediaFields(field.itemFields, item, visit)
    }
  }
}

/** Identifiants de médias référencés par une section — vide si son type
    est inconnu (rien à charger pour un bloc qu'on ne rendra pas). */
export function collectMediaIds(
  type: string,
  payload: unknown,
  found: Set<string> = new Set(),
): Set<string> {
  const block = getBlock(type)
  if (!block) return found

  visitMediaFields(block.fields, payload, (holder, field) => {
    const value = holder[field.name]
    if (field.kind === 'media') {
      if (typeof value === 'string' && value) found.add(value)
    } else if (Array.isArray(value)) {
      for (const id of value) if (typeof id === 'string' && id) found.add(id)
    }
  })

  return found
}

/**
 * Copie du payload où chaque champ média reçoit un identifiant de `ids`,
 * en tournant : un média différent par champ, et jusqu'à cinq pour une
 * liste. Sans identifiants, le payload est rendu tel quel.
 */
export function illustratePayload<T>(type: string, payload: T, ids: string[]): T {
  const block = getBlock(type)
  if (!block || ids.length === 0) return payload

  const copy = structuredClone(payload)
  let n = 0
  visitMediaFields(block.fields, copy, (holder, field) => {
    holder[field.name] =
      field.kind === 'media' ? (ids[n++ % ids.length] ?? null) : ids.slice(0, 5)
  })
  return copy
}
