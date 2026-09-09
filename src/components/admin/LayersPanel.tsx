'use client'

import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { ChevronRight, Copy, Eye, EyeOff, GripVertical } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { ConfirmDelete } from './ConfirmDelete'
import { Swatch } from './ColorPicker'
import { getBlock } from '@/blocks/registry'
import { Button } from '@/components/ui/button'
import { parseGridPosition, readingOrder } from '@/lib/grid'
import { cn } from '@/lib/utils'
import {
  deleteSection,
  duplicateSection,
  moveSection,
  renameSection,
  toggleSection,
} from '@/server/actions/pages'
import type { HistoryEntry } from './history'
import type { ActionResult } from '@/server/actions/types'
import type { Section } from '@/server/db/schema'

/**
 * Panneau Calques : l'arborescence complète de la page, façon Figma.
 *
 * Sélection synchronisée avec l'aperçu, plier/déplier, visibilité,
 * renommage au double-clic, duplication et suppression à chaque niveau.
 * Le glisser par la poignée réordonne dans un groupe de frères, ou reparente :
 * lâcher sur la ligne d'un conteneur dépose le bloc DEDANS, lâcher sur toute
 * autre ligne prend sa place dans son groupe.
 */

function labelOf(section: Section): string {
  return (
    section.name ??
    section.navLabel ??
    getBlock(section.type)?.label ??
    section.type
  )
}

/** Enfants dans l'ordre où on les lit — celui du rendu. */
function orderedKids(
  parent: Section,
  childrenOf: Map<string, Section[]>,
): Section[] {
  const kids = childrenOf.get(parent.id) ?? []
  if (getBlock(parent.type)?.freeform) {
    /* Grille : l'ordre des calques suit l'ordre de lecture (ligne, puis
       colonne) — le même que l'empilement mobile. */
    return readingOrder(kids, (k) => parseGridPosition(k.placement))
  }
  return [...kids].sort(
    (a, b) => a.columnIndex - b.columnIndex || a.sortOrder - b.sortOrder,
  )
}

/* ── Aides du glisser-déposer ──────────────────────────────────────────── */

/** Le « groupe » d'un bloc : les frères parmi lesquels `moveSection` opère. */
type Group = { parentId: string | null; columnIndex: number }

function groupOf(section: Section): Group {
  return section.parentId
    ? { parentId: section.parentId, columnIndex: section.columnIndex }
    : { parentId: null, columnIndex: 0 }
}

function sameGroup(a: Group, b: Group): boolean {
  return a.parentId === b.parentId && a.columnIndex === b.columnIndex
}

/**
 * Frères d'un groupe triés par sortOrder — l'ordre sur lequel travaille
 * l'algorithme referme-le-trou-puis-ouvre de `moveSection`. L'index d'une
 * ligne dans cette liste (avant retrait du bloc glissé) est directement la
 * `position` à envoyer, dans les deux sens de déplacement.
 */
function groupMembers(group: Group, sections: Section[]): Section[] {
  return sections
    .filter((s) =>
      group.parentId
        ? s.parentId === group.parentId && s.columnIndex === group.columnIndex
        : !s.parentId,
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

/** Vrai si `section` est `ancestorId` ou se trouve dans son sous-arbre. */
function isInSubtree(
  section: Section,
  ancestorId: string,
  byId: Map<string, Section>,
): boolean {
  let current: Section | undefined = section
  while (current) {
    if (current.id === ancestorId) return true
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return false
}

/**
 * Lâcher `dragged` sur la ligne de `target` doit-il déposer DEDANS ?
 * On applique côté client les mêmes règles que `validateParent` côté serveur
 * (seuls les blocs inline non conteneurs entrent dans un conteneur) : pas
 * pour se substituer à lui, mais pour ne pas afficher un liseré menteur ni
 * payer un aller-retour voué à l'échec.
 */
function canDropInside(
  dragged: Section,
  target: Section,
  byId: Map<string, Section>,
): boolean {
  if (!getBlock(target.type)?.container) return false
  if (dragged.id === target.id) return false
  /* Déjà enfant direct : le lâcher sur le parent retombe sur le cas
     « prendre la place de la ligne », qui sort le bloc du conteneur. */
  if (dragged.parentId === target.id) return false
  const draggedBlock = getBlock(dragged.type)
  if (!draggedBlock?.inline || draggedBlock.container) return false
  /* Un conteneur ne descend jamais dans sa propre descendance. */
  if (isInSubtree(target, dragged.id, byId)) return false
  return true
}

/**
 * Lignes visibles, aplaties dans l'ordre d'affichage : racines par sortOrder,
 * enfants via `orderedKids`, sous-arbres repliés sautés. C'est la liste que
 * `SortableContext` doit connaître — elle doit coller au DOM rendu.
 */
function flattenVisible(
  roots: Section[],
  childrenOf: Map<string, Section[]>,
  collapsed: Set<string>,
): Section[] {
  const out: Section[] = []
  const walk = (section: Section) => {
    out.push(section)
    if (collapsed.has(section.id)) return
    for (const kid of orderedKids(section, childrenOf)) walk(kid)
  }
  for (const root of roots) walk(root)
  return out
}

export function LayersPanel({
  sections,
  selectedId,
  onSelect,
  onChanged,
  pushHistory,
  onDelete,
}: {
  sections: Section[]
  selectedId: string | null
  onSelect: (id: string) => void
  /** Notifie une écriture — le constructeur recharge l'aperçu. */
  onChanged: () => void
  /** Enregistre l'inverse d'une action pour le ⌘Z du constructeur. */
  pushHistory?: (entry: HistoryEntry) => void
  /** Suppression avec instantané, fournie par le constructeur. */
  onDelete?: (id: string) => Promise<ActionResult<unknown>>
}) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [pending, start] = useTransition()

  /* État du glisser en cours — sert uniquement aux retours visuels
     (liseré du conteneur survolé, trait d'insertion). */
  const [drag, setDrag] = useState<{
    activeId: string
    overId: string | null
  } | null>(null)

  /* 6 px de mouvement avant d'armer le glisser : en dessous, le pointeur
     reste un clic — la sélection et le double-clic de renommage survivent. */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const roots = sections
    .filter((s) => !s.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const childrenOf = new Map<string, Section[]>()
  for (const section of sections) {
    if (!section.parentId) continue
    const siblings = childrenOf.get(section.parentId) ?? []
    siblings.push(section)
    childrenOf.set(section.parentId, siblings)
  }

  const byId = new Map(sections.map((s) => [s.id, s]))

  if (roots.length === 0) {
    return (
      <p className="rounded-[5px] border border-dashed border-border px-3 py-6 text-center text-[0.72rem] text-muted-foreground">
        Page vide. Glissez un bloc sur l’aperçu.
      </p>
    )
  }

  const flat = flattenVisible(roots, childrenOf, collapsed)

  const activeSection = drag ? byId.get(drag.activeId) : undefined
  const overSection = drag?.overId ? byId.get(drag.overId) : undefined
  const dropInsideId =
    activeSection && overSection && canDropInside(activeSection, overSection, byId)
      ? overSection.id
      : null

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDrag(null)
    if (!over || active.id === over.id) return

    const dragged = byId.get(String(active.id))
    const target = byId.get(String(over.id))
    if (!dragged || !target) return

    /* Jamais dans sa propre descendance : le serveur le refuserait aussi
       (validateParent), mais autant s'épargner l'aller-retour. */
    if (isInSubtree(target, dragged.id, byId)) return

    /* Capturé AVANT le déplacement — c'est la cible de l'annulation. */
    const prevGroup = groupOf(dragged)
    const prevIndex = groupMembers(prevGroup, sections).findIndex(
      (s) => s.id === dragged.id,
    )
    if (prevIndex < 0) return

    let dest: Group & { position: number }
    if (canDropInside(dragged, target, byId)) {
      /* Sur la ligne d'un conteneur : on dépose DEDANS, en fin de première
         colonne — l'utilisateur affinera ensuite ligne par ligne. */
      const count = (childrenOf.get(target.id) ?? []).filter(
        (k) => k.columnIndex === 0,
      ).length
      dest = { parentId: target.id, columnIndex: 0, position: count }
    } else {
      /* Sinon : prendre la place de la ligne survolée dans SON groupe.
         L'index pré-retrait est la bonne `position` pour moveSection dans
         les deux sens (sémantique arrayMove), y compris entre groupes. */
      const destGroup = groupOf(target)
      const position = groupMembers(destGroup, sections).findIndex(
        (s) => s.id === target.id,
      )
      if (position < 0) return
      dest = { ...destGroup, position }
    }

    /* Cible identique à la position actuelle : rien à écrire. */
    if (sameGroup(dest, prevGroup) && dest.position === prevIndex) return

    /* Dans un canevas, l'affichage (desktop ET empilement mobile) suit la
       position (y, x) des blocs, pas le sortOrder : réordonner sans changer
       de parent n'aurait aucun effet. On explique plutôt que d'écrire. */
    if (sameGroup(dest, prevGroup) && prevGroup.parentId) {
      const parent = byId.get(prevGroup.parentId)
      if (parent && getBlock(parent.type)?.freeform) {
        toast.info('Dans un canevas, l’ordre suit la position des blocs.')
        return
      }
    }

    const id = dragged.id
    start(async () => {
      const result = await moveSection({
        id,
        parentId: dest.parentId,
        columnIndex: dest.columnIndex,
        position: dest.position,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      pushHistory?.({
        label: 'Déplacement',
        undo: async () =>
          (
            await moveSection({
              id,
              parentId: prevGroup.parentId,
              columnIndex: prevGroup.columnIndex,
              position: prevIndex,
            })
          ).ok,
        redo: async () =>
          (
            await moveSection({
              id,
              parentId: dest.parentId,
              columnIndex: dest.columnIndex,
              position: dest.position,
            })
          ).ok,
      })
      onChanged()
      router.refresh()
    })
  }

  const shared: RowShared = {
    childrenOf,
    selectedId,
    collapsed,
    renamingId,
    draft,
    pending,
    activeDragId: drag?.activeId ?? null,
    overId: drag?.overId ?? null,
    dropInsideId,
    onSelect,
    setDraft,
    toggleCollapse: (id) =>
      setCollapsed((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      }),
    startRename: (section) => {
      setRenamingId(section.id)
      setDraft(section.name ?? '')
    },
    cancelRename: () => setRenamingId(null),
    commitRename: (section, value) => {
      setRenamingId(null)
      const prev = section.name ?? ''
      if (value.trim() === prev) return
      start(async () => {
        const result = await renameSection(section.id, value)
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        pushHistory?.({
          label: 'Renommage',
          undo: async () => (await renameSection(section.id, prev)).ok,
          redo: async () => (await renameSection(section.id, value)).ok,
        })
        router.refresh()
      })
    },
    toggleVisible: (section) =>
      start(async () => {
        const wasActive = section.isActive
        const result = await toggleSection(section.id, !wasActive)
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        pushHistory?.({
          label: wasActive ? 'Masquage' : 'Affichage',
          undo: async () => (await toggleSection(section.id, wasActive)).ok,
          redo: async () => (await toggleSection(section.id, !wasActive)).ok,
        })
        onChanged()
        router.refresh()
      }),
    duplicate: (section) =>
      start(async () => {
        const result = await duplicateSection(section.id)
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        /* Rétablir une duplication annulée recrée la copie sous un nouvel
           identifiant — l'annulation suivante doit viser celui-là. */
        let currentId = result.data.id
        pushHistory?.({
          label: 'Duplication',
          undo: async () => (await deleteSection(currentId)).ok,
          redo: async () => {
            const again = await duplicateSection(section.id)
            if (again.ok) currentId = again.data.id
            return again.ok
          },
        })
        onChanged()
        router.refresh()
      }),
    remove: async (section) => {
      /* Le constructeur fournit la version avec instantané ; le repli
         direct ne sert qu'aux usages hors builder. */
      const result = await (onDelete
        ? onDelete(section.id)
        : deleteSection(section.id))
      if (result.ok) {
        onChanged()
        router.refresh()
      }
      return result
    },
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={({ active }: DragStartEvent) =>
        setDrag({ activeId: String(active.id), overId: null })
      }
      onDragOver={({ over }: DragOverEvent) =>
        setDrag((prev) =>
          prev ? { ...prev, overId: over ? String(over.id) : null } : prev,
        )
      }
      onDragCancel={() => setDrag(null)}
      onDragEnd={handleDragEnd}
    >
      {/* Un seul contexte triable pour tout l'arbre : la liste aplatie des
          lignes visibles, dans l'ordre exact du rendu. */}
      <SortableContext
        items={flat.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="space-y-px">
          {roots.map((section) => (
            <LayerRow
              key={section.id}
              section={section}
              depth={0}
              shared={shared}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

/* ── Ligne récursive — hissée au niveau module ──────────────────────────
   Définie DANS le composant parent, elle serait recréée à chaque rendu :
   React la traiterait comme un nouveau type, remonterait tout le sous-arbre
   et l'input de renommage perdrait le focus à chaque frappe. */

type RowShared = {
  childrenOf: Map<string, Section[]>
  selectedId: string | null
  collapsed: Set<string>
  renamingId: string | null
  draft: string
  pending: boolean
  /** Glisser en cours : ligne saisie, ligne survolée, conteneur cible. */
  activeDragId: string | null
  overId: string | null
  dropInsideId: string | null
  onSelect: (id: string) => void
  setDraft: (value: string) => void
  toggleCollapse: (id: string) => void
  startRename: (section: Section) => void
  cancelRename: () => void
  commitRename: (section: Section, value: string) => void
  toggleVisible: (section: Section) => void
  duplicate: (section: Section) => void
  remove: (section: Section) => Promise<ActionResult<unknown>>
}

function LayerRow({
  section,
  depth,
  shared,
}: {
  section: Section
  depth: number
  shared: RowShared
}) {
  /* `useSortable` vit ici, dans un composant — pas dans la boucle du parent.
     Le nœud mesuré est la ligne seule (le div), pas le <li> : sinon le rect
     d'un conteneur déplié engloberait tout son sous-arbre et la détection de
     collision ne saurait plus distinguer « sur le parent » de « sur un
     enfant ». Aucun transform appliqué : dans un arbre imbriqué, les
     translations en cascade parent + enfant brouillent plus qu'elles
     n'aident — l'opacité et les liserés suffisent comme retour. */
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: section.id,
  })

  const kids = orderedKids(section, shared.childrenOf)
  const hasKids = kids.length > 0
  const isCollapsed = shared.collapsed.has(section.id)
  const active = section.id === shared.selectedId
  const renaming = shared.renamingId === section.id

  /* Retours visuels du glisser : liseré = « déposer dedans » (conteneur
     valide), trait supérieur = « prendra la place de cette ligne ». */
  const dropInside = shared.dropInsideId === section.id
  const insertHint =
    !dropInside &&
    shared.overId === section.id &&
    shared.activeDragId !== null &&
    shared.activeDragId !== section.id

  return (
    <li className={cn(isDragging && 'opacity-40')}>
      <div
        ref={setNodeRef}
        className={cn(
          'group flex items-center gap-1 rounded-[5px] pr-1 transition-colors duration-150',
          active ? 'bg-secondary' : 'hover:bg-secondary/50',
          !section.isActive && 'opacity-50',
          dropInside && 'ring-1 ring-[#46728a]/60',
          insertHint && 'shadow-[inset_0_2px_0_0_rgba(70,114,138,0.6)]',
        )}
        style={{ paddingLeft: depth * 14 }}
      >
        {/* Poignée dédiée : le glisser ne vole ni le clic de sélection ni le
            double-clic de renommage portés par le libellé. */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Déplacer « ${labelOf(section)} »`}
          className="flex h-5 w-3.5 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground/50 opacity-0 hover:text-foreground focus-visible:opacity-100 active:cursor-grabbing group-hover:opacity-100"
        >
          <GripVertical className="h-3 w-3" />
        </button>

        {hasKids ? (
          <button
            type="button"
            aria-label={isCollapsed ? 'Déplier' : 'Replier'}
            aria-expanded={!isCollapsed}
            onClick={() => shared.toggleCollapse(section.id)}
            className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground/60 hover:text-foreground"
          >
            <ChevronRight
              className={cn(
                'h-3 w-3 transition-transform duration-150',
                !isCollapsed && 'rotate-90',
              )}
            />
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" />
        )}

        {!section.parentId && (
          <Swatch
            color={section.backgroundColor}
            className="h-2.5 w-2.5 shrink-0"
          />
        )}

        {renaming ? (
          <input
            autoFocus
            value={shared.draft}
            onChange={(e) => shared.setDraft(e.target.value)}
            onBlur={() => shared.commitRename(section, shared.draft)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') shared.commitRename(section, shared.draft)
              if (e.key === 'Escape') shared.cancelRename()
            }}
            className="min-w-0 flex-1 rounded-[3px] border border-ring bg-card px-1 py-0.5 text-[0.76rem] outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => shared.onSelect(section.id)}
            onDoubleClick={() => shared.startRename(section)}
            title="Double-clic pour renommer"
            className="min-w-0 flex-1 py-1 text-left"
          >
            <span
              className={cn(
                'block truncate text-[0.76rem]',
                active
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {labelOf(section)}
            </span>
          </button>
        )}

        {/* Actions au survol — masquées au repos pour garder l'arbre lisible. */}
        <span className="flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            disabled={shared.pending}
            aria-label={section.isActive ? 'Masquer' : 'Afficher'}
            className="h-5 w-5"
            onClick={() => shared.toggleVisible(section)}
          >
            {section.isActive ? <Eye /> : <EyeOff />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            disabled={shared.pending}
            aria-label="Dupliquer"
            className="h-5 w-5"
            onClick={() => shared.duplicate(section)}
          >
            <Copy />
          </Button>

          <ConfirmDelete
            label={labelOf(section)}
            description="Le bloc et tout ce qu'il contient seront définitivement supprimés."
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Supprimer"
                className="h-5 w-5 text-destructive"
              >
                ✕
              </Button>
            }
            onConfirm={() => shared.remove(section)}
          />
        </span>
      </div>

      {hasKids && !isCollapsed && (
        <ul>
          {kids.map((kid) => (
            <LayerRow
              key={kid.id}
              section={kid}
              depth={depth + 1}
              shared={shared}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
