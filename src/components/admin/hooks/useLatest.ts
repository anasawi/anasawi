'use client'

import { useLayoutEffect, useRef, type MutableRefObject } from 'react'

/**
 * Une ref qui suit toujours la dernière valeur rendue.
 *
 * Pour les effets qui ne doivent PAS repartir quand une fonction de rappel
 * change d'identité (un `onReady` recréé à chaque rendu du parent, un
 * `saveNow` lu depuis un minuteur) : l'effet lit `ref.current` au moment
 * de l'exécution et garde ses vraies dépendances — sans désactiver la
 * règle des dépendances.
 *
 * Mise à jour dans un effet de layout : la valeur est à jour avant tout
 * effet passif du même rendu.
 */
export function useLatest<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}
