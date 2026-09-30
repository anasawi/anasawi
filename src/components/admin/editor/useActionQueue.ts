'use client'

import { useCallback, useRef, useState } from 'react'

import { fail, type ActionResult } from '@/server/actions/types'

/** File d'actions : chaque écriture y passe, et un rejet (réseau) en
    ressort comme un résultat en échec. */
export type RunAction = <T>(
  fn: () => Promise<ActionResult<T>>,
) => Promise<ActionResult<T>>

/**
 * File d'actions serveur de l'éditeur.
 *
 * Une seule action en vol à la fois. Deux requêtes d'actions serveur
 * concurrentes se faisaient annuler (`ERR_ABORTED`) dès qu'un
 * rechargement partait au milieu : la file les met en rang, et
 * l'inspecteur y fait passer son enregistrement automatique.
 *
 * `enVol` : actions en vol (masquer, déplacer, dupliquer, supprimer,
 * ajouter). Tant qu'il en reste, la page dit « Enregistrement… » et le
 * navigateur retient un rechargement. Sans ce compteur, masquer une
 * section puis recharger aussitôt perdait le geste en silence — l'écran
 * avait déjà changé, la base pas encore.
 */
export function useActionQueue() {
  const enVolRef = useRef(0)
  const [enVol, setEnVol] = useState(false)

  const queueRef = useRef<Promise<unknown>>(Promise.resolve())
  const enqueue = useCallback(
    <T,>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> => {
      /* Une action qui REJETTE (réseau coupé, serveur injoignable) devient
         un résultat en échec : chaque appelant affiche son message et
         restaure son état, au lieu d'une promesse rejetée silencieuse.
         `fail` renvoie un `ActionResult<never>`, assignable à tout
         `ActionResult<T>` — aucun `as` nécessaire. */
      const attempt = (): Promise<ActionResult<T>> =>
        fn().catch(() =>
          fail('Connexion impossible — vérifiez votre réseau et réessayez.'),
        )
      enVolRef.current += 1
      setEnVol(true)
      const run = queueRef.current.then(attempt, attempt)
      queueRef.current = run.catch(() => undefined)
      void run.finally(() => {
        enVolRef.current -= 1
        if (enVolRef.current === 0) setEnVol(false)
      })
      return run
    },
    [],
  )

  return { enqueue, enVol }
}
