'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react'
import { toast } from 'sonner'

import type { HistoryEntry } from '../history'
import type { SectionDraft } from '../SectionInspector'
import type { RunAction } from './useActionQueue'
import { getBlock } from '@/blocks/registry'
import { projectSection } from '@/lib/publish'
import type { SectionSettings } from '@/lib/section-settings'
import { makeSectionRow } from '@/lib/snapshot'
import { restoreSections } from '@/server/actions/publish'
import { deleteSavedSection, insertSavedSection } from '@/server/actions/saved-sections'
import {
  deleteSection,
  duplicateSection,
  insertSection,
  renameSection,
  reorderSections,
  toggleSection,
} from '@/server/actions/sections'
import type { ActionResult } from '@/server/actions/types'
import type { SavedSection, Section } from '@/server/db/schema'

/** Sections racine, dans l'ordre de la page. */
export function rootsOf(sections: Section[]): Section[] {
  return sections
    .filter((s) => !s.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

/** Une ligne et ses enfants directs — ce qu'une suppression emporte. */
function subtreeOf(sections: Section[], id: string): Section[] {
  return sections.filter((s) => s.id === id || s.parentId === id)
}

/**
 * Les mutations de la page : ajout, suppression, réorganisation, masquage,
 * renommage, duplication, modèles personnels — et leurs miroirs locaux.
 *
 * Toute mutation est appliquée à l'état local d'abord, écrite ensuite via
 * la file d'actions ; en cas d'échec, l'état précédent revient avec un
 * message. Chaque geste pousse son inverse dans l'historique.
 */
export function useSectionMutations({
  pageId,
  sectionsRef,
  commitSections,
  enqueue,
  pushHistory,
  dropHistory,
  undoEntry,
  selectedId,
  setSelectedId,
  flushDraftRef,
  insertIndexRef,
  scrollToRef,
  savedList,
  setSavedList,
}: {
  pageId: string
  sectionsRef: MutableRefObject<Section[]>
  commitSections: (update: (prev: Section[]) => Section[]) => void
  enqueue: RunAction
  pushHistory: (entry: HistoryEntry) => void
  dropHistory: (entry: HistoryEntry) => void
  undoEntry: (entry: HistoryEntry) => Promise<void>
  selectedId: string | null
  setSelectedId: Dispatch<SetStateAction<string | null>>
  /** Écriture forcée du reliquat de frappe de l'inspecteur. */
  flushDraftRef: MutableRefObject<(() => Promise<void>) | null>
  /** Position choisie par un « + » du canvas (voir `TemplateEditor`). */
  insertIndexRef: MutableRefObject<{ beforeId: string | null } | null>
  /** Section à amener au centre du canvas au prochain rendu. */
  scrollToRef: MutableRefObject<string | null>
  savedList: SavedSection[]
  setSavedList: Dispatch<SetStateAction<SavedSection[]>>
}) {
  /** Section tout juste ajoutée : rail mis en évidence, inspecteur ouvert
      sur « Contenu ». */
  const [freshId, setFreshId] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* La section « fraîche » ne l'est que tant qu'elle reste sélectionnée. */
  useEffect(() => {
    if (freshId && selectedId !== freshId) setFreshId(null)
  }, [freshId, selectedId])

  useEffect(
    () => () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current)
    },
    [],
  )

  /** Ligne du rail mise en évidence 1,2 s. */
  const flash = useCallback((id: string) => {
    setHighlightId(id)
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(() => setHighlightId(null), 1200)
  }, [])

  /** Après un ajout : sélection, défilement, inspecteur sur « Contenu »,
      ligne du rail mise en évidence. */
  const revealNew = useCallback(
    (id: string) => {
      scrollToRef.current = id
      setSelectedId(id)
      setFreshId(id)
      flash(id)
    },
    [flash, scrollToRef, setSelectedId],
  )

  /** Après un ⌘Z qui ramène une section : défilement et mise en
      évidence, sans ouvrir l'inspecteur. */
  const revealRestored = useCallback(
    (id: string) => {
      scrollToRef.current = id
      flash(id)
    },
    [flash, scrollToRef],
  )

  /* ── Brouillon de l'inspecteur → rendu immédiat ──────────────────── */

  const applyDraft = useCallback(
    (id: string, draft: SectionDraft) => {
      commitSections((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                payload: draft.payload,
                anchor: draft.meta.anchor,
                navLabel: draft.meta.navLabel,
                showInNav: draft.meta.showInNav,
                isActive: draft.meta.isActive,
                backgroundColor: draft.meta.backgroundColor,
                styles: draft.styles,
              }
            : s,
        ),
      )
    },
    [commitSections],
  )

  const applySettings = useCallback(
    (id: string, settings: SectionSettings) => {
      commitSections((prev) =>
        prev.map((s) => (s.id === id ? { ...s, settings } : s)),
      )
    },
    [commitSections],
  )

  /* ── Miroirs locaux des écritures serveur ────────────────────────── */

  /** Insère une racine au rang `position` — même décalage que la base. */
  const insertRootLocally = useCallback(
    (row: Section) => {
      commitSections((prev) => [
        ...prev.map((s) =>
          !s.parentId && s.sortOrder >= row.sortOrder
            ? { ...s, sortOrder: s.sortOrder + 1 }
            : s,
        ),
        row,
      ])
    },
    [commitSections],
  )

  /** Retire une ligne et ses enfants — la base ne recompacte pas. */
  const removeLocally = useCallback(
    (id: string) => {
      commitSections((prev) =>
        prev.filter((s) => s.id !== id && s.parentId !== id),
      )
    },
    [commitSections],
  )

  /** Réécrit les rangs des racines dans l'ordre donné (= `reorderSections`). */
  const applyOrderLocally = useCallback(
    (orderedIds: string[]) => {
      commitSections((prev) =>
        prev.map((s) => {
          const idx = orderedIds.indexOf(s.id)
          return idx >= 0 ? { ...s, sortOrder: idx } : s
        }),
      )
    },
    [commitSections],
  )

  /** Nouvelle ligne racine, à l'image de ce que la base va créer. */
  const buildRoot = useCallback(
    (id: string, position: number, patch: Partial<Section>): Section =>
      makeSectionRow({ id, pageId, sortOrder: position, type: 'text', ...patch }),
    [pageId],
  )

  /* ── Suppression annulable ───────────────────────────────────────── */

  const deleteWithHistory = useCallback(
    async (id: string): Promise<ActionResult<void>> => {
      /* Un reliquat de frappe de l'inspecteur part avant la suppression :
         sa fermeture n'enverra rien vers une ligne disparue. */
      await flushDraftRef.current?.()

      const before = sectionsRef.current
      const removed = subtreeOf(before, id)
      if (removed.length === 0) {
        return { ok: false, error: 'Section introuvable.' }
      }

      /* Optimiste : la section disparaît tout de suite, et l'entrée
         d'historique est poussée AVANT la réponse du serveur — un ⌘Z
         pressé dans la foulée annule bien cette suppression, pas l'action
         d'avant. La file sérialise restauration et suppression. */
      removeLocally(id)
      setSelectedId((cur) => (cur === id ? null : cur))

      /* Projection pour `restoreSections` (le ⌘Z d'une suppression). */
      const snapshot = removed.map(projectSection)
      const entry: HistoryEntry = {
        label: 'Suppression',
        undo: async () => {
          const r = await enqueue(() => restoreSections(snapshot))
          if (r.ok) {
            commitSections((prev) => [...prev, ...removed])
            revealRestored(id)
          }
          return r.ok
        },
        redo: async () => {
          const r = await enqueue(() => deleteSection(id))
          if (r.ok) removeLocally(id)
          return r.ok
        },
      }
      pushHistory(entry)

      /* Le geste se défait d'un clic, sans chercher ⌘Z. */
      const toastId = toast('Section supprimée', {
        action: {
          label: 'Annuler',
          onClick: () => void undoEntry(entry),
        },
      })

      const result = await enqueue(() => deleteSection(id))
      if (!result.ok) {
        toast.dismiss(toastId)
        dropHistory(entry)
        commitSections(() => before)
        toast.error(result.error)
      }
      return result
    },
    [
      commitSections,
      dropHistory,
      enqueue,
      flushDraftRef,
      pushHistory,
      removeLocally,
      revealRestored,
      sectionsRef,
      setSelectedId,
      undoEntry,
    ],
  )

  /* ── Ajout depuis la bibliothèque ────────────────────────────────── */

  /**
   * Rang d'insertion, en `sortOrder` (jamais en index visuel : après une
   * suppression les rangs ont des trous, et la base décale « à partir du
   * rang », pas « à partir de la position »).
   *
   * — un « + » du canvas a fixé la place : le rang de la section devant
   *   laquelle insérer, ou la fin de page ;
   * — sinon, juste après la section sélectionnée ;
   * — sinon, en fin de page.
   */
  const resolveInsertPosition = useCallback((): number => {
    const currentRoots = rootsOf(sectionsRef.current)
    const last = currentRoots[currentRoots.length - 1]
    const end = last ? last.sortOrder + 1 : 0

    const pinned = insertIndexRef.current
    insertIndexRef.current = null
    if (pinned) {
      const before = pinned.beforeId
        ? currentRoots.find((r) => r.id === pinned.beforeId)
        : undefined
      return before ? before.sortOrder : end
    }

    const current = selectedId
      ? currentRoots.find((r) => r.id === selectedId)
      : undefined
    return current ? current.sortOrder + 1 : end
  }, [insertIndexRef, sectionsRef, selectedId])

  const addSection = useCallback(
    async (type: string, label: string) => {
      const block = getBlock(type)
      if (!block) {
        toast.error('Type de section inconnu.')
        return
      }
      const position = resolveInsertPosition()

      const result = await enqueue(() =>
        insertSection({ pageId, type, position }),
      )
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      let currentId = result.data.id

      const rowFor = (id: string) =>
        buildRoot(id, position, {
          type,
          anchor: block.suggestedAnchor || null,
          navLabel: block.navigable ? block.label : null,
          showInNav: block.navigable ?? false,
          payload: block.schema.parse(block.defaults),
        })

      insertRootLocally(rowFor(currentId))
      revealNew(currentId)

      pushHistory({
        label: `Section — ${label}`,
        undo: async () => {
          const r = await enqueue(() => deleteSection(currentId))
          if (r.ok) removeLocally(currentId)
          return r.ok
        },
        redo: async () => {
          const again = await enqueue(() =>
            insertSection({ pageId, type, position }),
          )
          if (again.ok) {
            currentId = again.data.id
            insertRootLocally(rowFor(currentId))
            revealNew(currentId)
          }
          return again.ok
        },
      })
    },
    [
      buildRoot,
      enqueue,
      insertRootLocally,
      pageId,
      pushHistory,
      removeLocally,
      resolveInsertPosition,
      revealNew,
    ],
  )

  /* ── Modèles personnels ──────────────────────────────────────────── */

  const addSaved = useCallback(
    async (model: SavedSection) => {
      const block = getBlock(model.type)
      if (!block) {
        toast.error('Type de section inconnu.')
        return
      }
      const position = resolveInsertPosition()

      const result = await enqueue(() =>
        insertSavedSection({ pageId, savedId: model.id, position }),
      )
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      let currentId = result.data.id

      /* Même normalisation que la base : le payload repasse par le schéma. */
      const parsed = block.schema.safeParse(model.payload)
      const rowFor = (id: string) =>
        buildRoot(id, position, {
          type: model.type,
          name: model.name,
          settings: model.settings,
          backgroundColor: model.backgroundColor,
          payload: parsed.success ? parsed.data : model.payload,
        })

      insertRootLocally(rowFor(currentId))
      revealNew(currentId)

      pushHistory({
        label: `Modèle — ${model.name}`,
        undo: async () => {
          const r = await enqueue(() => deleteSection(currentId))
          if (r.ok) removeLocally(currentId)
          return r.ok
        },
        redo: async () => {
          const again = await enqueue(() =>
            insertSavedSection({ pageId, savedId: model.id, position }),
          )
          if (again.ok) {
            currentId = again.data.id
            insertRootLocally(rowFor(currentId))
            revealNew(currentId)
          }
          return again.ok
        },
      })
    },
    [
      buildRoot,
      enqueue,
      insertRootLocally,
      pageId,
      pushHistory,
      removeLocally,
      resolveInsertPosition,
      revealNew,
    ],
  )

  const removeSaved = useCallback(
    async (id: string) => {
      const before = savedList
      setSavedList((prev) => prev.filter((s) => s.id !== id))
      const result = await enqueue(() => deleteSavedSection(id))
      if (!result.ok) {
        setSavedList(before)
        toast.error(result.error)
        return
      }
      toast.success('Modèle supprimé.')
    },
    [enqueue, savedList, setSavedList],
  )

  const onSavedCreated = useCallback(
    (model: SavedSection) => {
      setSavedList((prev) => [model, ...prev])
    },
    [setSavedList],
  )

  /* ── Réordonner, masquer, dupliquer, renommer ────────────────────── */

  const reorderTo = useCallback(
    async (id: string, from: number, boundary: number) => {
      /* Frontière → index cible façon arrayMove : au-delà de sa propre
         position, l'élément retiré décale les indices d'un cran. */
      const to = boundary > from ? boundary - 1 : boundary
      if (to === from) return

      const before = sectionsRef.current
      const previousIds = rootsOf(before).map((r) => r.id)
      const nextIds = [...previousIds]
      nextIds.splice(from, 1)
      nextIds.splice(to, 0, id)

      applyOrderLocally(nextIds)

      const entry: HistoryEntry = {
        label: 'Réorganisation',
        undo: async () => {
          const r = await enqueue(() => reorderSections(pageId, previousIds))
          if (r.ok) applyOrderLocally(previousIds)
          return r.ok
        },
        redo: async () => {
          const r = await enqueue(() => reorderSections(pageId, nextIds))
          if (r.ok) applyOrderLocally(nextIds)
          return r.ok
        },
      }
      pushHistory(entry)

      const result = await enqueue(() => reorderSections(pageId, nextIds))
      if (!result.ok) {
        dropHistory(entry)
        commitSections(() => before)
        toast.error(result.error)
      }
    },
    [
      applyOrderLocally,
      commitSections,
      dropHistory,
      enqueue,
      pageId,
      pushHistory,
      sectionsRef,
    ],
  )

  const setActiveLocally = useCallback(
    (id: string, isActive: boolean) => {
      commitSections((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive } : s)),
      )
    },
    [commitSections],
  )

  const toggleWithHistory = useCallback(
    async (section: Section) => {
      const next = !section.isActive
      setActiveLocally(section.id, next)

      const entry: HistoryEntry = {
        label: next ? 'Section affichée' : 'Section masquée',
        undo: async () => {
          const r = await enqueue(() => toggleSection(section.id, !next))
          if (r.ok) setActiveLocally(section.id, !next)
          return r.ok
        },
        redo: async () => {
          const r = await enqueue(() => toggleSection(section.id, next))
          if (r.ok) setActiveLocally(section.id, next)
          return r.ok
        },
      }
      pushHistory(entry)

      const result = await enqueue(() => toggleSection(section.id, next))
      if (!result.ok) {
        dropHistory(entry)
        setActiveLocally(section.id, !next)
        toast.error(result.error)
      }
    },
    [dropHistory, enqueue, pushHistory, setActiveLocally],
  )

  const setNameLocally = useCallback(
    (id: string, name: string | null) => {
      commitSections((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name } : s)),
      )
    },
    [commitSections],
  )

  const renameWithHistory = useCallback(
    async (section: Section, value: string) => {
      const prevName = section.name
      /* Même normalisation que la base. */
      const nextName = value.trim().slice(0, 80) || null
      if (nextName === prevName) return
      setNameLocally(section.id, nextName)

      const entry: HistoryEntry = {
        label: 'Renommage',
        undo: async () => {
          const r = await enqueue(() =>
            renameSection(section.id, prevName ?? ''),
          )
          if (r.ok) setNameLocally(section.id, prevName)
          return r.ok
        },
        redo: async () => {
          const r = await enqueue(() => renameSection(section.id, value))
          if (r.ok) setNameLocally(section.id, nextName)
          return r.ok
        },
      }
      pushHistory(entry)

      const result = await enqueue(() => renameSection(section.id, value))
      if (!result.ok) {
        dropHistory(entry)
        setNameLocally(section.id, prevName)
        toast.error(result.error)
      }
    },
    [dropHistory, enqueue, pushHistory, setNameLocally],
  )

  const duplicateWithHistory = useCallback(
    async (section: Section) => {
      /* La copie doit contenir la dernière frappe, pas l'état d'il y a
         600 ms : le reliquat part d'abord. */
      await flushDraftRef.current?.()

      const result = await enqueue(() => duplicateSection(section.id))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      let currentId = result.data.id

      /* La copie telle que la base la crée : sans ancre ni entrée de
         menu (deux ancres identiques casseraient la navigation), juste
         en dessous, même visibilité. */
      const copyFor = (id: string): Section => {
        const now = new Date()
        return {
          ...section,
          id,
          name: section.name ? `${section.name} (copie)` : null,
          anchor: null,
          navLabel: null,
          showInNav: false,
          sortOrder: section.sortOrder + 1,
          createdAt: now,
          updatedAt: now,
        }
      }

      insertRootLocally(copyFor(currentId))
      toast.success('Copie créée juste en dessous.')
      revealNew(currentId)

      pushHistory({
        label: 'Duplication',
        undo: async () => {
          const r = await enqueue(() => deleteSection(currentId))
          if (r.ok) removeLocally(currentId)
          return r.ok
        },
        redo: async () => {
          const again = await enqueue(() => duplicateSection(section.id))
          if (again.ok) {
            currentId = again.data.id
            insertRootLocally(copyFor(currentId))
            revealNew(currentId)
          }
          return again.ok
        },
      })
    },
    [enqueue, flushDraftRef, insertRootLocally, pushHistory, removeLocally, revealNew],
  )

  return {
    freshId,
    setFreshId,
    highlightId,
    applyDraft,
    applySettings,
    deleteWithHistory,
    addSection,
    addSaved,
    removeSaved,
    onSavedCreated,
    reorderTo,
    toggleWithHistory,
    renameWithHistory,
    duplicateWithHistory,
  }
}
