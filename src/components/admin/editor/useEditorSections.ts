'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { SavedSection, Section } from '@/server/db/schema'

export type SaveState = 'saved' | 'dirty' | 'saving'

/**
 * L'état local des sections — la source de vérité de l'éditeur — et
 * l'état d'écriture du panneau.
 *
 * Toute mutation passe par `commitSections` ; le rechargement serveur
 * (Publier, Annuler) resynchronise depuis `initialSections`, sauf pendant
 * une frappe.
 */
export function useEditorSections(
  initialSections: Section[],
  saved: SavedSection[],
) {
  const [sections, setSections] = useState(initialSections)
  /** Miroir synchrone de `sections` : les callbacks lisent toujours l'état
      courant, jamais une fermeture obsolète. */
  const sectionsRef = useRef(initialSections)

  const commitSections = useCallback(
    (update: (prev: Section[]) => Section[]) => {
      /* Toujours dans l'ordre de la page : le rendu suit l'ordre du
         tableau, et une ligne insérée « en fin de tableau » s'affichait
         en bas de page le temps d'un aller-retour serveur — le centrage
         mesurait alors la mauvaise position. */
      const next = [...update(sectionsRef.current)].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      )
      sectionsRef.current = next
      setSections(next)
    },
    [],
  )

  /** État d'écriture du panneau — la petite ligne sous l'indicateur. */
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const saveStateRef = useRef(saveState)
  const onSaveStateChange = useCallback((state: SaveState) => {
    saveStateRef.current = state
    setSaveState(state)
  }, [])

  /* Rechargement serveur (après Publier / Annuler les modifications, et
     à chaque action serveur qui revalide la page) : la base redevient la
     référence — sauf pendant une frappe, où l'état local est plus récent
     que ce que le serveur renvoie. */
  useEffect(() => {
    if (saveStateRef.current !== 'saved') return
    sectionsRef.current = initialSections
    setSections(initialSections)
  }, [initialSections])

  /* Modèles personnels — mis à jour localement, sans rechargement. */
  const [savedList, setSavedList] = useState(saved)
  useEffect(() => setSavedList(saved), [saved])

  return {
    sections,
    sectionsRef,
    commitSections,
    saveState,
    onSaveStateChange,
    savedList,
    setSavedList,
  }
}
