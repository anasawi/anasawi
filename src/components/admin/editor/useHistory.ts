'use client'

import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'

import type { HistoryEntry } from '../history'

/**
 * Historique de l'éditeur (⌘Z / ⌘⇧Z).
 *
 * Chaque entrée met l'état local à jour elle-même et passe par la file
 * d'actions : rien à recharger ici.
 */
export function useHistory() {
  const undoStack = useRef<HistoryEntry[]>([])
  const redoStack = useRef<HistoryEntry[]>([])
  const historyLock = useRef(false)
  /** Tailles des piles, en état React : les boutons Annuler / Rétablir se
      dérivent de cet état et non d'une lecture des refs pendant le rendu
      (fragile en rendu concurrent). `bump()` resynchronise après chaque
      mutation des piles. */
  const [historyLen, setHistoryLen] = useState({ undo: 0, redo: 0 })
  const bump = useCallback(() => {
    setHistoryLen({
      undo: undoStack.current.length,
      redo: redoStack.current.length,
    })
  }, [])

  const pushHistory = useCallback(
    (entry: HistoryEntry) => {
      undoStack.current.push(entry)
      if (undoStack.current.length > 50) undoStack.current.shift()
      redoStack.current = []
      bump()
    },
    [bump],
  )

  const clearHistory = useCallback(() => {
    undoStack.current = []
    redoStack.current = []
    bump()
  }, [bump])

  /** Retire une entrée poussée de façon optimiste dont l'écriture a
      échoué : l'historique ne doit jamais promettre un ⌘Z impossible. */
  const dropHistory = useCallback(
    (entry: HistoryEntry) => {
      undoStack.current = undoStack.current.filter((e) => e !== entry)
      redoStack.current = redoStack.current.filter((e) => e !== entry)
      bump()
    },
    [bump],
  )

  const runHistory = useCallback(async (direction: 'undo' | 'redo') => {
    if (historyLock.current) return
    const from = direction === 'undo' ? undoStack.current : redoStack.current
    const to = direction === 'undo' ? redoStack.current : undoStack.current
    const entry = from.pop()
    if (!entry) return
    historyLock.current = true
    try {
      const done = await (direction === 'undo'
        ? entry.undo()
        : entry.redo()
      ).catch(() => false)
      if (done) to.push(entry)
      else toast.error('Impossible d’annuler cette action.')
    } finally {
      historyLock.current = false
      bump()
    }
  }, [bump])

  /** Défait UNE entrée précise (le bouton « Annuler » d'un toast), même si
      d'autres actions ont eu lieu depuis — sans toucher au reste. */
  const undoEntry = useCallback(async (entry: HistoryEntry) => {
    if (historyLock.current) return
    const index = undoStack.current.lastIndexOf(entry)
    if (index < 0) return
    historyLock.current = true
    try {
      const done = await entry.undo().catch(() => false)
      if (done) {
        undoStack.current.splice(index, 1)
        redoStack.current.push(entry)
      } else {
        toast.error('Impossible d’annuler cette action.')
      }
    } finally {
      historyLock.current = false
      bump()
    }
  }, [bump])

  return {
    historyLen,
    pushHistory,
    clearHistory,
    dropHistory,
    runHistory,
    undoEntry,
  }
}
