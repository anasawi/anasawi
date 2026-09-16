'use client'

import { createContext, useContext } from 'react'

import type { SwatchGroup } from '@/lib/color'
import {
  DEFAULT_PALETTE,
  paletteSwatchGroups,
  type Palette,
} from '@/lib/palette'

/**
 * La palette du site, disponible partout dans le CMS.
 *
 * Tous les sélecteurs de couleur (fond de section, inspecteur, aperçu)
 * puisent ici : les choix proposés sont donc toujours ceux de la palette
 * enregistrée, jamais une liste figée dans le code. Sans fournisseur — un
 * écran isolé, un test — on retombe sur la charte ANASAWI.
 */

export type PaletteContextValue = {
  palette: Palette
  groups: SwatchGroup[]
}

const FALLBACK: PaletteContextValue = {
  palette: DEFAULT_PALETTE,
  groups: paletteSwatchGroups(DEFAULT_PALETTE),
}

const PaletteContext = createContext<PaletteContextValue | null>(null)

export function PaletteProvider({
  palette,
  children,
}: {
  palette: Palette
  children: React.ReactNode
}) {
  /* Pas de mémoïsation : le calcul des 25 nuances est trivial, et le
     fournisseur ne se re-rend que lorsque la palette change vraiment —
     soit au rechargement d'un écran, soit à chaque geste dans l'éditeur de
     palette, où l'aperçu doit justement suivre. */
  const value: PaletteContextValue = {
    palette,
    groups: paletteSwatchGroups(palette),
  }

  return (
    <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>
  )
}

export function usePalette(): PaletteContextValue {
  return useContext(PaletteContext) ?? FALLBACK
}
