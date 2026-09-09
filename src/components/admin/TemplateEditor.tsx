'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Monitor,
  Pencil,
  Plus,
  Redo2,
  Smartphone,
  Tablet,
  Trash2,
  Undo2,
  UploadCloud,
} from 'lucide-react'
import { toast } from 'sonner'

import type { HistoryEntry } from './history'
import { LayersPanel } from './LayersPanel'
import { SectionInspector, type SectionDraft } from './SectionInspector'
import { TemplateLibrary } from './TemplateLibrary'
import { getBlock } from '@/blocks/registry'
import { GRID_VIEWPORTS, type Breakpoint } from '@/lib/grid'
import { identityCss } from '@/lib/identity'
import { hasUnpublishedChanges } from '@/lib/publish'
import { cn } from '@/lib/utils'
import {
  deleteSavedSection,
  deleteSection,
  duplicateSection,
  insertSavedSection,
  insertSection,
  moveSection,
  publishPage,
  restoreSections,
  toggleSection,
  updateTextField,
} from '@/server/actions/pages'
import type { SavedSection, Section } from '@/server/db/schema'
import { MotionProvider } from '@/components/motion/MotionProvider'
import {
  SectionsView,
  type SectionsViewData,
} from '@/components/site/SectionsView'

/**
 * L'éditeur de page du CMS — la philosophie « modèle → contenu ».
 *
 * À gauche, l'arborescence des sections de la page. Au centre, la vraie
 * page. À droite, le formulaire de la section sélectionnée, en
 * enregistrement automatique : on choisit un beau design, on remplit ses
 * informations — jamais de grille, de coordonnées ni de CSS.
 */
export function TemplateEditor({
  pageId,
  pageTitle,
  publishedSnapshot,
  publishedAt,
  initialSections,
  data,
  saved,
}: {
  pageId: string
  pageTitle: string
  /** Instantané servi au public — sert au badge « non publié ». */
  publishedSnapshot: unknown
  publishedAt: Date | null
  initialSections: Section[]
  data: SectionsViewData
  /** Modèles personnels (« Mes sections »). */
  saved: SavedSection[]
}) {
  const router = useRouter()

  const [sections, setSections] = useState(initialSections)
  useEffect(() => setSections(initialSections), [initialSections])

  const [viewport, setViewport] = useState<Breakpoint>('desktop')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)

  const stageRef = useRef<HTMLDivElement>(null)
  const paneRef = useRef<HTMLDivElement>(null)
  const [paneWidth, setPaneWidth] = useState(1280)
  const [stageHeight, setStageHeight] = useState(800)
  const [selectionRect, setSelectionRect] = useState<{
    top: number
    height: number
  } | null>(null)

  /** Rects (non mis à l'échelle) de chaque section racine, ordre visuel. */
  const [sectionRects, setSectionRects] = useState<
    { id: string; top: number; height: number }[]
  >([])
  const [hoverId, setHoverId] = useState<string | null>(null)
  /** Glisser vertical d'une section : index de départ + frontière visée. */
  const [sectionDrag, setSectionDrag] = useState<{
    id: string
    from: number
    boundary: number
  } | null>(null)
  /** Insertion depuis un « + » entre deux sections. */
  const insertIndexRef = useRef<number | null>(null)
  /** Suppression en deux temps : premier clic arme, second confirme. */
  const [armedDelete, setArmedDelete] = useState<string | null>(null)

  const vw = GRID_VIEWPORTS[viewport]
  const scale = Math.min(1, (paneWidth - 48) / vw)
  const editing = mode === 'edit'

  const byId = useMemo(
    () => new Map(sections.map((s) => [s.id, s])),
    [sections],
  )
  const selected = selectedId ? (byId.get(selectedId) ?? null) : null

  /** Sections racine dans l'ordre de la page. */
  const roots = useMemo(
    () =>
      sections
        .filter((s) => !s.parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [sections],
  )

  /* ── Historique (⌘Z / ⌘⇧Z) ───────────────────────────────────────── */

  const undoStack = useRef<HistoryEntry[]>([])
  const redoStack = useRef<HistoryEntry[]>([])
  const historyLock = useRef(false)
  const [, bump] = useState(0)

  const pushHistory = useCallback((entry: HistoryEntry) => {
    undoStack.current.push(entry)
    if (undoStack.current.length > 50) undoStack.current.shift()
    redoStack.current = []
    bump((t) => t + 1)
  }, [])

  const runHistory = useCallback(
    async (direction: 'undo' | 'redo') => {
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
        bump((t) => t + 1)
        router.refresh()
      }
    },
    [router],
  )

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
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [runHistory])

  /* ── Mesures : échelle + cadre de sélection ──────────────────────── */

  useLayoutEffect(() => {
    const pane = paneRef.current
    if (!pane) return
    const ro = new ResizeObserver(() => setPaneWidth(pane.clientWidth))
    ro.observe(pane)
    setPaneWidth(pane.clientWidth)
    return () => ro.disconnect()
  }, [])

  const remeasure = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    setStageHeight(stage.offsetHeight)

    const stageBox = stage.getBoundingClientRect()
    const rects = Array.from(
      stage.querySelectorAll<HTMLElement>('[data-block-root]'),
    )
      .map((el) => {
        const r = el.getBoundingClientRect()
        return {
          id: el.dataset.blockId ?? '',
          top: (r.top - stageBox.top) / scale,
          height: r.height / scale,
        }
      })
      .sort((a, b) => a.top - b.top)
    setSectionRects(rects)

    if (selectedId) {
      const el = stage.querySelector<HTMLElement>(
        `[data-block-id="${selectedId}"]`,
      )
      if (el) {
        const stageRect = stage.getBoundingClientRect()
        const r = el.getBoundingClientRect()
        setSelectionRect({
          top: (r.top - stageRect.top) / scale,
          height: r.height / scale,
        })
        return
      }
    }
    setSelectionRect(null)
  }, [scale, selectedId])

  useLayoutEffect(() => {
    remeasure()
    const stage = stageRef.current
    if (!stage) return
    const ro = new ResizeObserver(() => remeasure())
    ro.observe(stage)
    return () => ro.disconnect()
  }, [remeasure, sections, viewport, mode])

  /* ── Brouillon de l'inspecteur → rendu immédiat ──────────────────── */

  const applyDraft = useCallback((id: string, draft: SectionDraft) => {
    setSections((prev) =>
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
  }, [])

  /* ── Suppression annulable ───────────────────────────────────────── */

  const deleteWithHistory = useCallback(
    async (id: string) => {
      const row = byId.get(id)
      const result = await deleteSection(id)
      if (result.ok && row) {
        const snapshot = [
          {
            id: row.id,
            pageId: row.pageId,
            parentId: row.parentId,
            columnIndex: row.columnIndex,
            sortOrder: row.sortOrder,
            type: row.type,
            name: row.name,
            anchor: row.anchor,
            navLabel: row.navLabel,
            showInNav: row.showInNav,
            isActive: row.isActive,
            backgroundColor: row.backgroundColor,
            payload: row.payload,
            styles: row.styles,
            placement: row.placement,
          },
        ]
        setSections((prev) => prev.filter((s) => s.id !== id))
        setSelectedId((cur) => (cur === id ? null : cur))
        pushHistory({
          label: 'Suppression',
          undo: async () => (await restoreSections(snapshot)).ok,
          redo: async () => (await deleteSection(id)).ok,
        })
      }
      return result
    },
    [byId, pushHistory],
  )

  /* ── Ajout depuis la bibliothèque, à une position précise ────────── */

  const addSection = useCallback(
    async (type: string, label: string) => {
      const index = insertIndexRef.current ?? roots.length
      insertIndexRef.current = null

      const result = await insertSection({ pageId, type, position: index })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      let currentId = result.data.id

      const block = getBlock(type)
      if (block) {
        const now = new Date()
        setSections((prev) => [
          ...prev.map((s) =>
            !s.parentId && s.sortOrder >= index
              ? { ...s, sortOrder: s.sortOrder + 1 }
              : s,
          ),
          {
            id: currentId,
            pageId,
            parentId: null,
            columnIndex: 0,
            placement: null,
            styles: null,
            settings: null,
            name: null,
            type,
            anchor: block.suggestedAnchor || null,
            navLabel: block.navigable ? block.label : null,
            showInNav: block.navigable ?? false,
            sortOrder: index,
            isActive: true,
            backgroundColor: '#fcfaf7',
            payload: block.schema.parse(block.defaults),
            createdAt: now,
            updatedAt: now,
          } as Section,
        ])
      }

      setSelectedId(currentId)
      router.refresh()
      pushHistory({
        label: `Section — ${label}`,
        undo: async () => (await deleteSection(currentId)).ok,
        redo: async () => {
          const again = await insertSection({ pageId, type, position: index })
          if (again.ok) currentId = again.data.id
          return again.ok
        },
      })

      requestAnimationFrame(() => {
        stageRef.current
          ?.querySelector(`[data-block-id="${currentId}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    },
    [pageId, pushHistory, roots.length, router],
  )

  /* ── Modèles personnels ──────────────────────────────────────────── */

  const addSaved = useCallback(
    async (model: SavedSection) => {
      const index = insertIndexRef.current ?? roots.length
      insertIndexRef.current = null

      const result = await insertSavedSection({
        pageId,
        savedId: model.id,
        position: index,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      let currentId = result.data.id

      const block = getBlock(model.type)
      if (block) {
        const now = new Date()
        setSections((prev) => [
          ...prev.map((s) =>
            !s.parentId && s.sortOrder >= index
              ? { ...s, sortOrder: s.sortOrder + 1 }
              : s,
          ),
          {
            id: currentId,
            pageId,
            parentId: null,
            columnIndex: 0,
            placement: null,
            styles: null,
            settings: model.settings,
            name: model.name,
            type: model.type,
            anchor: null,
            navLabel: null,
            showInNav: false,
            sortOrder: index,
            isActive: true,
            backgroundColor: model.backgroundColor,
            payload: model.payload,
            createdAt: now,
            updatedAt: now,
          } as Section,
        ])
      }

      setSelectedId(currentId)
      router.refresh()
      pushHistory({
        label: `Modèle — ${model.name}`,
        undo: async () => (await deleteSection(currentId)).ok,
        redo: async () => {
          const again = await insertSavedSection({
            pageId,
            savedId: model.id,
            position: index,
          })
          if (again.ok) currentId = again.data.id
          return again.ok
        },
      })

      requestAnimationFrame(() => {
        stageRef.current
          ?.querySelector(`[data-block-id="${currentId}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    },
    [pageId, pushHistory, roots.length, router],
  )

  const removeSaved = useCallback(
    async (id: string) => {
      const result = await deleteSavedSection(id)
      if (!result.ok) toast.error(result.error)
      router.refresh()
    },
    [router],
  )

  /* ── Actions de la barre de survol ───────────────────────────────── */

  const reorderTo = useCallback(
    async (id: string, from: number, boundary: number) => {
      /* Frontière → index cible façon arrayMove : au-delà de sa propre
         position, l'élément retiré décale les indices d'un cran. */
      const to = boundary > from ? boundary - 1 : boundary
      if (to === from) return

      /* Optimiste : réécrit les sortOrder locaux dans le nouvel ordre. */
      const orderedIds = roots.map((r) => r.id)
      orderedIds.splice(from, 1)
      orderedIds.splice(to, 0, id)
      setSections((prev) =>
        prev.map((s) => {
          const idx = orderedIds.indexOf(s.id)
          return idx >= 0 ? { ...s, sortOrder: idx } : s
        }),
      )

      const result = await moveSection({ id, position: to })
      if (!result.ok) {
        toast.error(result.error)
        router.refresh()
        return
      }
      pushHistory({
        label: 'Réorganisation',
        undo: async () => (await moveSection({ id, position: from })).ok,
        redo: async () => (await moveSection({ id, position: to })).ok,
      })
      router.refresh()
    },
    [pushHistory, roots, router],
  )

  const toggleWithHistory = useCallback(
    async (section: Section) => {
      const next = !section.isActive
      setSections((prev) =>
        prev.map((s) => (s.id === section.id ? { ...s, isActive: next } : s)),
      )
      const result = await toggleSection(section.id, next)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      pushHistory({
        label: next ? 'Section affichée' : 'Section masquée',
        undo: async () => (await toggleSection(section.id, !next)).ok,
        redo: async () => (await toggleSection(section.id, next)).ok,
      })
      router.refresh()
    },
    [pushHistory, router],
  )

  const duplicateWithHistory = useCallback(
    async (section: Section) => {
      const result = await duplicateSection(section.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      let currentId = result.data.id
      toast.success('Copie créée — masquée, juste en dessous.')
      setSelectedId(currentId)
      router.refresh()
      pushHistory({
        label: 'Duplication',
        undo: async () => (await deleteSection(currentId)).ok,
        redo: async () => {
          const again = await duplicateSection(section.id)
          if (again.ok) currentId = again.data.id
          return again.ok
        },
      })
    },
    [pushHistory, router],
  )

  /* ── Sélection et édition en place ───────────────────────────────── */

  const onStageClick = useCallback(
    (e: React.MouseEvent) => {
      if (!editing) return
      const target = e.target as HTMLElement
      if (target.closest('a')) e.preventDefault()
      if (target.isContentEditable) return
      const root = target.closest<HTMLElement>('[data-block-root]')
      setSelectedId(root?.dataset.blockId ?? null)
    },
    [editing],
  )

  const onStageDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!editing) return
      const target = e.target as HTMLElement
      const editEl = target.closest<HTMLElement>('[data-edit-field]')
      const blockEl = editEl?.closest<HTMLElement>('[data-block-id]')
      if (!editEl || !blockEl) return

      const blockId = blockEl.dataset.blockId ?? ''
      const fieldName = editEl.dataset.editField ?? ''
      const multiline = editEl.dataset.editMultiline === 'true'
      const section = byId.get(blockId)
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
        const value = editEl.textContent ?? ''
        if (!commit || value === original) {
          editEl.innerHTML = originalHtml
          return
        }
        setSections((prev) =>
          prev.map((s) =>
            s.id === blockId
              ? { ...s, payload: { ...payload, [fieldName]: value } }
              : s,
          ),
        )
        void updateTextField(blockId, fieldName, value).then((r) => {
          if (!r.ok) toast.error(r.error)
          else router.refresh()
        })
        pushHistory({
          label: 'Texte',
          undo: async () =>
            (await updateTextField(blockId, fieldName, original)).ok,
          redo: async () => (await updateTextField(blockId, fieldName, value)).ok,
        })
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

      const range = document.createRange()
      range.selectNodeContents(editEl)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    },
    [byId, editing, pushHistory, router],
  )

  /* ── Survol et glisser vertical sur le canvas ────────────────────── */

  const onPaneMove = useCallback(
    (e: React.PointerEvent) => {
      if (!editing || sectionDrag) return
      const stage = stageRef.current
      if (!stage) return
      const box = stage.getBoundingClientRect()
      if (e.clientX < box.left || e.clientX > box.right) {
        setHoverId(null)
        return
      }
      const y = (e.clientY - box.top) / scale
      const found = sectionRects.find(
        (r) => y >= r.top && y <= r.top + r.height,
      )
      setHoverId((cur) => ((found?.id ?? null) === cur ? cur : (found?.id ?? null)))
    },
    [editing, scale, sectionDrag, sectionRects],
  )

  const beginSectionDrag = useCallback(
    (e: React.PointerEvent, id: string) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      const from = roots.findIndex((r) => r.id === id)
      const stage = stageRef.current
      if (from < 0 || !stage) return

      const compute = (clientY: number) => {
        const box = stage.getBoundingClientRect()
        const y = (clientY - box.top) / scale
        let boundary = 0
        for (const r of sectionRects) if (y > r.top + r.height / 2) boundary++
        return boundary
      }

      setSectionDrag({ id, from, boundary: compute(e.clientY) })
      const onMove = (ev: PointerEvent) =>
        setSectionDrag({ id, from, boundary: compute(ev.clientY) })
      const onUp = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', onMove)
        const boundary = compute(ev.clientY)
        setSectionDrag(null)
        void reorderTo(id, from, boundary)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp, { once: true })
    },
    [reorderTo, roots, scale, sectionRects],
  )

  /* La corbeille armée se désarme toute seule. */
  useEffect(() => {
    if (!armedDelete) return
    const timer = setTimeout(() => setArmedDelete(null), 2500)
    return () => clearTimeout(timer)
  }, [armedDelete])

  /* ── Publication ─────────────────────────────────────────────────── */

  const [publishing, setPublishing] = useState(false)
  const dirty = hasUnpublishedChanges(sections, publishedSnapshot)

  const publish = useCallback(async () => {
    setPublishing(true)
    const result = await publishPage(pageId)
    setPublishing(false)
    if (result.ok) {
      toast.success('Page publiée — le site est à jour.')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }, [pageId, router])

  /* ── Rendu ───────────────────────────────────────────────────────── */

  const VIEWPORT_ICONS = [
    { bp: 'desktop' as const, icon: Monitor, label: 'Ordinateur' },
    { bp: 'tablet' as const, icon: Tablet, label: 'Tablette' },
    { bp: 'mobile' as const, icon: Smartphone, label: 'Mobile' },
  ]

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      {/* ── Barre supérieure ─────────────────────────────────────── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-[#fcfaf7] px-3">
        <div className="flex items-center gap-2">
          <h1 className="max-w-56 truncate font-serif text-[0.92rem]">
            {pageTitle}
          </h1>

          <span
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.65rem] font-medium',
              !publishedAt
                ? 'bg-muted text-muted-foreground'
                : dirty
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                !publishedAt
                  ? 'bg-muted-foreground'
                  : dirty
                    ? 'bg-amber-500'
                    : 'bg-emerald-500',
              )}
            />
            {!publishedAt
              ? 'Jamais publiée'
              : dirty
                ? 'Modifications non publiées'
                : 'Publiée'}
          </span>

          <span className="h-4 w-px bg-border" />

          <button
            type="button"
            onClick={() => void runHistory('undo')}
            disabled={undoStack.current.length === 0}
            title="Annuler (⌘Z)"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void runHistory('redo')}
            disabled={redoStack.current.length === 0}
            title="Rétablir (⌘⇧Z)"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
          {VIEWPORT_ICONS.map(({ bp, icon: Icon, label }) => (
            <button
              key={bp}
              type="button"
              title={label}
              onClick={() => setViewport(bp)}
              className={cn(
                'rounded-md px-2.5 py-1 transition-colors',
                viewport === bp
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === 'edit' ? 'preview' : 'edit'))
              setSelectedId(null)
            }}
            className={cn(
              'flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[0.78rem] transition-colors',
              mode === 'preview'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {mode === 'edit' ? (
              <>
                <Eye className="h-3.5 w-3.5" /> Aperçu
              </>
            ) : (
              <>
                <Pencil className="h-3.5 w-3.5" /> Éditer
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => void publish()}
            disabled={publishing || (!dirty && publishedAt !== null)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1 text-[0.78rem] font-medium transition-opacity',
              dirty || !publishedAt
                ? 'bg-foreground text-background hover:opacity-90'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <UploadCloud className="h-3.5 w-3.5" />
            {publishing ? 'Publication…' : 'Publier'}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── Sections de la page ──────────────────────────────────── */}
        {editing && (
          <aside className="flex w-60 shrink-0 flex-col border-r border-border">
            <div className="shrink-0 border-b border-border p-2.5">
              <button
                type="button"
                onClick={() => {
                  insertIndexRef.current = null
                  setLibraryOpen(true)
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-foreground py-2 text-[0.78rem] text-background transition-opacity hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter une section
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
              <LayersPanel
                sections={sections}
                selectedId={selectedId}
                onSelect={(id) => {
                  setSelectedId(id)
                  stageRef.current
                    ?.querySelector(`[data-block-id="${id}"]`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}
                onChanged={() => router.refresh()}
                pushHistory={pushHistory}
                onDelete={deleteWithHistory}
              />
            </div>
          </aside>
        )}

        {/* ── La page ──────────────────────────────────────────────── */}
        <div
          ref={paneRef}
          onPointerMove={onPaneMove}
          onPointerLeave={() => setHoverId(null)}
          className="min-h-0 min-w-0 flex-1 overflow-auto bg-[#efece6] py-6"
        >
          <div
            className="relative mx-auto"
            style={{ width: vw * scale, height: stageHeight * scale }}
          >
            <div
              ref={stageRef}
              onClickCapture={onStageClick}
              onDoubleClick={onStageDoubleClick}
              className="origin-top-left bg-white shadow-[0_1px_8px_rgba(20,20,19,0.08)]"
              style={{ width: vw, transform: `scale(${scale})` }}
            >
              {/* L'identité globale s'applique aussi dans l'éditeur : ce
                  que l'admin règle dans « Identité du site » se voit ici. */}
              {identityCss(data.settings.identity) && (
                <style
                  dangerouslySetInnerHTML={{
                    __html: identityCss(data.settings.identity),
                  }}
                />
              )}
              <MotionProvider>
                <SectionsView
                  key={`${viewport}-${mode}`}
                  sections={sections}
                  data={data}
                  editable={editing}
                  breakpoint={viewport}
                />
              </MotionProvider>
            </div>

            {/* Cadre de la section sélectionnée */}
            {editing && selectionRect && (
              <div
                className="pointer-events-none absolute inset-x-0 ring-[1.5px] ring-inset ring-sky-500/70"
                style={{
                  top: selectionRect.top * scale,
                  height: selectionRect.height * scale,
                }}
              />
            )}

            {/* ── Contrôles au survol de chaque section ─────────────── */}
            {editing && (
              <div className="pointer-events-none absolute inset-0">
                {sectionRects.map((r, i) => {
                  const section = byId.get(r.id)
                  if (!section) return null
                  const active =
                    !sectionDrag && (hoverId === r.id || selectedId === r.id)
                  const dragged = sectionDrag?.id === r.id

                  return (
                    <div
                      key={r.id}
                      className="absolute inset-x-0"
                      style={{ top: r.top * scale, height: r.height * scale }}
                    >
                      {dragged && (
                        <div className="absolute inset-0 bg-sky-500/[0.06] ring-1 ring-inset ring-sky-400/50" />
                      )}

                      {active && (
                        <>
                          {/* Étiquette de la section */}
                          <div className="absolute left-2 top-2 rounded-[4px] bg-neutral-900/80 px-2 py-0.5 text-[0.65rem] font-medium text-white backdrop-blur-sm">
                            {String(i + 1).padStart(2, '0')} ·{' '}
                            {section.name ??
                              getBlock(section.type)?.label ??
                              section.type}
                            {!section.isActive && ' — masquée'}
                          </div>

                          {/* Barre d'actions */}
                          <div className="pointer-events-auto absolute right-2 top-2 flex items-center gap-0.5 rounded-md border border-border bg-white/95 p-0.5 shadow-sm backdrop-blur-sm">
                            <button
                              type="button"
                              title="Déplacer — glissez verticalement"
                              onPointerDown={(e) => beginSectionDrag(e, r.id)}
                              className="cursor-grab rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 active:cursor-grabbing"
                            >
                              <GripVertical className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title={section.isActive ? 'Masquer' : 'Afficher'}
                              onClick={() => void toggleWithHistory(section)}
                              className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                            >
                              {section.isActive ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              title="Dupliquer"
                              onClick={() => void duplicateWithHistory(section)}
                              className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title={
                                armedDelete === r.id
                                  ? 'Cliquez pour confirmer'
                                  : 'Supprimer'
                              }
                              onClick={() => {
                                if (armedDelete === r.id) {
                                  setArmedDelete(null)
                                  void deleteWithHistory(r.id).then((res) => {
                                    if (res.ok) router.refresh()
                                  })
                                } else {
                                  setArmedDelete(r.id)
                                }
                              }}
                              className={cn(
                                'rounded p-1.5 transition-colors',
                                armedDelete === r.id
                                  ? 'bg-red-600 text-white'
                                  : 'text-neutral-400 hover:bg-red-50 hover:text-red-600',
                              )}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* « + » aux deux frontières de la section */}
                          {[i, i + 1].map((index, pos) => (
                            <button
                              key={index}
                              type="button"
                              title="Insérer une section ici"
                              onClick={() => {
                                insertIndexRef.current = index
                                setLibraryOpen(true)
                              }}
                              className={cn(
                                'pointer-events-auto absolute left-1/2 z-10 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full bg-foreground text-background shadow-md transition-transform hover:scale-110',
                                pos === 0
                                  ? 'top-0 -translate-y-1/2'
                                  : 'bottom-0 translate-y-1/2',
                              )}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )
                })}

                {/* Ligne d'insertion pendant le glisser */}
                {sectionDrag &&
                  (() => {
                    const b = sectionDrag.boundary
                    const last = sectionRects[sectionRects.length - 1]
                    const y =
                      b < sectionRects.length
                        ? (sectionRects[b]?.top ?? 0)
                        : last
                          ? last.top + last.height
                          : 0
                    return (
                      <div
                        className="absolute inset-x-3 h-[3px] rounded-full bg-sky-500 shadow-[0_0_0_3px_rgba(14,165,233,0.2)]"
                        style={{ top: y * scale - 1.5 }}
                      />
                    )
                  })()}
              </div>
            )}
          </div>
        </div>

        {/* ── Contenu de la section ────────────────────────────────── */}
        {editing && (
          <aside className="w-[19.5rem] shrink-0 overflow-y-auto border-l border-border">
            {selected ? (
              <SectionInspector
                key={selected.id}
                section={selected}
                library={data.media}
                onClose={() => setSelectedId(null)}
                onMutated={() => router.refresh()}
                pushHistory={pushHistory}
                onDelete={deleteWithHistory}
                onDraft={applyDraft}
                simple
              />
            ) : (
              <div className="p-5 text-[0.78rem] leading-relaxed text-muted-foreground">
                <p className="mb-2 font-medium text-foreground">
                  Rien de sélectionné
                </p>
                <p>
                  Cliquez sur une section de la page (ou dans la liste de
                  gauche) pour modifier son contenu.
                </p>
                <p className="mt-3">
                  « Ajouter une section » ouvre la bibliothèque de modèles :
                  choisissez un design, remplissez vos informations — la mise
                  en page est déjà faite.
                </p>
              </div>
            )}
          </aside>
        )}
      </div>

      <TemplateLibrary
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        data={data}
        saved={saved}
        onPick={addSection}
        onPickSaved={addSaved}
        onDeleteSaved={removeSaved}
      />
    </div>
  )
}
