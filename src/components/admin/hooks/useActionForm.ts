'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import type { ActionResult } from '@/server/actions/types'

type FieldErrors = Record<string, string[]>

type RunOptions<T> = {
  /** Message de succès — une chaîne, ou calculé depuis la donnée renvoyée. */
  success?: string | ((data: T) => string)
  /** Ce qui suit un succès : mise à jour de l'état local, rechargement… */
  onSuccess?: (data: T) => void
  /** Remplace la notification d'erreur par défaut (le message du serveur
      en toast) — les erreurs de champ sont posées dans tous les cas. */
  onError?: (result: { error: string; fieldErrors?: FieldErrors }) => void
}

/**
 * Le motif commun des formulaires de l'admin qui appellent une action
 * serveur : une transition pour `pending`, les erreurs de champ du
 * serveur pour les afficher sous les champs, et le résultat annoncé.
 *
 * `run` remplace le bloc répété partout :
 *
 *   if (!result.ok) { setErreurs(result.fieldErrors ?? {}); toast.error(result.error); return }
 *   toast.success('…')
 *
 * `start` reste exposé pour les écritures qui ne suivent pas ce motif
 * (réordonnancement optimiste, bascule) mais doivent partager `pending`.
 */
export function useActionForm() {
  const [pending, start] = useTransition()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const run = <T,>(
    action: () => Promise<ActionResult<T>>,
    { success, onSuccess, onError }: RunOptions<T> = {},
  ) => {
    setFieldErrors({})
    start(async () => {
      const result = await action()
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {})
        if (onError) onError(result)
        else toast.error(result.error)
        return
      }
      if (success) {
        toast.success(
          typeof success === 'function' ? success(result.data) : success,
        )
      }
      onSuccess?.(result.data)
    })
  }

  return { pending, start, fieldErrors, setFieldErrors, run }
}
