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
  AlignLeft,
  ChevronDown,
  Clock,
  Euro,
  Eye,
  Folder,
  Gauge,
  Images,
  Info,
  ImageIcon,
  LayoutGrid,
  Layers,
  List,
  MapPin,
  MessageSquare,
  Minus,
  Monitor,
  MousePointerClick,
  MoveVertical,
  PanelTop,
  Pencil,
  Phone,
  Plus,
  Quote,
  Redo2,
  Share2,
  Smartphone,
  Sparkles,
  SquareStack,
  Tablet,
  Table,
  Tag,
  TrendingUp,
  Type,
  Undo2,
  User,
  Youtube,
} from 'lucide-react'
import { toast } from 'sonner'

import type { HistoryEntry } from './history'
import { LayersPanel } from './LayersPanel'
import { SectionInspector, type SectionDraft } from './SectionInspector'
import { blockGroups, getBlock } from '@/blocks/registry'
import {
  GRID_COLS,
  GRID_VIEWPORTS,
  ROW_UNIT,
  canvasRows,
  clampPlacement,
  defaultSpan,
  parseGridPosition,
  resolvePlacement,
  withPlacement,
  type Breakpoint,
  type GridPlacement,
  type GridPosition,
} from '@/lib/grid'
import { cn } from '@/lib/utils'
import {
  createSection,
  convertToCanvas,
  deleteSection,
  insertSection,
  restoreSections,
  updateCanvasRows,
  updateGridPlacement,
  updateTextField,
} from '@/server/actions/pages'
import type { Section } from '@/server/db/schema'
import { MotionProvider } from '@/components/motion/MotionProvider'
import {
  SectionsView,
  type SectionsViewData,
} from '@/components/site/SectionsView'

/* ════════════════════════════════════════════════════════════════════
   Géométrie d'un canevas mesurée dans le DOM.

   Les lignes de la grille ne sont jamais recalculées « de tête » : elles
   sont lues sur la vraie grille CSS (`grid-template-columns/rows` résolus).
   Quand une ligne grandit avec son contenu, l'overlay suit — par
   construction, il ne peut pas mentir.
   ════════════════════════════════════════════════════════════════════ */

type CanvasMetrics = {
  id: string
  /** Rect du canevas, en coordonnées de composition (non mises à l'échelle). */
  left: number
  top: number
  width: number
  height: number
  /** Bords de chaque piste : [début, fin] par colonne / ligne. */
  cols: [number, number][]
  rows: [number, number][]
  colGap: number
  rowGap: number
}

function trackEdges(sizes: number[], gap: number): [number, number][] {
  const edges: [number, number][] = []
  let cursor = 0
  for (const size of sizes) {
    edges.push([cursor, cursor + size])
    cursor += size + gap
  }
  return edges
}

function readCanvasMetrics(
  el: HTMLElement,
  stageRect: DOMRect,
  scale: number,
): CanvasMetrics {
  const rect = el.getBoundingClientRect()
  const cs = getComputedStyle(el)
  const colSizes = cs.gridTemplateColumns.split(' ').map(parseFloat)
  const rowSizes = cs.gridTemplateRows.split(' ').map(parseFloat)
  const colGap = parseFloat(cs.columnGap) || 0
  const rowGap = parseFloat(cs.rowGap) || 0

  return {
    id: el.dataset.gridCanvas ?? '',
    left: (rect.left - stageRect.left) / scale,
    top: (rect.top - stageRect.top) / scale,
    width: rect.width / scale,
    height: rect.height / scale,
    cols: trackEdges(colSizes, colGap),
    rows: trackEdges(rowSizes, rowGap),
    colGap,
    rowGap,
  }
}

/** Piste contenant `pos` (1-indexée) — extrapole au-delà de la dernière. */
function trackAt(edges: [number, number][], gap: number, pos: number): number {
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i]
    if (edge && pos < edge[1] + gap / 2) return i + 1
  }
  const last = edges[edges.length - 1]
  if (!last) return 1
  const extra = Math.floor((pos - last[1]) / (ROW_UNIT + gap)) + 1
  return edges.length + Math.max(1, extra)
}

/** Rect (coordonnées canevas) d'un placement, pour l'overlay. */
function placementRect(m: CanvasMetrics, p: GridPlacement) {
  const c0 = m.cols[Math.min(p.col, m.cols.length) - 1]
  const c1 = m.cols[Math.min(p.col + p.colSpan - 1, m.cols.length) - 1]
  const lastRow = m.rows[m.rows.length - 1] ?? [0, ROW_UNIT]

  const rowStart = (i: number): number => {
    const track = m.rows[i - 1]
    if (track) return track[0]
    return lastRow[1] + m.rowGap + (i - m.rows.length - 1) * (ROW_UNIT + m.rowGap)
  }
  const rowEnd = (i: number): number => {
    const track = m.rows[i - 1]
    if (track) return track[1]
    return rowStart(i) + ROW_UNIT
  }

  const top = rowStart(p.row)
  const bottom = rowEnd(p.row + p.rowSpan - 1)
  return {
    left: c0 ? c0[0] : 0,
    top,
    width: c1 ? c1[1] - (c0 ? c0[0] : 0) : m.width,
    height: bottom - top,
  }
}

/** Cellules réellement occupées par un élément, lues dans le DOM — sert de
    point de départ quand un élément est encore « en flux » (mobile). */
function measureCells(m: CanvasMetrics, el: HTMLElement, stageRect: DOMRect, scale: number): GridPlacement {
  const r = el.getBoundingClientRect()
  const left = (r.left - stageRect.left) / scale - m.left
  const top = (r.top - stageRect.top) / scale - m.top
  const right = (r.right - stageRect.left) / scale - m.left
  const bottom = (r.bottom - stageRect.top) / scale - m.top
  const col = trackAt(m.cols, m.colGap, left + 2)
  const row = trackAt(m.rows, m.rowGap, top + 2)
  return {
    col,
    row,
    colSpan: Math.max(1, trackAt(m.cols, m.colGap, right - 2) - col + 1),
    rowSpan: Math.max(1, trackAt(m.rows, m.rowGap, bottom - 2) - row + 1),
  }
}

/* ── Gestes ─────────────────────────────────────────────────────────── */

type HandleDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

type Gesture = {
  id: string
  canvasId: string
  mode: 'move' | HandleDir
  startX: number
  startY: number
  base: GridPlacement
  /** Position complète avant le geste (pour l'annulation). */
  prevPosition: GridPosition | null
  metrics: CanvasMetrics
  moved: boolean
  last: GridPlacement
}

type PaletteDrag = {
  type: string
  label: string
  x: number
  y: number
  target: { canvasId: string; placement: GridPlacement } | null
}

const PALETTE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  heading: Type,
  text: AlignLeft,
  image: ImageIcon,
  button: MousePointerClick,
  list: List,
  divider: Minus,
  spacer: MoveVertical,
  badge: Tag,
  citation: Quote,
  stat: TrendingUp,
  carte: PanelTop,
  atout: Sparkles,
  temoignage: MessageSquare,
  accordeon: ChevronDown,
  onglets: Folder,
  tableau: Table,
  tarif: Euro,
  galerie: Images,
  avatar: User,
  encart: Info,
  barre: Gauge,
  video: Youtube,
  acces: MapPin,
  coordonnees: Phone,
  horaires: Clock,
  reseaux: Share2,
}

const VIEWPORT_ICONS: { bp: Breakpoint; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { bp: 'desktop', icon: Monitor, label: 'Desktop — 12 colonnes' },
  { bp: 'tablet', icon: Tablet, label: 'Tablette — 8 colonnes' },
  { bp: 'mobile', icon: Smartphone, label: 'Mobile — 4 colonnes' },
]

/* ════════════════════════════════════════════════════════════════════
   L'éditeur
   ════════════════════════════════════════════════════════════════════ */

export function GridBuilder({
  pageId,
  initialSections,
  data,
}: {
  pageId: string
  initialSections: Section[]
  data: SectionsViewData
}) {
  const router = useRouter()

  /* Copie locale optimiste : chaque geste s'applique ici immédiatement,
     l'action serveur suit, `router.refresh()` réconcilie. */
  const [sections, setSections] = useState(initialSections)
  useEffect(() => setSections(initialSections), [initialSections])

  const [viewport, setViewport] = useState<Breakpoint>('desktop')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [leftTab, setLeftTab] = useState<'layers' | 'blocks'>('layers')

  const [gesture, setGesture] = useState<Gesture | null>(null)
  const gestureRef = useRef<Gesture | null>(null)
  const [palette, setPalette] = useState<PaletteDrag | null>(null)
  const paletteRef = useRef<PaletteDrag | null>(null)

  const stageRef = useRef<HTMLDivElement>(null)
  const paneRef = useRef<HTMLDivElement>(null)

  const [paneWidth, setPaneWidth] = useState(1280)
  const [metrics, setMetrics] = useState<CanvasMetrics[]>([])
  /** Blocs dont le contenu déborde de leurs cellules (grille rigide). */
  const [overflows, setOverflows] = useState<
    { id: string; left: number; top: number; width: number; height: number }[]
  >([])
  const [selectionRect, setSelectionRect] = useState<{
    left: number
    top: number
    width: number
    height: number
    isGridItem: boolean
  } | null>(null)

  const vw = GRID_VIEWPORTS[viewport]
  const scale = Math.min(1, (paneWidth - 48) / vw)
  const cols = GRID_COLS[viewport]

  const byId = useMemo(
    () => new Map(sections.map((s) => [s.id, s])),
    [sections],
  )
  const selected = selectedId ? (byId.get(selectedId) ?? null) : null

  /* ── Historique ──────────────────────────────────────────────────── */

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
        const okDone = await (direction === 'undo' ? entry.undo() : entry.redo()).catch(
          () => false,
        )
        if (okDone) to.push(entry)
        else toast.error('Impossible d’annuler cette action.')
      } finally {
        historyLock.current = false
        bump((t) => t + 1)
        router.refresh()
      }
    },
    [router],
  )

  /* ── Mesure : échelle du panneau + géométrie des canevas ─────────── */

  useLayoutEffect(() => {
    const pane = paneRef.current
    if (!pane) return
    const ro = new ResizeObserver(() => setPaneWidth(pane.clientWidth))
    ro.observe(pane)
    setPaneWidth(pane.clientWidth)
    return () => ro.disconnect()
  }, [])

  const [origin, setOrigin] = useState({ x: 0, y: 0 })

  const remeasure = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    const stageRect = stage.getBoundingClientRect()

    /* Position sous-pixel du canvas à l'écran — nécessaire pour caler les
       traits du quadrillage sur le pixel physique. */
    const wrap = stageHeightRef.current
    if (wrap) {
      const r = wrap.getBoundingClientRect()
      setOrigin((cur) =>
        cur.x === r.left && cur.y === r.top ? cur : { x: r.left, y: r.top },
      )
    }
    const canvases = Array.from(
      stage.querySelectorAll<HTMLElement>('[data-grid-canvas]'),
    )
    setMetrics(canvases.map((el) => readCanvasMetrics(el, stageRect, scale)))

    /* La grille étant rigide, un contenu trop grand DÉBORDE de son cadre.
       On le repère ici pour le signaler — l'admin agrandit le bloc, la
       grille, elle, n'a pas bougé. */
    const over: typeof overflows = []
    for (const el of stage.querySelectorAll<HTMLElement>('[data-grid-item]')) {
      if (el.scrollHeight > el.clientHeight + 2) {
        const r = el.getBoundingClientRect()
        over.push({
          id: el.dataset.gridItem ?? '',
          left: (r.left - stageRect.left) / scale,
          top: (r.top - stageRect.top) / scale,
          width: r.width / scale,
          height: r.height / scale,
        })
      }
    }
    setOverflows(over)

    if (selectedId) {
      const el =
        stage.querySelector<HTMLElement>(`[data-grid-item="${selectedId}"]`) ??
        stage.querySelector<HTMLElement>(`[data-block-id="${selectedId}"]`)
      if (el) {
        const r = el.getBoundingClientRect()
        setSelectionRect({
          left: (r.left - stageRect.left) / scale,
          top: (r.top - stageRect.top) / scale,
          width: r.width / scale,
          height: r.height / scale,
          isGridItem: el.hasAttribute('data-grid-item'),
        })
      } else {
        setSelectionRect(null)
      }
    } else {
      setSelectionRect(null)
    }
  }, [scale, selectedId])

  useLayoutEffect(() => {
    remeasure()
    const stage = stageRef.current
    if (!stage) return
    const ro = new ResizeObserver(() => remeasure())
    ro.observe(stage)
    for (const el of stage.querySelectorAll<HTMLElement>('[data-grid-canvas]')) {
      ro.observe(el)
    }
    return () => ro.disconnect()
  }, [remeasure, sections, viewport, mode])

  /* ── Écriture d'un placement (optimiste + serveur + historique) ──── */

  const applyLocal = useCallback((id: string, position: GridPosition) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, placement: position } : s)),
    )
  }, [])

  /* Brouillon de l'inspecteur → canvas, à chaque frappe. C'est ce qui rend
     l'édition « Power BI » : on tape, on voit ; l'écriture en base suit
     quelques centaines de millisecondes derrière. */
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

  const commitPlacement = useCallback(
    (
      id: string,
      next: GridPosition,
      prev: GridPosition | null,
      label: string,
    ) => {
      applyLocal(id, next)
      void updateGridPlacement(id, next).then((r) => {
        if (!r.ok) {
          toast.error(r.error)
          if (prev) applyLocal(id, prev)
        }
      })
      const fallback = prev ?? next
      pushHistory({
        label,
        live: true,
        undo: async () => {
          const r = await updateGridPlacement(id, fallback)
          if (r.ok) applyLocal(id, fallback)
          return r.ok
        },
        redo: async () => {
          const r = await updateGridPlacement(id, next)
          if (r.ok) applyLocal(id, next)
          return r.ok
        },
      })
    },
    [applyLocal, pushHistory],
  )

  /* ── Instantanés (suppression / conversion annulables) ───────────── */

  const subtreeOf = useCallback(
    (id: string) => {
      const keep = new Set([id])
      let grew = true
      while (grew) {
        grew = false
        for (const s of sections) {
          if (s.parentId && keep.has(s.parentId) && !keep.has(s.id)) {
            keep.add(s.id)
            grew = true
          }
        }
      }
      return sections
        .filter((s) => keep.has(s.id))
        .map((s) => ({
          id: s.id,
          pageId: s.pageId,
          parentId: s.parentId,
          columnIndex: s.columnIndex,
          sortOrder: s.sortOrder,
          type: s.type,
          name: s.name,
          anchor: s.anchor,
          navLabel: s.navLabel,
          showInNav: s.showInNav,
          isActive: s.isActive,
          backgroundColor: s.backgroundColor,
          payload: s.payload,
          styles: s.styles,
          placement: s.placement,
        }))
    },
    [sections],
  )

  const deleteWithHistory = useCallback(
    async (id: string) => {
      const snapshot = subtreeOf(id)
      const result = await deleteSection(id)
      if (result.ok) {
        const removed = new Set(snapshot.map((row) => row.id))
        setSections((prev) => prev.filter((s) => !removed.has(s.id)))
        setSelectedId((cur) => (cur === id ? null : cur))
        pushHistory({
          label: 'Suppression',
          undo: async () => (await restoreSections(snapshot)).ok,
          redo: async () => (await deleteSection(id)).ok,
        })
      }
      return result
    },
    [pushHistory, subtreeOf],
  )

  const convertWithHistory = useCallback(
    async (id: string) => {
      const snapshot = subtreeOf(id)
      const result = await convertToCanvas(id)
      if (result.ok) {
        pushHistory({
          label: 'Conversion en grille',
          undo: async () => {
            const del = await deleteSection(id)
            if (!del.ok) return false
            return (await restoreSections(snapshot)).ok
          },
          redo: async () => {
            /* Rejouer = re-supprimer l'état converti… impossible sans
               instantané pris après coup ; on reconvertit depuis la
               restauration, ce qui produit le même résultat. */
            return (await convertToCanvas(id)).ok
          },
        })
      }
      return result
    },
    [pushHistory, subtreeOf],
  )

  /* ── Sélection & gestes sur le canvas ────────────────────────────── */

  const beginGesture = useCallback(
    (
      e: React.PointerEvent,
      id: string,
      mode: Gesture['mode'],
    ) => {
      const stage = stageRef.current
      if (!stage) return
      const itemEl = stage.querySelector<HTMLElement>(`[data-grid-item="${id}"]`)
      const canvasEl = itemEl?.closest<HTMLElement>('[data-grid-canvas]')
      if (!itemEl || !canvasEl) return

      const stageRect = stage.getBoundingClientRect()
      const m = readCanvasMetrics(canvasEl, stageRect, scale)
      const section = byId.get(id)
      const position = parseGridPosition(section?.placement)
      const base =
        (position ? resolvePlacement(position, viewport) : null) ??
        measureCells(m, itemEl, stageRect, scale)

      e.preventDefault()
      const g: Gesture = {
        id,
        canvasId: m.id,
        mode,
        startX: e.clientX,
        startY: e.clientY,
        base: clampPlacement(base, cols),
        prevPosition: position,
        metrics: m,
        moved: false,
        last: clampPlacement(base, cols),
      }
      gestureRef.current = g
      setGesture(g)
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    },
    [byId, cols, scale, viewport],
  )

  useEffect(() => {
    if (!gesture) return

    const stage = stageRef.current
    if (!stage) return

    const onMove = (e: PointerEvent) => {
      const g = gestureRef.current
      if (!g) return
      const dx = (e.clientX - g.startX) / scale
      const dy = (e.clientY - g.startY) / scale
      if (!g.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return
      g.moved = true

      const m = g.metrics
      /* Delta en cellules : piste sous le pointeur maintenant, moins piste
         sous le pointeur au départ. Robuste aux lignes non uniformes. */
      const colW = (m.cols[0]?.[1] ?? 64) - (m.cols[0]?.[0] ?? 0)
      const dCols = Math.round(dx / (colW + m.colGap))
      const startRow = trackAt(
        m.rows,
        m.rowGap,
        (g.startY - stage.getBoundingClientRect().top) / scale - m.top,
      )
      const nowRow = trackAt(
        m.rows,
        m.rowGap,
        (e.clientY - stage.getBoundingClientRect().top) / scale - m.top,
      )
      const dRows = nowRow - startRow

      let next: GridPlacement = { ...g.base }
      if (g.mode === 'move') {
        next = { ...next, col: g.base.col + dCols, row: g.base.row + dRows }
        next.col = Math.min(Math.max(1, next.col), cols - next.colSpan + 1)
        next.row = Math.max(1, next.row)
      } else {
        const dir = g.mode
        if (dir.includes('e')) {
          next.colSpan = Math.max(1, Math.min(g.base.colSpan + dCols, cols - g.base.col + 1))
        }
        if (dir.includes('w')) {
          const shift = Math.min(dCols, g.base.colSpan - 1)
          const newCol = Math.max(1, g.base.col + shift)
          next.colSpan = g.base.colSpan - (newCol - g.base.col)
          next.col = newCol
        }
        if (dir.includes('s')) {
          next.rowSpan = Math.max(1, g.base.rowSpan + dRows)
        }
        if (dir.includes('n')) {
          const shift = Math.min(dRows, g.base.rowSpan - 1)
          const newRow = Math.max(1, g.base.row + shift)
          next.rowSpan = g.base.rowSpan - (newRow - g.base.row)
          next.row = newRow
        }
      }

      next = clampPlacement(next, cols)
      g.last = next

      /* Aperçu instantané : on écrit directement le style de l'élément —
         zéro re-render pendant le geste. */
      const el = stage.querySelector<HTMLElement>(`[data-grid-item="${g.id}"]`)
      if (el) {
        el.style.gridColumn = `${next.col}/span ${next.colSpan}`
        el.style.gridRow = `${next.row}/span ${next.rowSpan}`
      }
      setGesture({ ...g })
    }

    const onUp = () => {
      const g = gestureRef.current
      gestureRef.current = null
      setGesture(null)
      if (!g) return

      const el = stage.querySelector<HTMLElement>(`[data-grid-item="${g.id}"]`)

      if (g.moved) {
        const prev = g.prevPosition
        const basePosition =
          prev ??
          withPlacement({ desktop: g.base } as GridPosition, viewport, g.base)
        const next = withPlacement(basePosition, viewport, g.last)
        commitPlacement(
          g.id,
          next,
          prev ?? basePosition,
          g.mode === 'move' ? 'Déplacement' : 'Redimensionnement',
        )
      }
      if (el) {
        el.style.gridColumn = ''
        el.style.gridRow = ''
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- le geste est
    // piloté par gestureRef ; seuls le démarrage/l'arrêt relancent l'effet.
  }, [gesture !== null, scale, cols, viewport, commitPlacement])

  const onStagePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (mode !== 'edit' || e.button !== 0) return
      const target = e.target as HTMLElement
      if (target.closest('[data-editor-ui]')) return
      if (target.isContentEditable) return

      const item = target.closest<HTMLElement>('[data-grid-item]')
      if (item) {
        const id = item.dataset.gridItem ?? null
        setSelectedId(id)
        if (id) beginGesture(e, id, 'move')
        return
      }

      const block = target.closest<HTMLElement>('[data-block-id]')
      setSelectedId(block?.dataset.blockId ?? null)
    },
    [beginGesture, mode],
  )

  const onStageClick = useCallback(
    (e: React.MouseEvent) => {
      if (mode !== 'edit') return
      /* Le contenu réel est rendu dans l'éditeur : on neutralise ses liens. */
      if ((e.target as HTMLElement).closest('a')) e.preventDefault()
    },
    [mode],
  )

  /* ── Édition de texte en place (double-clic) ─────────────────────── */

  const onStageDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (mode !== 'edit') return
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
      const original = typeof payload[fieldName] === 'string' ? (payload[fieldName] as string) : ''
      const originalHtml = editEl.innerHTML

      editEl.setAttribute('contenteditable', 'plaintext-only')
      editEl.textContent = original
      editEl.focus()

      const finish = (commit: boolean) => {
        editEl.removeAttribute('contenteditable')
        editEl.removeEventListener('blur', onBlur)
        editEl.removeEventListener('keydown', onKey)
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
          undo: async () => (await updateTextField(blockId, fieldName, original)).ok,
          redo: async () => (await updateTextField(blockId, fieldName, value)).ok,
        })
      }

      const onBlur = () => finish(true)
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === 'Escape') {
          ev.preventDefault()
          finish(false)
        } else if (ev.key === 'Enter' && !multiline) {
          ev.preventDefault()
          finish(true)
        }
      }
      editEl.addEventListener('blur', onBlur)
      editEl.addEventListener('keydown', onKey)

      const range = document.createRange()
      range.selectNodeContents(editEl)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    },
    [byId, mode, pushHistory, router],
  )

  /* ── Palette : glisser un bloc vers une grille ───────────────────── */

  const beginPaletteDrag = useCallback(
    (e: React.PointerEvent, type: string, label: string) => {
      if (e.button !== 0) return
      e.preventDefault()

      /* Sans grille sur la page, aucun dépôt n'est possible : on le dit
         tout de suite au lieu de laisser le geste échouer en silence. */
      if (!stageRef.current?.querySelector('[data-grid-canvas]')) {
        toast.info(
          'Ajoutez d’abord une « Section grille » (juste en dessous), ou convertissez une section existante depuis le panneau de droite.',
        )
        return
      }

      const drag: PaletteDrag = { type, label, x: e.clientX, y: e.clientY, target: null }
      paletteRef.current = drag
      setPalette(drag)

      const onMove = (ev: PointerEvent) => {
        const d = paletteRef.current
        const stage = stageRef.current
        if (!d || !stage) return

        let target: PaletteDrag['target'] = null
        const under = document
          .elementFromPoint(ev.clientX, ev.clientY)
          ?.closest<HTMLElement>('[data-grid-canvas]')
        if (under) {
          const stageRect = stage.getBoundingClientRect()
          const m = readCanvasMetrics(under, stageRect, scale)
          const x = (ev.clientX - stageRect.left) / scale - m.left
          const y = (ev.clientY - stageRect.top) / scale - m.top
          const span = defaultSpan(d.type)
          const colSpan = Math.min(span.colSpan, cols)
          const placement = clampPlacement(
            {
              col: trackAt(m.cols, m.colGap, x) - Math.floor(colSpan / 2),
              row: trackAt(m.rows, m.rowGap, y),
              colSpan,
              rowSpan: span.rowSpan,
            },
            cols,
          )
          target = { canvasId: m.id, placement }
        }

        const next = { ...d, x: ev.clientX, y: ev.clientY, target }
        paletteRef.current = next
        setPalette(next)
      }

      const onUp = async () => {
        window.removeEventListener('pointermove', onMove)
        const d = paletteRef.current
        paletteRef.current = null
        setPalette(null)
        if (!d) return
        if (!d.target) {
          toast.info(
            'Déposez le bloc à l’intérieur d’une Section grille — la zone surlignée en bleu.',
          )
          return
        }

        const { canvasId, placement } = d.target
        /* La position est exprimée dans la grille AFFICHÉE ; le desktop
           (source de vérité) est déduit proportionnellement si on dépose
           depuis la vue tablette ou mobile. */
        const factor = GRID_COLS.desktop / cols
        const desktop = clampPlacement(
          {
            col: Math.round((placement.col - 1) * factor) + 1,
            row: placement.row,
            colSpan: Math.max(1, Math.round(placement.colSpan * factor)),
            rowSpan: placement.rowSpan,
          },
          GRID_COLS.desktop,
        )
        let position: GridPosition = { desktop }
        if (viewport !== 'desktop') {
          position = withPlacement(position, viewport, placement)
        }

        const count = sections.filter((s) => s.parentId === canvasId).length
        const result = await insertSection({
          pageId,
          type: d.type,
          position: count,
          parentId: canvasId,
          placement: position,
        })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        let currentId = result.data.id

        /* Apparition immédiate : la ligne est reconstituée localement telle
           que le serveur vient de l'écrire ; `router.refresh()` réconcilie
           derrière. */
        const block = getBlock(d.type)
        if (block) {
          const now = new Date()
          setSections((prev) => [
            ...prev,
            {
              id: currentId,
              pageId,
              parentId: canvasId,
              columnIndex: 0,
              placement: position,
              styles: null,
              name: null,
              type: d.type,
              anchor: null,
              navLabel: null,
              showInNav: false,
              sortOrder: count,
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
          label: `Ajout — ${d.label}`,
          undo: async () => (await deleteSection(currentId)).ok,
          redo: async () => {
            const again = await insertSection({
              pageId,
              type: d.type,
              position: count,
              parentId: canvasId,
              placement: position,
            })
            if (again.ok) currentId = again.data.id
            return again.ok
          },
        })
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp, { once: true })
    },
    [cols, pageId, pushHistory, router, scale, sections, viewport],
  )

  /* ── Hauteur d'une grille : tirer son bord bas, ligne par ligne ──── */

  const [rowsDrag, setRowsDrag] = useState<{
    canvasId: string
    rows: number
    /** Le geste bute sur le contenu : impossible de réduire davantage. */
    blocked: boolean
  } | null>(null)

  const beginRowsDrag = useCallback(
    (e: React.PointerEvent, canvasId: string) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()

      const stage = stageRef.current
      const el = stage?.querySelector<HTMLElement>(
        `[data-grid-canvas="${canvasId}"]`,
      )
      if (!stage || !el) return

      const stageRect = stage.getBoundingClientRect()
      const m = readCanvasMetrics(el, stageRect, scale)
      const section = byId.get(canvasId)
      const startRows = canvasRows(section?.payload)
      const startY = e.clientY

      /* On ne peut pas réduire la grille sous ses blocs : les lignes
         occupées se recréeraient d'elles-mêmes et rien ne bougerait.
         Le geste bute donc sur la dernière ligne occupée — et le dit. */
      const occupied = sections.reduce((acc, s) => {
        if (s.parentId !== canvasId) return acc
        const pos = parseGridPosition(s.placement)
        const p = pos ? resolvePlacement(pos, viewport) : null
        return p ? Math.max(acc, p.row + p.rowSpan - 1) : acc
      }, 0)
      const minRows = Math.max(8, occupied)

      let current = startRows
      setRowsDrag({ canvasId, rows: startRows, blocked: false })

      const onMove = (ev: PointerEvent) => {
        const dy = (ev.clientY - startY) / scale
        const wanted = startRows + Math.round(dy / (ROW_UNIT + m.rowGap))
        const next = Math.min(120, Math.max(minRows, wanted))
        const blocked = wanted < minRows
        if (next === current) {
          setRowsDrag((cur) =>
            cur && cur.blocked !== blocked ? { ...cur, blocked } : cur,
          )
          return
        }
        current = next
        /* Aperçu instantané : la vraie grille change de gabarit sous la
           souris, l'overlay suit par mesure. */
        el.style.gridTemplateRows =
          viewport === 'mobile'
            ? `repeat(${next},minmax(${ROW_UNIT}px,auto))`
            : `repeat(${next},${ROW_UNIT}px)`
        setRowsDrag({ canvasId, rows: next, blocked })
        remeasure()
      }

      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        setRowsDrag(null)
        el.style.gridTemplateRows = ''
        if (current === startRows) return

        const applyRows = (rows: number) =>
          setSections((prev) =>
            prev.map((s) =>
              s.id === canvasId
                ? {
                    ...s,
                    payload: {
                      ...((s.payload as Record<string, unknown>) ?? {}),
                      rows,
                    },
                  }
                : s,
            ),
          )

        const committed = current
        applyRows(committed)
        void updateCanvasRows(canvasId, committed).then((r) => {
          if (!r.ok) {
            toast.error(r.error)
            applyRows(startRows)
          }
        })
        pushHistory({
          label: 'Hauteur de grille',
          live: true,
          undo: async () => {
            const r = await updateCanvasRows(canvasId, startRows)
            if (r.ok) applyRows(startRows)
            return r.ok
          },
          redo: async () => {
            const r = await updateCanvasRows(canvasId, committed)
            if (r.ok) applyRows(committed)
            return r.ok
          },
        })
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp, { once: true })
    },
    [byId, pushHistory, remeasure, scale, sections, viewport],
  )

  /* ── Ajouter une section racine ──────────────────────────────────── */

  const addRootSection = useCallback(
    async (type: string, label: string) => {
      const result = await createSection(pageId, type)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      let currentId = result.data.id

      /* Apparition immédiate en bas de page, avant la réconciliation. */
      const block = getBlock(type)
      if (block) {
        const now = new Date()
        const nextOrder =
          sections
            .filter((s) => !s.parentId)
            .reduce((acc, s) => Math.max(acc, s.sortOrder), -1) + 1
        setSections((prev) => [
          ...prev,
          {
            id: currentId,
            pageId,
            parentId: null,
            columnIndex: 0,
            placement: null,
            styles: null,
            name: null,
            type,
            anchor: block.suggestedAnchor || null,
            navLabel: block.navigable ? block.label : null,
            showInNav: block.navigable ?? false,
            sortOrder: nextOrder,
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

      /* La nouvelle section arrive en bas : on l'amène à l'écran. */
      requestAnimationFrame(() => {
        stageRef.current
          ?.querySelector(`[data-block-id="${currentId}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      pushHistory({
        label: `Section — ${label}`,
        undo: async () => (await deleteSection(currentId)).ok,
        redo: async () => {
          const again = await createSection(pageId, type)
          if (again.ok) currentId = again.data.id
          return again.ok
        },
      })
    },
    [pageId, pushHistory, router, sections],
  )

  /* ── Clavier : ⌘Z, flèches, suppression ──────────────────────────── */

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

      if (mode !== 'edit' || !selectedId) return
      const section = byId.get(selectedId)
      if (!section?.parentId) return
      const position = parseGridPosition(section.placement)
      if (!position) return

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        void deleteWithHistory(selectedId).then((r) => {
          if (r.ok) router.refresh()
        })
        return
      }

      const arrows: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      }
      const delta = arrows[e.key]
      if (!delta) return
      e.preventDefault()

      const current =
        resolvePlacement(position, viewport) ?? position.desktop
      const next = clampPlacement(
        e.shiftKey
          ? {
              ...current,
              colSpan: current.colSpan + delta[0],
              rowSpan: current.rowSpan + delta[1],
            }
          : {
              ...current,
              col: current.col + delta[0],
              row: current.row + delta[1],
            },
        cols,
      )
      commitPlacement(
        selectedId,
        withPlacement(position, viewport, next),
        position,
        e.shiftKey ? 'Redimensionnement' : 'Déplacement',
      )
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [byId, cols, commitPlacement, deleteWithHistory, mode, router, runHistory, selectedId, viewport])

  /* ── Rendu ───────────────────────────────────────────────────────── */

  const stageHeightRef = useRef<HTMLDivElement>(null)
  const [stageHeight, setStageHeight] = useState(800)
  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setStageHeight(el.offsetHeight))
    ro.observe(el)
    setStageHeight(el.offsetHeight)
    return () => ro.disconnect()
  }, [])

  const u = 1 / scale
  const editing = mode === 'edit'
  const activeGesture = gesture?.moved ? gesture : null

  /* Traits du quadrillage calés sur le pixel PHYSIQUE de l'écran.

     Ils sont dessinés HORS du repère transformé (pas de `scale()`), en
     coordonnées écran, chaque position arrondie au pixel physique en
     tenant compte de la position sous-pixel du canvas lui-même — c'est la
     seule façon d'obtenir des traits rigoureusement identiques : toute
     couche passée dans un transform fractionnaire est rastérisée avec les
     arrondis du navigateur, et certains traits en sortent doublés. */
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const hairCss = 1 / dpr
  const snapAbs = (originPart: number, v: number) =>
    Math.round((originPart + v) * dpr) / dpr - originPart

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      {/* ── Barre supérieure ─────────────────────────────────────── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-1">
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
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── Panneau gauche : calques / blocs ─────────────────────── */}
        {editing && (
          <aside className="flex w-60 shrink-0 flex-col border-r border-border">
            <div className="flex shrink-0 border-b border-border">
              {(
                [
                  ['layers', 'Calques', Layers],
                  ['blocks', 'Ajouter', Plus],
                ] as const
              ).map(([tab, label, Icon]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setLeftTab(tab)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 py-2 text-[0.75rem] transition-colors',
                    leftTab === tab
                      ? 'text-foreground shadow-[inset_0_-1px_0_var(--color-foreground)]'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {leftTab === 'layers' ? (
                <LayersPanel
                  sections={sections}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onChanged={() => router.refresh()}
                  pushHistory={pushHistory}
                  onDelete={deleteWithHistory}
                />
              ) : (
                <div className="space-y-5 p-3">
                  <div>
                    <p className="mb-2 text-[0.68rem] font-medium uppercase tracking-wider text-muted-foreground">
                      Éléments — glissez dans une grille
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {blockGroups
                        .filter((g) => g.group !== 'Sections')
                        .flatMap((g) => g.options)
                        .filter((o) => o.inline)
                        .map((option) => {
                          const Icon = PALETTE_ICONS[option.type] ?? SquareStack
                          return (
                            <button
                              key={option.type}
                              type="button"
                              title={option.description}
                              onPointerDown={(e) =>
                                beginPaletteDrag(e, option.type, option.label)
                              }
                              className="flex cursor-grab flex-col items-center gap-1.5 rounded-lg border border-border py-3 text-[0.72rem] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground active:cursor-grabbing"
                            >
                              <Icon className="h-4 w-4" />
                              {option.label}
                            </button>
                          )
                        })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[0.68rem] font-medium uppercase tracking-wider text-muted-foreground">
                      Sections — ajoutées en bas de page
                    </p>
                    <div className="space-y-1">
                      {blockGroups
                        .filter((g) => g.group === 'Sections')
                        .flatMap((g) => g.options)
                        .map((option) => (
                          <button
                            key={option.type}
                            type="button"
                            title={option.description}
                            onClick={() =>
                              void addRootSection(option.type, option.label)
                            }
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[0.78rem] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            {option.type === 'canvas' ? (
                              <LayoutGrid className="h-3.5 w-3.5" />
                            ) : (
                              <SquareStack className="h-3.5 w-3.5" />
                            )}
                            {option.label}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* ── Canvas central ───────────────────────────────────────── */}
        <div
          ref={paneRef}
          className="min-h-0 min-w-0 flex-1 overflow-auto bg-[#efece6] py-6"
        >
          <div
            ref={stageHeightRef}
            className="relative mx-auto"
            style={{ width: vw * scale, height: stageHeight * scale }}
          >
            <div
              ref={stageRef}
              onPointerDown={onStagePointerDown}
              onClickCapture={onStageClick}
              onDoubleClick={onStageDoubleClick}
              className={cn(
                'relative origin-top-left bg-white shadow-[0_1px_8px_rgba(20,20,19,0.08)]',
                (gesture || palette) && 'select-none',
              )}
              style={{ width: vw, transform: `scale(${scale})` }}
            >
              {/* MotionProvider : les blocs utilisent les primitives `m.*`
                  de Motion — sans lui, les animations d'apparition ne se
                  jouent jamais et le contenu reste à opacité 0. */}
              <MotionProvider>
                <SectionsView
                  key={`${viewport}-${mode}`}
                  sections={sections}
                  data={data}
                  editable={editing}
                  breakpoint={viewport}
                />
              </MotionProvider>

              {/* ── Overlays (dans le repère mis à l'échelle) ──────── */}
              {editing && (
                <div className="pointer-events-none absolute inset-0" data-editor-ui>
                  {/* Zones de dépôt signalées pendant un glisser depuis la
                      palette. Le quadrillage, lui, est dessiné hors échelle
                      — voir l'overlay écran plus bas. */}
                  {palette &&
                    metrics.map((m) => (
                      <div
                        key={m.id}
                        className="absolute rounded-[2px] border border-dashed border-sky-500/60 bg-sky-500/[0.04]"
                        style={{
                          left: m.left,
                          top: m.top,
                          width: m.width,
                          height: m.height,
                          borderWidth: u,
                        }}
                      />
                    ))}

                  {/* Poignée de hauteur : le bord bas de chaque grille se
                      tire à la souris, ligne par ligne. */}
                  {metrics.map((m) => (
                    <div
                      key={`h-${m.id}`}
                      data-editor-ui
                      title="Hauteur de la grille — glissez pour ajouter ou retirer des lignes"
                      onPointerDown={(e) => beginRowsDrag(e, m.id)}
                      className="pointer-events-auto absolute flex items-center justify-center"
                      style={{
                        left: m.left,
                        top: m.top + m.height - 6 * u,
                        width: m.width,
                        height: 14 * u,
                        cursor: 'ns-resize',
                      }}
                    >
                      <div
                        className={cn(
                          'rounded-full transition-colors',
                          rowsDrag?.canvasId === m.id
                            ? 'bg-sky-500'
                            : 'bg-slate-400/50 hover:bg-sky-500/70',
                        )}
                        style={{ width: 44 * u, height: 4 * u }}
                      />
                      {rowsDrag?.canvasId === m.id && (
                        <div
                          className={cn(
                            'absolute whitespace-nowrap rounded px-1.5 py-0.5 text-[0.65rem] font-medium text-white',
                            rowsDrag.blocked ? 'bg-amber-600' : 'bg-sky-600',
                          )}
                          style={{
                            top: 10 * u,
                            transform: `scale(${u})`,
                            transformOrigin: 'top center',
                          }}
                        >
                          {rowsDrag.blocked
                            ? `${rowsDrag.rows} lignes — bloqué par le contenu, remontez d’abord les blocs`
                            : `${rowsDrag.rows} lignes`}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Contenu qui déborde de ses cellules : liseré orange —
                      la grille ne se déforme jamais, on agrandit le bloc. */}
                  {overflows.map((o) => (
                    <div
                      key={`ov-${o.id}`}
                      title="Le contenu dépasse les cellules du bloc — agrandissez-le (poignée basse ou ⇧+↓)."
                      className="absolute border border-dashed border-amber-500/80"
                      style={{
                        left: o.left,
                        top: o.top,
                        width: o.width,
                        height: o.height,
                        borderWidth: u,
                      }}
                    />
                  ))}

                  {/* Cellules cibles pendant un geste */}
                  {activeGesture && (
                    <GestureHighlight gesture={activeGesture} />
                  )}
                  {palette?.target && (
                    <PaletteHighlight
                      metrics={metrics}
                      target={palette.target}
                    />
                  )}

                  {/* Cadre de sélection + poignées */}
                  {selectionRect && !activeGesture && selected && (
                    <div
                      className={cn(
                        'absolute',
                        selectionRect.isGridItem
                          ? 'ring-[1.5px] ring-sky-500'
                          : 'ring-1 ring-sky-400/70',
                      )}
                      style={{
                        left: selectionRect.left,
                        top: selectionRect.top,
                        width: selectionRect.width,
                        height: selectionRect.height,
                      }}
                    >
                      {selectionRect.isGridItem &&
                        (
                          [
                            ['nw', 0, 0, 'nwse-resize'],
                            ['n', 50, 0, 'ns-resize'],
                            ['ne', 100, 0, 'nesw-resize'],
                            ['e', 100, 50, 'ew-resize'],
                            ['se', 100, 100, 'nwse-resize'],
                            ['s', 50, 100, 'ns-resize'],
                            ['sw', 0, 100, 'nesw-resize'],
                            ['w', 0, 50, 'ew-resize'],
                          ] as const
                        ).map(([dir, x, y, cursor]) => (
                          <div
                            key={dir}
                            data-editor-ui
                            onPointerDown={(e) => {
                              e.stopPropagation()
                              if (selectedId) beginGesture(e, selectedId, dir)
                            }}
                            className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-[2px] border border-sky-500 bg-white"
                            style={{
                              left: `${x}%`,
                              top: `${y}%`,
                              width: 9 * u,
                              height: 9 * u,
                              cursor,
                            }}
                          />
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Quadrillage, dessiné hors échelle ────────────────────
                En coordonnées écran, chaque trait arrondi au pixel
                physique : tous rigoureusement identiques, aucun transform
                fractionnaire pour les épaissir. */}
            {editing && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {metrics.map((m) => {
                  const L = (v: number) => snapAbs(origin.x, (m.left + v) * scale)
                  const T = (v: number) => snapAbs(origin.y, (m.top + v) * scale)
                  const W = m.width * scale
                  const H = m.height * scale
                  return (
                    <div key={m.id}>
                      {m.cols.slice(0, -1).map(([, end], i) => (
                        <div
                          key={`c${i}`}
                          className="absolute bg-slate-500/15"
                          style={{
                            left: L(end + m.colGap / 2),
                            top: T(0),
                            width: hairCss,
                            height: H,
                          }}
                        />
                      ))}
                      {m.rows.slice(0, -1).map(([, end], i) => (
                        <div
                          key={`r${i}`}
                          className="absolute bg-slate-500/15"
                          style={{
                            top: T(end + m.rowGap / 2),
                            left: L(0),
                            height: hairCss,
                            width: W,
                          }}
                        />
                      ))}
                      {/* Cadre */}
                      <div
                        className="absolute bg-slate-500/25"
                        style={{ left: L(0), top: T(0), width: W, height: hairCss }}
                      />
                      <div
                        className="absolute bg-slate-500/25"
                        style={{ left: L(0), top: T(m.height) - hairCss, width: W, height: hairCss }}
                      />
                      <div
                        className="absolute bg-slate-500/25"
                        style={{ left: L(0), top: T(0), width: hairCss, height: H }}
                      />
                      <div
                        className="absolute bg-slate-500/25"
                        style={{ left: L(m.width) - hairCss, top: T(0), width: hairCss, height: H }}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Panneau droit : propriétés ───────────────────────────── */}
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
                styleBreakpoint={viewport === 'desktop' ? 'base' : viewport}
                onDelete={deleteWithHistory}
                onConvert={convertWithHistory}
                onDraft={applyDraft}
              />
            ) : (
              <div className="p-5 text-[0.78rem] leading-relaxed text-muted-foreground">
                <p className="mb-2 font-medium text-foreground">Rien de sélectionné</p>
                <p>
                  Cliquez sur un élément de la page pour le modifier, ou
                  glissez un bloc depuis l’onglet « Ajouter » vers une grille.
                </p>
                <p className="mt-3">
                  Déplacez à la souris — tout s’aligne sur la grille. Flèches
                  pour ajuster cellule par cellule, ⇧ + flèches pour
                  redimensionner, ⌘Z pour annuler.
                </p>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Fantôme de la palette, hors échelle (coordonnées écran) */}
      {palette && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-md border border-sky-500 bg-white px-2.5 py-1 text-[0.75rem] text-sky-700 shadow-md"
          style={{ left: palette.x, top: palette.y }}
        >
          {palette.label}
        </div>
      )}
    </div>
  )

  /* ── Sous-composants d'overlay ─────────────────────────────────────
     Fermetures sur `metrics` : déclarés ici pour rester triviaux. */

  function GestureHighlight({ gesture: g }: { gesture: Gesture }) {
    const m = metrics.find((x) => x.id === g.canvasId) ?? g.metrics
    const rect = placementRect(m, g.last)
    return (
      <div
        className="absolute"
        style={{ left: m.left, top: m.top }}
      >
        <div
          className="absolute rounded-[2px] bg-sky-500/10 ring-[1.5px] ring-sky-500"
          style={rect}
        />
        <div
          className="absolute rounded bg-sky-600 px-1.5 py-0.5 text-[0.65rem] font-medium text-white"
          style={{
            left: rect.left,
            top: rect.top + rect.height + 6,
            transform: `scale(${u})`,
            transformOrigin: 'top left',
          }}
        >
          {g.last.colSpan} × {g.last.rowSpan}
        </div>
      </div>
    )
  }

  function PaletteHighlight({
    metrics: all,
    target,
  }: {
    metrics: CanvasMetrics[]
    target: NonNullable<PaletteDrag['target']>
  }) {
    const m = all.find((x) => x.id === target.canvasId)
    if (!m) return null
    const rect = placementRect(m, target.placement)
    return (
      <div className="absolute" style={{ left: m.left, top: m.top }}>
        <div
          className="absolute rounded-[2px] border-2 border-dashed border-sky-500 bg-sky-500/10"
          style={rect}
        />
      </div>
    )
  }
}
