'use client'

import { useEffect, type Dispatch, type SetStateAction } from 'react'

/**
 * Raccourcis clavier de l'éditeur : ⌘Z / ⌘⇧Z, Échap (ferme ce qui est
 * ouvert, du plus proche au plus lointain), Suppr / Retour arrière sur la
 * section sélectionnée.
 */
export function useEditorShortcuts({
  confirmDeleteId,
  confirmDiscard,
  libraryOpen,
  mode,
  railOverlay,
  runHistory,
  selectedId,
  wide,
  setConfirmDeleteId,
  setRailOverlay,
  setSelectedId,
  setMode,
}: {
  confirmDeleteId: string | null
  confirmDiscard: boolean
  libraryOpen: boolean
  mode: 'edit' | 'preview'
  railOverlay: boolean
  runHistory: (direction: 'undo' | 'redo') => Promise<void>
  selectedId: string | null
  wide: boolean
  setConfirmDeleteId: Dispatch<SetStateAction<string | null>>
  setRailOverlay: Dispatch<SetStateAction<boolean>>
  setSelectedId: Dispatch<SetStateAction<string | null>>
  setMode: Dispatch<SetStateAction<'edit' | 'preview'>>
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' ||
        el.isContentEditable
      ) {
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        void runHistory(e.shiftKey ? 'redo' : 'undo')
        return
      }
      /* La bibliothèque (une boîte de dialogue) gère elle-même Échap. */
      if (libraryOpen || confirmDiscard) return

      if (e.key === 'Escape') {
        if (confirmDeleteId) {
          setConfirmDeleteId(null)
        } else if (railOverlay) {
          setRailOverlay(false)
        } else if (selectedId) {
          setSelectedId(null)
        } else if (mode === 'preview') {
          setMode('edit')
        }
        return
      }

      /* Suppr / Retour arrière sur la section sélectionnée : la ligne du
         rail demande confirmation — jamais de suppression directe. */
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedId &&
        mode === 'edit' &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        e.preventDefault()
        setConfirmDeleteId(selectedId)
        if (!wide) setRailOverlay(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    confirmDeleteId,
    confirmDiscard,
    libraryOpen,
    mode,
    railOverlay,
    runHistory,
    selectedId,
    wide,
    /* Les setters de `useState` sont stables : ils ne relancent jamais
       l'effet, mais la règle des dépendances ne le sait pas ici. */
    setConfirmDeleteId,
    setMode,
    setRailOverlay,
    setSelectedId,
  ])
}
