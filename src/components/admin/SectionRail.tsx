'use client'

import { Copy, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { getBlock } from '@/blocks/registry'
import { cn } from '@/lib/utils'
import { renameSection } from '@/server/actions/pages'
import type { HistoryEntry } from './history'
import type { ActionResult } from '@/server/actions/types'
import type { Section } from '@/server/db/schema'

/**
 * Liste des sections de la page — la colonne gauche de l'éditeur.
 *
 * Fidèle à la maquette : lignes calmes, grip visible au survol, ligne
 * active sur fond blanc avec une barre bleue à gauche, actions discrètes
 * au survol. Le glisser vertical réordonne via le `reorderTo` partagé du
 * constructeur ; le double-clic renomme en place.
 */

function labelOf(section: Section): string {
  return section.name ?? getBlock(section.type)?.label ?? section.type
}

export function SectionRail({
  roots,
  selectedId,
  onSelect,
  onToggle,
  onDuplicate,
  onDelete,
  reorderTo,
  pushHistory,
  onAdd,
}: {
  /** Sections racine, dans l'ordre de la page. */
  roots: Section[]
  selectedId: string | null
  onSelect: (id: string) => void
  onToggle: (section: Section) => void
  onDuplicate: (section: Section) => void
  /** Suppression avec instantané (⌘Z), fournie par le constructeur. */
  onDelete: (id: string) => Promise<ActionResult<unknown>>
  /** Réordonnancement partagé avec le canvas : (id, from, boundary). */
  reorderTo: (id: string, from: number, boundary: number) => Promise<void>
  pushHistory: (entry: HistoryEntry) => void
  /** Ouvre la bibliothèque, insertion en fin de page. */
  onAdd: () => void
}) {
  const router = useRouter()

  /* ── Renommage en place ─────────────────────────────────────────── */

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const commitRename = (section: Section, value: string) => {
    setRenamingId(null)
    const prev = section.name ?? ''
    if (value.trim() === prev) return
    void renameSection(section.id, value).then((result) => {
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      pushHistory({
        label: 'Renommage',
        undo: async () => (await renameSection(section.id, prev)).ok,
        redo: async () => (await renameSection(section.id, value)).ok,
      })
      router.refresh()
    })
  }

  /* ── Corbeille en deux temps — armée 2,5 s puis désarmée ────────── */

  const [armed, setArmed] = useState<string | null>(null)
  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(null), 2500)
    return () => clearTimeout(timer)
  }, [armed])

  /* ── Glisser vertical par pointeur ──────────────────────────────── */

  const listRef = useRef<HTMLUListElement>(null)
  const rowRefs = useRef(new Map<string, HTMLLIElement>())
  const [drag, setDrag] = useState<{
    id: string
    boundary: number
    delta: number
  } | null>(null)
  /** Repères figés au pointerdown — le DOM bouge pendant le glisser. */
  const frozen = useRef<{
    listTop: number
    rows: { top: number; height: number }[]
  } | null>(null)

  const beginDrag = (e: React.PointerEvent, id: string, from: number) => {
    if (e.button !== 0) return
    e.preventDefault()
    const list = listRef.current
    if (!list) return

    const listTop = list.getBoundingClientRect().top
    const rows = roots.map((r) => {
      const el = rowRefs.current.get(r.id)
      const rect = el?.getBoundingClientRect()
      return rect
        ? { top: rect.top - listTop, height: rect.height }
        : { top: 0, height: 0 }
    })
    frozen.current = { listTop, rows }

    const startY = e.clientY
    let activated = false

    const boundaryAt = (clientY: number) => {
      const y = clientY - listTop
      let boundary = 0
      for (const row of rows) if (y > row.top + row.height / 2) boundary++
      return boundary
    }

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientY - startY
      if (!activated && Math.abs(delta) < 4) return
      activated = true
      setDrag({ id, boundary: boundaryAt(ev.clientY), delta })
    }
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      frozen.current = null
      setDrag(null)
      if (!activated) return
      void reorderTo(id, from, boundaryAt(ev.clientY))
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
  }

  /* Position du trait bleu d'insertion, en coordonnées de la liste. */
  const insertY = (() => {
    if (!drag || !frozen.current) return null
    const rows = frozen.current.rows
    const row = rows[drag.boundary]
    if (row) return row.top
    const last = rows[rows.length - 1]
    return last ? last.top + last.height : 0
  })()

  return (
    <aside className="flex w-[236px] shrink-0 flex-col border-r border-border bg-ivory">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-4">
        <h3 className="px-2 pb-2.5 text-[11px] font-medium uppercase tracking-[0.1em] text-stone">
          Sections de la page
        </h3>

        <ul ref={listRef} className="relative flex flex-col gap-[3px]">
          {roots.map((section, index) => {
            const active = section.id === selectedId
            const renaming = renamingId === section.id
            const dragged = drag?.id === section.id

            return (
              <li
                key={section.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(section.id, el)
                  else rowRefs.current.delete(section.id)
                }}
                className={cn(
                  'group relative flex select-none items-center gap-[9px] rounded-[9px] px-2.5 py-[9px] text-[13px] transition-colors',
                  active
                    ? 'bg-white text-foreground shadow-[0_1px_2px_rgba(28,32,30,0.06)]'
                    : 'text-ink-soft hover:bg-white/95',
                  !section.isActive && 'opacity-45',
                  dragged && 'z-10 shadow-[0_4px_14px_rgba(28,32,30,0.12)]',
                )}
                style={
                  drag && drag.id === section.id
                    ? { transform: `translateY(${drag.delta}px)` }
                    : undefined
                }
                onClick={() => {
                  if (!renaming) onSelect(section.id)
                }}
                onDoubleClick={() => {
                  if (renaming) return
                  setRenamingId(section.id)
                  setDraft(section.name ?? '')
                }}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-2 left-0 top-2 w-[2px] rounded-[2px] bg-blue-deep"
                  />
                )}

                <span
                  aria-hidden="true"
                  onPointerDown={(e) => beginDrag(e, section.id, index)}
                  className="shrink-0 cursor-grab text-[11px] leading-none tracking-[1px] text-transparent group-hover:text-stone active:cursor-grabbing"
                >
                  ⋮⋮
                </span>

                {renaming ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => commitRename(section, draft)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(section, draft)
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="min-w-0 flex-1 rounded-[4px] border border-blue-deep/50 bg-white px-1 py-0.5 text-[12.5px] outline-none"
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate">
                    {labelOf(section)}
                    {!section.isActive && (
                      <span className="ml-1.5 text-[10px] text-stone">
                        masquée
                      </span>
                    )}
                  </span>
                )}

                {/* Actions — visibles au survol seulement. */}
                {!renaming && (
                  <span className="ml-auto hidden shrink-0 items-center gap-0.5 group-hover:flex">
                    <button
                      type="button"
                      title={section.isActive ? 'Masquer' : 'Afficher'}
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggle(section)
                      }}
                      className="flex h-[22px] w-[22px] items-center justify-center rounded-md text-stone transition-colors hover:bg-blue-mist hover:text-blue-deep"
                    >
                      {section.isActive ? (
                        <Eye className="h-[13px] w-[13px]" strokeWidth={1.7} />
                      ) : (
                        <EyeOff
                          className="h-[13px] w-[13px]"
                          strokeWidth={1.7}
                        />
                      )}
                    </button>
                    <button
                      type="button"
                      title="Dupliquer"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDuplicate(section)
                      }}
                      className="flex h-[22px] w-[22px] items-center justify-center rounded-md text-stone transition-colors hover:bg-blue-mist hover:text-blue-deep"
                    >
                      <Copy className="h-[13px] w-[13px]" strokeWidth={1.7} />
                    </button>
                    <button
                      type="button"
                      title={
                        armed === section.id
                          ? 'Cliquez pour confirmer'
                          : 'Supprimer'
                      }
                      onClick={(e) => {
                        e.stopPropagation()
                        if (armed === section.id) {
                          setArmed(null)
                          void onDelete(section.id).then((result) => {
                            if (result.ok) router.refresh()
                          })
                        } else {
                          setArmed(section.id)
                        }
                      }}
                      className={cn(
                        'flex h-[22px] w-[22px] items-center justify-center rounded-md transition-colors',
                        armed === section.id
                          ? 'bg-red-600 text-white'
                          : 'text-stone hover:bg-red-50 hover:text-red-600',
                      )}
                    >
                      <Trash2 className="h-[13px] w-[13px]" strokeWidth={1.7} />
                    </button>
                  </span>
                )}
              </li>
            )
          })}

          {/* Trait bleu d'insertion pendant le glisser. */}
          {insertY !== null && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-1 z-20 h-[2px] rounded-full bg-blue-deep"
              style={{ top: insertY - 2 }}
            />
          )}
        </ul>

        <button
          type="button"
          onClick={onAdd}
          className="mt-2.5 flex w-full items-center justify-center gap-[7px] rounded-[9px] border border-dashed border-line-strong p-2.5 text-[12.5px] text-ink-soft transition-colors hover:border-blue-deep hover:bg-[#f2f6f8] hover:text-blue-deep"
        >
          <Plus className="h-[13px] w-[13px]" strokeWidth={1.7} />
          Ajouter une section
        </button>
      </div>
    </aside>
  )
}
