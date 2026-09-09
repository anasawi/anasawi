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
  Eye,
  Monitor,
  Pencil,
  Plus,
  Redo2,
  Smartphone,
  Tablet,
  Undo2,
} from 'lucide-react'
import { toast } from 'sonner'

import type { HistoryEntry } from './history'
import { SectionInspector, type SectionDraft } from './SectionInspector'
import { SectionRail } from './SectionRail'
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
import { AnimProvider } from '@/components/site/anim'
import {
  SectionsView,
  type SectionsViewData,
} from '@/components/site/SectionsView'

/** Une page du site, pour le menu déroulant de la barre du haut. */
export type EditorPage = {
  id: string
  title: string
  isHome: boolean
  published: boolean
}

/**
 * L'éditeur de page du CMS — la philosophie « modèle → contenu ».
 *
 * À gauche, la liste des sections de la page. Au centre, la vraie page.
 * À droite, le formulaire de la section sélectionnée, en enregistrement
 * automatique : on choisit un beau design, on remplit ses informations —
 * jamais de grille, de coordonnées ni de CSS.
 */
export function TemplateEditor({
  pageId,
  pageTitle,
  publishedSnapshot,
  publishedAt,
  initialSections,
  data,
  saved,
  pages,
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
  /** Toutes les pages du site — le menu de la barre du haut. */
  pages: EditorPage[]
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
  /** Insertion depuis un « + » entre deux sections. */
  const insertIndexRef = useRef<number | null>(null)

  /** État d'écriture du panneau — l'indicateur « Enregistré » du haut. */
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving'>(
    'saved',
  )

  const vw = GRID_VIEWPORTS[viewport]
  const scale = Math.min(1, (paneWidth - 48) / vw)
  const editing = mode === 'edit'

  const byId = useMemo(
    () => new Map(sections.map((s) => [s.id, s])),
    [sections],
  )
  const selected = selectedId ? (byId.get(selectedId) ?? null) : null

  /* Panneau fermé : plus d'écriture en cours à afficher. */
  useEffect(() => {
    if (!selected) setSaveState('saved')
  }, [selected])

  /** Sections racine dans l'ordre de la page. */
  const roots = useMemo(
    () =>
      sections
        .filter((s) => !s.parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [sections],
  )

  /* ── Menu des pages (chip de la barre du haut) ───────────────────── */

  const [pageMenuOpen, setPageMenuOpen] = useState(false)
  const pageMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pageMenuOpen) return
    const onDown = (e: PointerEvent) => {
      if (!pageMenuRef.current?.contains(e.target as Node)) {
        setPageMenuOpen(false)
      }
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [pageMenuOpen])

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

  /* ── Réordonner, masquer, dupliquer ──────────────────────────────── */

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

  /* ── Survol du canvas ────────────────────────────────────────────── */

  const onPaneMove = useCallback(
    (e: React.PointerEvent) => {
      if (!editing) return
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
    [editing, scale, sectionRects],
  )

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
      <header className="flex h-[54px] shrink-0 items-center gap-3.5 border-b border-border bg-ivory px-[18px]">
        {/* Chip de la page — ouvre le menu des pages du site. */}
        <div ref={pageMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setPageMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={pageMenuOpen}
            className="flex items-center gap-2 rounded-lg px-2.5 py-[5px] transition-colors hover:bg-white/90"
          >
            <span className="max-w-56 truncate font-serif text-[15px]">
              {pageTitle}
            </span>
            <span aria-hidden="true" className="text-[10px] text-muted-foreground">
              ▼
            </span>
          </button>

          {pageMenuOpen && (
            <div
              role="menu"
              className="absolute left-0 top-[calc(100%+6px)] z-40 w-60 rounded-[10px] border border-border bg-white p-1.5 shadow-[0_10px_30px_rgba(28,32,30,0.14)]"
            >
              {pages.map((page) => {
                const current = page.id === pageId
                return (
                  <button
                    key={page.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setPageMenuOpen(false)
                      if (!current) {
                        router.push(
                          page.isHome
                            ? '/admin/accueil'
                            : `/admin/pages/${page.id}`,
                        )
                      }
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-[7px] text-left text-[12.5px] transition-colors',
                      current
                        ? 'bg-blue-mist/60 text-foreground'
                        : 'text-ink-soft hover:bg-blue-mist/40 hover:text-foreground',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      title={page.published ? 'Publiée' : 'Brouillon'}
                      className={cn(
                        'h-[6px] w-[6px] shrink-0 rounded-full',
                        page.published
                          ? 'bg-[#3e9e6f]'
                          : 'bg-muted-foreground/40',
                      )}
                    />
                    <span className="truncate">{page.title}</span>
                  </button>
                )
              })}
              <div className="mx-1 my-1 border-t border-border" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setPageMenuOpen(false)
                  router.push('/admin/pages')
                }}
                className="w-full rounded-[7px] px-2.5 py-[7px] text-left text-[12.5px] text-muted-foreground transition-colors hover:bg-blue-mist/40 hover:text-foreground"
              >
                Gérer les pages…
              </button>
            </div>
          )}
        </div>

        {/* État de publication — rien à dire quand tout est publié. */}
        {!publishedAt ? (
          <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11.5px] text-muted-foreground">
            <span className="h-[6px] w-[6px] rounded-full bg-muted-foreground/50" />
            Jamais publiée
          </span>
        ) : dirty ? (
          <span className="flex items-center gap-1.5 rounded-full bg-[#fdf4e4] px-2.5 py-1 text-[11.5px] text-[#8a5f1e]">
            <span className="h-[6px] w-[6px] rounded-full bg-[#c98a2d]" />
            Modifications non publiées
          </span>
        ) : null}

        {/* Enregistrement automatique — permanent et discret. */}
        <span
          className="flex items-center gap-1.5 text-[12px] text-stone"
          aria-live="polite"
        >
          <span
            className={cn(
              'h-[6px] w-[6px] rounded-full',
              saveState === 'saved' ? 'bg-[#3e9e6f]' : 'bg-muted-foreground/50',
            )}
          />
          {saveState === 'saved' ? 'Enregistré' : 'Enregistrement…'}
        </span>

        <div className="flex-1" />

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => void runHistory('undo')}
            disabled={undoStack.current.length === 0}
            title="Annuler (⌘Z)"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/90 hover:text-foreground disabled:opacity-30"
          >
            <Undo2 className="h-4 w-4" strokeWidth={1.6} />
          </button>
          <button
            type="button"
            onClick={() => void runHistory('redo')}
            disabled={redoStack.current.length === 0}
            title="Rétablir (⌘⇧Z)"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/90 hover:text-foreground disabled:opacity-30"
          >
            <Redo2 className="h-4 w-4" strokeWidth={1.6} />
          </button>
        </div>

        <div className="flex items-center gap-px rounded-[9px] border border-foreground/15 p-[2px]">
          {VIEWPORT_ICONS.map(({ bp, icon: Icon, label }) => (
            <button
              key={bp}
              type="button"
              title={label}
              onClick={() => setViewport(bp)}
              className={cn(
                'flex h-[26px] w-8 items-center justify-center rounded-[7px] transition-colors',
                viewport === bp
                  ? 'bg-foreground text-ivory'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.6} />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === 'edit' ? 'preview' : 'edit'))
            setSelectedId(null)
          }}
          className="flex items-center gap-1.5 rounded-lg border border-foreground/15 px-3 py-[6px] text-[12.5px] text-ink-soft transition-colors hover:border-foreground hover:text-foreground"
        >
          {mode === 'edit' ? (
            <>
              <Eye className="h-3.5 w-3.5" strokeWidth={1.6} /> Aperçu
            </>
          ) : (
            <>
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} /> Éditer
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => void publish()}
          disabled={publishing || (!dirty && publishedAt !== null)}
          className={cn(
            'rounded-lg px-4 py-[7px] text-[12.5px] font-medium transition-all',
            dirty || !publishedAt
              ? 'bg-blue-deep text-white hover:brightness-105'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {publishing ? 'Publication…' : 'Publier'}
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── Sections de la page ──────────────────────────────────── */}
        {editing && (
          <SectionRail
            roots={roots}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id)
              stageRef.current
                ?.querySelector(`[data-block-id="${id}"]`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
            onToggle={(section) => void toggleWithHistory(section)}
            onDuplicate={(section) => void duplicateWithHistory(section)}
            onDelete={deleteWithHistory}
            reorderTo={reorderTo}
            pushHistory={pushHistory}
            onAdd={() => {
              insertIndexRef.current = null
              setLibraryOpen(true)
            }}
          />
        )}

        {/* ── La page ──────────────────────────────────────────────── */}
        <div
          ref={paneRef}
          onPointerMove={onPaneMove}
          onPointerLeave={() => setHoverId(null)}
          className="min-h-0 min-w-0 flex-1 overflow-auto bg-[#eae6df] p-[22px]"
        >
          <div
            className="relative mx-auto"
            style={{ width: vw * scale, height: stageHeight * scale }}
          >
            <div
              ref={stageRef}
              onClickCapture={onStageClick}
              onDoubleClick={onStageDoubleClick}
              className="origin-top-left rounded-[4px] bg-ivory shadow-[0_2px_14px_rgba(28,32,30,0.09)]"
              style={{ width: vw, transform: `scale(${scale})` }}
            >
              {/* L'identité globale s'applique aussi dans l'éditeur : ce
                  que l'admin règle dans « Apparence » se voit ici. */}
              {identityCss(data.settings.identity) && (
                <style
                  dangerouslySetInnerHTML={{
                    __html: identityCss(data.settings.identity),
                  }}
                />
              )}
              <MotionProvider>
                {/* Animations coupées : dans l'éditeur, chaque section est
                    rendue dans son état final, immédiatement visible. */}
                <AnimProvider enabled={false}>
                  <SectionsView
                    key={`${viewport}-${mode}`}
                    sections={sections}
                    data={data}
                    editable={editing}
                    breakpoint={viewport}
                  />
                </AnimProvider>
              </MotionProvider>
            </div>

            {/* Cadre de la section sélectionnée */}
            {editing && selectionRect && (
              <div
                className="pointer-events-none absolute inset-x-0 ring-[1.5px] ring-inset ring-blue-deep"
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
                  const active = hoverId === r.id || selectedId === r.id

                  return (
                    <div
                      key={r.id}
                      className={cn(
                        'absolute inset-x-0',
                        /* Survol : liseré intérieur bleu à 35 % — la
                           sélection garde son liseré plein. */
                        hoverId === r.id &&
                          selectedId !== r.id &&
                          'ring-[1.5px] ring-inset ring-blue-deep/35',
                      )}
                      style={{ top: r.top * scale, height: r.height * scale }}
                    >
                      {active && (
                        <>
                          {/* Étiquette de la section */}
                          <div className="absolute left-2.5 top-2.5 rounded-[5px] bg-[rgba(28,32,30,0.82)] px-2 py-[3px] text-[10px] text-white">
                            {section.name ??
                              getBlock(section.type)?.label ??
                              section.type}
                            {!section.isActive && ' — masquée'}
                          </div>

                          {/* Modifier — ouvre le panneau de droite. */}
                          <button
                            type="button"
                            onClick={() => setSelectedId(r.id)}
                            className="pointer-events-auto absolute right-2 top-2 rounded-[7px] border border-line-strong bg-white px-2.5 py-1 text-[11px] text-foreground shadow-[0_1px_4px_rgba(28,32,30,0.08)] transition-colors hover:border-blue-deep hover:text-blue-deep"
                          >
                            Modifier
                          </button>

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
                                'pointer-events-auto absolute left-1/2 z-10 flex h-[26px] w-[26px] -translate-x-1/2 items-center justify-center rounded-full bg-foreground text-ivory shadow-[0_2px_8px_rgba(28,32,30,0.25)] transition-transform hover:scale-110',
                                pos === 0
                                  ? 'top-0 -translate-y-1/2'
                                  : 'bottom-0 translate-y-1/2',
                              )}
                            >
                              <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Contenu de la section — seulement quand elle existe ──── */}
        {editing && selected && (
          <aside className="flex w-[300px] shrink-0 flex-col overflow-hidden border-l border-border bg-ivory">
            <SectionInspector
              key={selected.id}
              section={selected}
              library={data.media}
              onClose={() => setSelectedId(null)}
              onMutated={() => router.refresh()}
              pushHistory={pushHistory}
              onDelete={deleteWithHistory}
              onDraft={applyDraft}
              onSaveStateChange={setSaveState}
              simple
            />
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
