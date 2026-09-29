'use client'

import { createContext, useContext } from 'react'

/**
 * Les sections de la page telles qu'on peut y mener par un lien —
 * fournies par l'éditeur au formulaire d'une section, pour qu'un bouton
 * se règle en choisissant « vers quelle section », jamais en tapant
 * « #contact ».
 */
export type AnchorOption = { anchor: string; label: string }

export const AnchorsContext = createContext<AnchorOption[]>([])

export function useAnchors(): AnchorOption[] {
  return useContext(AnchorsContext)
}
