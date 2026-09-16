'use client'

import { Copy, Eye, EyeOff, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { getBlock } from '@/blocks/registry'
import { cn } from '@/lib/utils'
import type { Section } from '@/server/db/schema'

/**
 * Liste des sections de la page — la colonne gauche de l'éditeur.
 *
 * Fidèle à la maquette : lignes calmes, grip visible au survol, ligne
 * active sur fond blanc avec une barre bleue à gauche, actions discrètes
 * au survol. Le glisser vertical réordonne via le `reorderTo` partagé du
 * constructeur ; le double-clic renomme en place.
 *
 * Aucune action serveur ici : chaque geste remonte au constructeur, qui
 * met son état à jour tout de suite et écrit en base via sa file.
 */

function labelOf(section: Section): string {
  return section.name ?? getBlock(section.type)?.label ?? section.type
}

export function SectionRail({
  roots,
  selectedId,
  highlightId,
  confirmId,
  onConfirmChange,
  onSelect,
  onToggle,
  onDuplicate,
  onDelete,
  onRename,
  reorderTo,
  onAdd,
  floating = false,
  onCollapse,
}: {
  /** Sections racine, dans l'ordre de la page. */
  roots: Section[]
  selectedId: string | null
  /** Ligne mise en évidence brièvement (section tout juste ajoutée). */
  highlightId: string | null
  /** Ligne dont la suppression attend confirmation — état porté par le
      constructeur, pour que la touche Suppr l'ouvre aussi. */
  confirmId: string | null
  onConfirmChange: (id: string | null) => void
  onSelect: (id: string) => void
  onToggle: (section: Section) => void
  onDuplicate: (section: Section) => void
  /** Suppression optimiste avec instantané (⌘Z), fournie par le
      constructeur — la confirmation vit ici, dans la ligne. */
  onDelete: (id: string) => Promise<unknown>
  /** Renommage optimiste, fourni par le constructeur. */
  onRename: (section: Section, value: string) => void
  /** Réordonnancement partagé avec le canvas : (id, from, boundary). */
  reorderTo: (id: string, from: number, boundary: number) => Promise<void>
  /** Ouvre la bibliothèque : insertion après la sélection, sinon en fin. */
  onAdd: () => void
  /** Fenêtre étroite : la liste flotte au-dessus du canvas et se referme
      d'un clic sur la croix. */
  floating?: boolean
  onCollapse?: () => void
}) {
  /* ── Renommage en place ─────────────────────────────────────────── */

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const commitRename = (section: Section, value: string) => {
    setRenamingId(null)
    if (value.trim() === (section.name ?? '')) return
    onRename(section, value)
  }

  /* ── Suppression : confirmation inline, lisible ─────────────────── */

  const setConfirmId = onConfirmChange

  /* La ligne disparue (supprimée, ou annulée par ⌘Z) n'a plus rien à
     confirmer. */
  useEffect(() => {
    if (confirmId && !roots.some((r) => r.id === confirmId)) {
      onConfirmChange(null)
    }
  }, [confirmId, onConfirmChange, roots])

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

  /* La ligne mise en évidence (ou à confirmer) est amenée dans la zone
     visible du rail. */
  useEffect(() => {
    const id = highlightId ?? confirmId
    if (!id) return
    rowRefs.current
      .get(id)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [highlightId, confirmId])

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
    <aside
      className={cn(
        'flex w-[236px] shrink-0 flex-col border-r border-border bg-ivory',
        floating && 'shadow-[8px_0_28px_rgba(28,32,30,0.14)]',
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-4">
        <div className="flex items-center justify-between px-2 pb-2.5">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.1em] text-stone">
            Sections de la page
          </h3>
          {floating && onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Replier la liste"
              title="Replier la liste"
              className="-mr-1 rounded-md p-1 text-stone transition-colors hover:bg-white hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-deep/50"
            >
              <X className="h-[13px] w-[13px]" strokeWidth={1.7} />
            </button>
          )}
        </div>

        <ul ref={listRef} className="relative flex flex-col gap-[3px]">
          {roots.map((section, index) => {
            const active = section.id === selectedId
            const renaming = renamingId === section.id
            const confirming = confirmId === section.id
            const dragged = drag?.id === section.id
            const highlighted = highlightId === section.id

            return (
              <li
                key={section.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(section.id, el)
                  else rowRefs.current.delete(section.id)
                }}
                className={cn(
                  'group relative flex select-none flex-col rounded-[9px] text-[13px] transition-colors duration-300',
                  active
                    ? 'bg-white text-foreground shadow-[0_1px_2px_rgba(28,32,30,0.06)]'
                    : 'text-ink-soft hover:bg-white/95',
                  highlighted && 'bg-blue-mist',
                  !section.isActive && !confirming && 'opacity-45',
                  dragged && 'z-10 shadow-[0_4px_14px_rgba(28,32,30,0.12)]',
                )}
                style={
                  drag && drag.id === section.id
                    ? { transform: `translateY(${drag.delta}px)` }
                    : undefined
                }
                onClick={() => {
                  if (!renaming && !confirming) onSelect(section.id)
                }}
                onDoubleClick={() => {
                  if (renaming || confirming) return
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

                <div className="flex items-center gap-[9px] px-2.5 py-[9px]">
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
                  {!renaming && !confirming && (
                    <span className="ml-auto hidden shrink-0 items-center gap-0.5 group-hover:flex group-focus-within:flex">
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
                          <Eye
                            className="h-[13px] w-[13px]"
                            strokeWidth={1.7}
                          />
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
                        title="Supprimer"
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmId(section.id)
                        }}
                        className="flex h-[22px] w-[22px] items-center justify-center rounded-md text-stone transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2
                          className="h-[13px] w-[13px]"
                          strokeWidth={1.7}
                        />
                      </button>
                    </span>
                  )}
                </div>

                {/* Confirmation en clair, dans la ligne : pas de corbeille
                    « armée » qui semble ne rien faire au premier clic. */}
                {confirming && (
                  <div
                    role="alertdialog"
                    aria-label="Confirmer la suppression"
                    onClick={(e) => e.stopPropagation()}
                    className="flex flex-wrap items-center gap-1.5 border-t border-border/70 px-2.5 pb-2 pt-1.5 text-[11.5px] text-foreground"
                  >
                    <span className="mr-auto">Supprimer cette section ?</span>
                    <button
                      type="button"
                      autoFocus
                      onClick={() => {
                        setConfirmId(null)
                        void onDelete(section.id)
                      }}
                      className="rounded-[6px] bg-red-600 px-2 py-[3px] text-[11px] font-medium text-white transition-colors hover:bg-red-700"
                    >
                      Supprimer
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setConfirmId(null)
                      }}
                      className="rounded-[6px] border border-line-strong bg-white px-2 py-[3px] text-[11px] text-ink-soft transition-colors hover:text-foreground"
                    >
                      Annuler
                    </button>
                  </div>
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
          className="mt-2.5 flex w-full items-center justify-center gap-[7px] rounded-[9px] border border-dashed border-line-strong p-2.5 text-[12.5px] text-ink-soft transition-colors hover:border-blue-deep hover:bg-[#f2f6f8] hover:text-blue-deep focus-visible:border-blue-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-deep/40"
        >
          <Plus className="h-[13px] w-[13px]" strokeWidth={1.7} />
          Ajouter une section
        </button>
      </div>
    </aside>
  )
}
