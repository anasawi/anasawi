'use client'

import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react'
import { toast } from 'sonner'

import type { HistoryEntry } from '../history'
import type { RunAction } from './useActionQueue'
import { updateTextField } from '@/server/actions/sections'
import type { Section } from '@/server/db/schema'

/**
 * Sélection au clic et édition en place au double-clic, dans la scène.
 *
 * Un champ marqué `data-edit-field` devient éditable (`contenteditable`)
 * le temps de la frappe ; Entrée ou la perte de focus valident, Échap
 * annule. La valeur part par la file d'actions et devient une entrée
 * d'historique.
 */
export function useInlineEditing({
  editing,
  sectionsRef,
  commitSections,
  enqueue,
  pushHistory,
  setSelectedId,
  setFreshId,
}: {
  editing: boolean
  sectionsRef: MutableRefObject<Section[]>
  commitSections: (update: (prev: Section[]) => Section[]) => void
  enqueue: RunAction
  pushHistory: (entry: HistoryEntry) => void
  setSelectedId: Dispatch<SetStateAction<string | null>>
  setFreshId: Dispatch<SetStateAction<string | null>>
}) {
  const onStageClick = useCallback(
    (e: React.MouseEvent) => {
      if (!editing) return
      const target = e.target as HTMLElement
      if (target.closest('a')) e.preventDefault()
      if (target.isContentEditable) return
      const root = target.closest<HTMLElement>('[data-block-root]')
      setSelectedId(root?.dataset.blockId ?? null)
    },
    [editing, setSelectedId],
  )

  const setTextLocally = useCallback(
    (id: string, fieldName: string, value: string) => {
      commitSections((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                payload: {
                  ...((s.payload ?? {}) as Record<string, unknown>),
                  [fieldName]: value,
                },
              }
            : s,
        ),
      )
    },
    [commitSections],
  )

  const onStageDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!editing) return
      const target = e.target as HTMLElement
      const editEl = target.closest<HTMLElement>('[data-edit-field]')
      const blockEl = editEl?.closest<HTMLElement>('[data-block-id]')
      if (!editEl || !blockEl) {
        /* Les modèles de page n'ont pas de champ éditable en place : le
           double-clic ouvre l'inspecteur directement sur « Contenu ». */
        const root = target.closest<HTMLElement>('[data-block-root]')
        const id = root?.dataset.blockId
        if (id) {
          setSelectedId(id)
          setFreshId(id)
        }
        return
      }

      const blockId = blockEl.dataset.blockId ?? ''
      const fieldName = editEl.dataset.editField ?? ''
      const multiline = editEl.dataset.editMultiline === 'true'
      const section = sectionsRef.current.find((s) => s.id === blockId)
      if (!section) return

      const payload = (section.payload ?? {}) as Record<string, unknown>
      const original =
        typeof payload[fieldName] === 'string'
          ? (payload[fieldName] as string)
          : ''
      const originalHtml = editEl.innerHTML

      editEl.setAttribute('contenteditable', 'plaintext-only')
      editEl.textContent = original
      editEl.focus()

      const finish = (commit: boolean) => {
        editEl.removeAttribute('contenteditable')
        editEl.removeEventListener('blur', onBlur)
        editEl.removeEventListener('keydown', onKeyDown)
        /* Même borne que la base. */
        const value = (editEl.textContent ?? '').slice(0, 8000)
        if (!commit || value === original) {
          editEl.innerHTML = originalHtml
          return
        }
        setTextLocally(blockId, fieldName, value)
        void enqueue(() => updateTextField(blockId, fieldName, value)).then(
          (r) => {
            if (!r.ok) {
              setTextLocally(blockId, fieldName, original)
              toast.error(r.error)
              return
            }
            pushHistory({
              label: 'Texte',
              undo: async () => {
                const u = await enqueue(() =>
                  updateTextField(blockId, fieldName, original),
                )
                if (u.ok) setTextLocally(blockId, fieldName, original)
                return u.ok
              },
              redo: async () => {
                const d = await enqueue(() =>
                  updateTextField(blockId, fieldName, value),
                )
                if (d.ok) setTextLocally(blockId, fieldName, value)
                return d.ok
              },
            })
          },
        )
      }

      const onBlur = () => finish(true)
      const onKeyDown = (ev: KeyboardEvent) => {
        if (ev.key === 'Escape') {
          ev.preventDefault()
          finish(false)
        } else if (ev.key === 'Enter' && !multiline) {
          ev.preventDefault()
          finish(true)
        }
      }
      editEl.addEventListener('blur', onBlur)
      editEl.addEventListener('keydown', onKeyDown)

      /* Le champ vit dans le document du cadre : sélection de CE
         document, pas de celui de l'admin. */
      const doc = editEl.ownerDocument
      const range = doc.createRange()
      range.selectNodeContents(editEl)
      const sel = doc.defaultView?.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    },
    [editing, enqueue, pushHistory, sectionsRef, setFreshId, setSelectedId, setTextLocally],
  )

  return { onStageClick, onStageDoubleClick }
}
