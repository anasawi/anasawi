'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { flushSync } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  Eye,
  Monitor,
  MoreHorizontal,
  PanelLeft,
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
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { GRID_VIEWPORTS, type Breakpoint } from '@/lib/grid'
import { identityCss } from '@/lib/identity'
import { hasUnpublishedChanges, projectSection } from '@/lib/publish'
import type { SectionSettings } from '@/lib/section-settings'
import { cn } from '@/lib/utils'
import {
  deleteSavedSection,
  deleteSection,
  discardDraft,
  duplicateSection,
  insertSavedSection,
  insertSection,
  publishPage,
  renameSection,
  reorderSections,
  restoreSections,
  toggleSection,
  updateTextField,
} from '@/server/actions/pages'
import { fail, type ActionResult } from '@/server/actions/types'
import type { SavedSection, Section } from '@/server/db/schema'
import { MotionProvider } from '@/components/motion/MotionProvider'
import { AdminPill, EyeIcon } from '@/components/site/AdminPill'
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

/** Les trois seuls états que la barre du haut sait dire. */
type PublishState = 'live' | 'pending' | 'never'

const PUBLISH_STATUS: Record<
  PublishState,
  { label: string; dot: string; pill: string }
> = {
  live: {
    label: 'En ligne',
    dot: 'bg-[#3e9e6f]',
    pill: 'bg-[#e8f4ec] text-[#256b47]',
  },
  pending: {
    label: 'Modifications à publier',
    dot: 'bg-[#c98a2d]',
    pill: 'bg-[#fdf4e4] text-[#8a5f1e]',
  },
  never: {
    label: 'Jamais publiée',
    dot: 'bg-muted-foreground/50',
    pill: 'bg-muted text-muted-foreground',
  },
}

/** Anneau de focus clavier commun aux boutons de la barre du haut. */
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-deep/50'

/** Sections racine, dans l'ordre de la page. */
function rootsOf(sections: Section[]): Section[] {
  return sections
    .filter((s) => !s.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

/** Une ligne et ses enfants directs — ce qu'une suppression emporte. */
function subtreeOf(sections: Section[], id: string): Section[] {
  return sections.filter((s) => s.id === id || s.parentId === id)
}

/** Projection d'une ligne pour `restoreSections` (le ⌘Z d'une suppression). */
function snapshotRow(row: Section) {
  return {
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
    styles: row.styles ?? null,
    placement: row.placement ?? null,
    settings: row.settings ?? null,
  }
}

/**
 * L'éditeur de page du CMS — la philosophie « modèle → contenu ».
 *
 * À gauche, la liste des sections de la page. Au centre, la vraie page.
 * À droite, le formulaire de la section sélectionnée, en enregistrement
 * automatique : on choisit un beau design, on remplit ses informations —
 * jamais de grille, de coordonnées ni de CSS.
 *
 * Modèle d'édition : brouillon automatique + « Publier ». Toute mutation
 * est appliquée à l'état local d'abord, écrite ensuite via une file
 * d'actions sérialisée ; en cas d'échec, l'état précédent revient avec un
 * message. Aucun `router.refresh()` réflexe : seuls Publier et Annuler
 * les modifications rechargent la page depuis le serveur.
 */
export function TemplateEditor({
  pageId,
  pageTitle,
  pageSlug,
  isHome,
  publishedSnapshot,
  publishedAt,
  initialSections,
  data,
  saved,
  pages,
  userName,
}: {
  pageId: string
  pageTitle: string
  /** Slug public — la cible de « Voir le site ». */
  pageSlug: string
  isHome: boolean
  /** Instantané servi au public — sert à l'indicateur d'état. */
  publishedSnapshot: unknown
  publishedAt: Date | null
  initialSections: Section[]
  data: SectionsViewData
  /** Modèles personnels (« Mes sections »). */
  saved: SavedSection[]
  /** Toutes les pages du site — le menu de la barre du haut. */
  pages: EditorPage[]
  /** Pour la pilule du bas (initiale de l'avatar). */
  userName: string
}) {
  const router = useRouter()

  /* ── État local des sections — la source de vérité de l'éditeur ──── */

  const [sections, setSections] = useState(initialSections)
  /** Miroir synchrone de `sections` : les callbacks lisent toujours l'état
      courant, jamais une fermeture obsolète. */
  const sectionsRef = useRef(initialSections)

  const commitSections = useCallback(
    (update: (prev: Section[]) => Section[]) => {
      /* Toujours dans l'ordre de la page : le rendu suit l'ordre du
         tableau, et une ligne insérée « en fin de tableau » s'affichait
         en bas de page le temps d'un aller-retour serveur — le centrage
         mesurait alors la mauvaise position. */
      const next = [...update(sectionsRef.current)].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      )
      sectionsRef.current = next
      setSections(next)
    },
    [],
  )

  /** État d'écriture du panneau — la petite ligne sous l'indicateur. */
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving'>(
    'saved',
  )
  const saveStateRef = useRef(saveState)
  const onSaveStateChange = useCallback(
    (state: 'saved' | 'dirty' | 'saving') => {
      saveStateRef.current = state
      setSaveState(state)
    },
    [],
  )

  /* Rechargement serveur (après Publier / Annuler les modifications, et
     à chaque action serveur qui revalide la page) : la base redevient la
     référence — sauf pendant une frappe, où l'état local est plus récent
     que ce que le serveur renvoie. */
  useEffect(() => {
    if (saveStateRef.current !== 'saved') return
    sectionsRef.current = initialSections
    setSections(initialSections)
  }, [initialSections])

  /* Modèles personnels — mis à jour localement, sans rechargement. */
  const [savedList, setSavedList] = useState(saved)
  useEffect(() => setSavedList(saved), [saved])

  /* Version en ligne — locale pour passer au vert dès la publication,
     resynchronisée au rechargement. */
  const [snapshot, setSnapshot] = useState<unknown>(publishedSnapshot)
  const [publishedOn, setPublishedOn] = useState<Date | null>(publishedAt)
  useEffect(() => {
    setSnapshot(publishedSnapshot)
    setPublishedOn(publishedAt)
  }, [publishedSnapshot, publishedAt])

  const [viewport, setViewport] = useState<Breakpoint>('desktop')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  /** Section dont la suppression attend confirmation (ligne du rail). */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  /** Boîte « Annuler les modifications non publiées ». */
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [discarding, setDiscarding] = useState(false)

  /* ── Fenêtre étroite : la liste se replie quand l'inspecteur est ouvert
     (le canvas garde toujours au moins 520 px) ; une icône la rouvre,
     flottante au-dessus de la page. ───────────────────────────────── */
  const [wide, setWide] = useState(true)
  const [railOverlay, setRailOverlay] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const sync = () => setWide(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  /* Fenêtre élargie ou inspecteur fermé : la liste reprend sa place. */
  useEffect(() => {
    if (wide || !selectedId) setRailOverlay(false)
  }, [wide, selectedId])

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
  /** Position choisie par un « + » du canvas : avant la section `beforeId`,
      ou en fin de page (`beforeId` nul). Nul tout court = la bibliothèque a
      été ouverte depuis le rail. */
  const insertIndexRef = useRef<{ beforeId: string | null } | null>(null)

  /** Section tout juste ajoutée : rail mis en évidence, inspecteur ouvert
      sur « Contenu ». */
  const [freshId, setFreshId] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Section à amener au centre du canvas au prochain rendu. */
  const scrollToRef = useRef<string | null>(null)

  /** Écriture forcée du reliquat de frappe de l'inspecteur. */
  const flushDraftRef = useRef<(() => Promise<void>) | null>(null)

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
    if (!selected) onSaveStateChange('saved')
  }, [selected, onSaveStateChange])

  /* Une frappe pas encore écrite : le navigateur demande confirmation
     avant de fermer ou recharger l'onglet. */
  useEffect(() => {
    if (saveState === 'saved') return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [saveState])

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

  const roots = useMemo(() => rootsOf(sections), [sections])

  /* ── File d'actions serveur ──────────────────────────────────────── */

  /**
   * Une seule action en vol à la fois. Deux requêtes d'actions serveur
   * concurrentes se faisaient annuler (`ERR_ABORTED`) dès qu'un
   * rechargement partait au milieu : la file les met en rang, et
   * l'inspecteur y fait passer son enregistrement automatique.
   */
  const queueRef = useRef<Promise<unknown>>(Promise.resolve())
  const enqueue = useCallback(
    <T extends ActionResult<unknown>>(fn: () => Promise<T>): Promise<T> => {
      /* Une action qui REJETTE (réseau coupé, serveur injoignable) devient
         un résultat en échec : chaque appelant affiche son message et
         restaure son état, au lieu d'une promesse rejetée silencieuse. */
      const attempt = (): Promise<T> =>
        fn().catch(
          (): T =>
            fail(
              'Connexion impossible — vérifiez votre réseau et réessayez.',
            ) as unknown as T,
        )
      const run = queueRef.current.then(attempt, attempt)
      queueRef.current = run.catch(() => undefined)
      return run
    },
    [],
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

  /* ── Menu « ⋯ » à côté de Publier ────────────────────────────────── */

  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!moreOpen) return
    const onDown = (e: PointerEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [moreOpen])

  /* ── Historique (⌘Z / ⌘⇧Z) ───────────────────────────────────────── */

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

  /* Chaque entrée met l'état local à jour elle-même et passe par la
     file : rien à recharger ici. */
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
        if (pageMenuOpen || moreOpen) {
          setPageMenuOpen(false)
          setMoreOpen(false)
        } else if (confirmDeleteId) {
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
    moreOpen,
    pageMenuOpen,
    railOverlay,
    runHistory,
    selectedId,
    wide,
  ])

  /* ── Mesures : échelle + cadre de sélection ──────────────────────── */

  useLayoutEffect(() => {
    const pane = paneRef.current
    if (!pane) return
    const ro = new ResizeObserver(() => setPaneWidth(pane.clientWidth))
    ro.observe(pane)
    setPaneWidth(pane.clientWidth)
    return () => ro.disconnect()
  }, [])

  /* `remeasure` lit l'échelle et la sélection via des refs synchronisées :
     son identité reste stable, et le ResizeObserver ci-dessous n'est plus
     démonté/remonté à chaque sélection ni à chaque redimensionnement du
     volet. Les refs sont mises à jour dans un effet de layout déclaré
     AVANT ceux qui mesurent — les effets s'exécutent dans l'ordre. */
  const scaleRef = useRef(scale)
  const selectedIdRef = useRef(selectedId)
  useLayoutEffect(() => {
    scaleRef.current = scale
    selectedIdRef.current = selectedId
  }, [scale, selectedId])

  const remeasure = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    const currentScale = scaleRef.current
    const currentSelectedId = selectedIdRef.current
    setStageHeight(stage.offsetHeight)

    const stageBox = stage.getBoundingClientRect()
    const rects = Array.from(
      stage.querySelectorAll<HTMLElement>('[data-block-root]'),
    )
      .map((el) => {
        const r = el.getBoundingClientRect()
        return {
          id: el.dataset.blockId ?? '',
          top: (r.top - stageBox.top) / currentScale,
          height: r.height / currentScale,
        }
      })
      .sort((a, b) => a.top - b.top)
    setSectionRects(rects)

    if (currentSelectedId) {
      const el = stage.querySelector<HTMLElement>(
        `[data-block-id="${currentSelectedId}"]`,
      )
      if (el) {
        const r = el.getBoundingClientRect()
        setSelectionRect({
          top: (r.top - stageBox.top) / currentScale,
          height: r.height / currentScale,
        })
        return
      }
    }
    setSelectionRect(null)
  }, [])

  /* Une nouvelle échelle ou une nouvelle sélection demandent une mesure
     (cadre de sélection), sans toucher à l'observateur. */
  useLayoutEffect(() => {
    remeasure()
  }, [remeasure, scale, selectedId])

  useLayoutEffect(() => {
    remeasure()
    const stage = stageRef.current
    if (!stage) return
    const ro = new ResizeObserver(() => remeasure())
    ro.observe(stage)
    return () => ro.disconnect()
  }, [remeasure, sections, viewport, mode])

  /**
   * Amène une section au centre du canvas.
   *
   * Pas de `scrollIntoView` : la scène est mise à l'échelle par
   * `transform: scale()`, et `scrollIntoView` raisonne sur la géométrie
   * NON transformée — il filait tout en bas. Les rectangles rendus
   * (`getBoundingClientRect`) tiennent compte de la transformation.
   */
  const scrollStageTo = useCallback((id: string) => {
    const scroller = paneRef.current
    const el = stageRef.current?.querySelector<HTMLElement>(
      `[data-block-id="${id}"]`,
    )
    if (!scroller || !el) return
    const rect = el.getBoundingClientRect()
    const box = scroller.getBoundingClientRect()
    const wanted =
      scroller.scrollTop +
      (rect.top - box.top) -
      (scroller.clientHeight - rect.height) / 2
    const max = scroller.scrollHeight - scroller.clientHeight
    scroller.scrollTo({
      top: Math.min(Math.max(0, wanted), Math.max(0, max)),
      behavior: 'smooth',
    })
  }, [])

  /* Section ajoutée, dupliquée ou restaurée : une fois rendue, on la
     centre dans le canvas. Le conteneur de défilement n'est jamais
     remonté (pas de `key` changeante, plus de rechargement). */
  useLayoutEffect(() => {
    const id = scrollToRef.current
    if (!id) return
    const el = stageRef.current?.querySelector(`[data-block-id="${id}"]`)
    if (!el) return
    scrollToRef.current = null
    requestAnimationFrame(() => scrollStageTo(id))
  }, [sections, scrollStageTo])

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
    [flash],
  )

  /** Après un ⌘Z qui ramène une section : défilement et mise en
      évidence, sans ouvrir l'inspecteur. */
  const revealRestored = useCallback(
    (id: string) => {
      scrollToRef.current = id
      flash(id)
    },
    [flash],
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
    (id: string, position: number, patch: Partial<Section>): Section => {
      const now = new Date()
      return {
        id,
        pageId,
        parentId: null,
        columnIndex: 0,
        placement: null,
        styles: null,
        settings: null,
        name: null,
        type: 'text',
        anchor: null,
        navLabel: null,
        showInNav: false,
        sortOrder: position,
        isActive: true,
        backgroundColor: '#fcfaf7',
        payload: {},
        createdAt: now,
        updatedAt: now,
        ...patch,
      } as Section
    },
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

      const snapshot = removed.map(snapshotRow)
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
      pushHistory,
      removeLocally,
      revealRestored,
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
  }, [selectedId])

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
    [enqueue, savedList],
  )

  const onSavedCreated = useCallback((model: SavedSection) => {
    setSavedList((prev) => [model, ...prev])
  }, [])

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
    [enqueue, insertRootLocally, pushHistory, removeLocally, revealNew],
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

      const range = document.createRange()
      range.selectNodeContents(editEl)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    },
    [editing, enqueue, pushHistory, setTextLocally],
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

  /* Mémoïsé : la comparaison projette, trie et sérialise les deux états
     complets de la page — inutile de la refaire à chaque frappe si ni les
     sections ni l'instantané n'ont changé. */
  const dirty = useMemo(
    () => hasUnpublishedChanges(sections, snapshot),
    [sections, snapshot],
  )
  /* Calculé une fois par rendu (et non deux, à la garde puis au rendu). */
  const identityStyles = identityCss(data.settings.identity)
  const publishState: PublishState = !publishedOn
    ? 'never'
    : dirty
      ? 'pending'
      : 'live'
  const status = PUBLISH_STATUS[publishState]
  const canPublish = publishState !== 'live'

  /* Sous 1280 px avec l'inspecteur ouvert, la liste se replie en une
     bande à icône ; le canvas garde ≥ 520 px. */
  const railCollapsed = !wide && selected !== null && !railOverlay

  const [publishing, setPublishing] = useState(false)

  const publish = useCallback(async () => {
    setPublishing(true)
    try {
      /* Le reliquat de frappe de l'inspecteur part d'abord : ce que
         l'admin voit est ce qui sera publié. */
      await flushDraftRef.current?.()
      const result = await enqueue(() => publishPage(pageId))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      /* Vert tout de suite ; le rechargement confirme depuis la base. */
      setSnapshot(sectionsRef.current.map(projectSection))
      setPublishedOn(new Date())
      toast.success('En ligne ✓')
      router.refresh()
    } finally {
      setPublishing(false)
    }
  }, [enqueue, pageId, router])

  /* ── Annuler les modifications non publiées ──────────────────────── */

  const discard = useCallback(async () => {
    setDiscarding(true)
    try {
      /* Le brouillon en attente est écrit puis remplacé — ainsi la
         fermeture de l'inspecteur n'envoie rien vers une ligne disparue. */
      await flushDraftRef.current?.()
      flushSync(() => setSelectedId(null))

      const result = await enqueue(() => discardDraft(pageId))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      commitSections(() => result.data.sections)
      clearHistory()
      setConfirmDiscard(false)
      toast.success('Retour à la version en ligne.')
      router.refresh()
    } finally {
      setDiscarding(false)
    }
  }, [clearHistory, commitSections, enqueue, pageId, router])

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
        {/* 1. Chip de la page — ouvre le menu des pages du site. */}
        <div ref={pageMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setPageMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={pageMenuOpen}
            className={cn(
              'flex items-center gap-2 rounded-lg px-2.5 py-[5px] transition-colors hover:bg-white/90',
              FOCUS_RING,
            )}
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

        {/* 2. UN seul indicateur d'état : En ligne / Modifications à
            publier / Jamais publiée. L'enregistrement automatique se lit
            en dessous, en petit — ce n'est pas un état concurrent. */}
        <div className="flex flex-col items-start gap-[2px]">
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11.5px]',
              status.pill,
            )}
          >
            <span className={cn('h-[6px] w-[6px] rounded-full', status.dot)} />
            {status.label}
          </span>
          {selected && (
            <span
              className="pl-2.5 text-[11px] leading-none text-stone"
              aria-live="polite"
            >
              {saveState === 'saved'
                ? 'Enregistré automatiquement'
                : 'Enregistrement…'}
            </span>
          )}
        </div>

        <div className="flex-1" />

        {/* 3. Annuler / rétablir */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => void runHistory('undo')}
            disabled={historyLen.undo === 0}
            title="Annuler (⌘Z)"
            className={cn(
              'rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/90 hover:text-foreground disabled:opacity-30',
              FOCUS_RING,
            )}
          >
            <Undo2 className="h-4 w-4" strokeWidth={1.6} />
          </button>
          <button
            type="button"
            onClick={() => void runHistory('redo')}
            disabled={historyLen.redo === 0}
            title="Rétablir (⌘⇧Z)"
            className={cn(
              'rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/90 hover:text-foreground disabled:opacity-30',
              FOCUS_RING,
            )}
          >
            <Redo2 className="h-4 w-4" strokeWidth={1.6} />
          </button>
        </div>

        {/* 4. Appareils */}
        <div className="flex items-center gap-px rounded-[9px] border border-foreground/15 p-[2px]">
          {VIEWPORT_ICONS.map(({ bp, icon: Icon, label }) => (
            <button
              key={bp}
              type="button"
              title={label}
              onClick={() => setViewport(bp)}
              className={cn(
                'flex h-[26px] w-8 items-center justify-center rounded-[7px] transition-colors',
                FOCUS_RING,
                viewport === bp
                  ? 'bg-foreground text-ivory'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.6} />
            </button>
          ))}
        </div>

        {/* 5. Aperçu du brouillon (bascule) */}
        <button
          type="button"
          title={
            mode === 'edit'
              ? 'Aperçu du brouillon — la page telle qu’elle sera publiée'
              : 'Revenir à l’édition'
          }
          onClick={() => {
            setMode((m) => (m === 'edit' ? 'preview' : 'edit'))
            setSelectedId(null)
          }}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border border-foreground/15 px-3 py-[6px] text-[12.5px] text-ink-soft transition-colors hover:border-foreground hover:text-foreground',
            FOCUS_RING,
          )}
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

        {/* 6. Publier — l'action principale, inerte quand tout est en ligne. */}
        <button
          type="button"
          onClick={() => void publish()}
          disabled={publishing || !canPublish}
          title={
            canPublish
              ? 'Mettre le brouillon en ligne'
              : 'Tout est en ligne — rien à publier'
          }
          className={cn(
            'rounded-lg px-4 py-[7px] text-[12.5px] font-medium transition-all',
            FOCUS_RING,
            canPublish
              ? 'bg-blue-deep text-white hover:brightness-105'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {publishing ? 'Publication…' : 'Publier'}
        </button>

        {/* 7. Menu ⋯ — revenir à la version en ligne. */}
        <div ref={moreRef} className="relative -ml-1.5">
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            aria-label="Autres actions"
            title="Autres actions"
            className={cn(
              'rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/90 hover:text-foreground',
              FOCUS_RING,
            )}
          >
            <MoreHorizontal className="h-4 w-4" strokeWidth={1.6} />
          </button>

          {moreOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+6px)] z-40 w-72 rounded-[10px] border border-border bg-white p-1.5 shadow-[0_10px_30px_rgba(28,32,30,0.14)]"
            >
              <button
                type="button"
                role="menuitem"
                disabled={publishState !== 'pending'}
                onClick={() => {
                  setMoreOpen(false)
                  setConfirmDiscard(true)
                }}
                className="w-full rounded-[7px] px-2.5 py-[7px] text-left text-[12.5px] text-ink-soft transition-colors hover:bg-blue-mist/40 hover:text-foreground disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Annuler les modifications non publiées
                <span className="mt-0.5 block text-[11px] leading-snug text-stone">
                  {publishState === 'never'
                    ? 'Cette page n’a jamais été publiée.'
                    : publishState === 'live'
                      ? 'Le brouillon est identique à la version en ligne.'
                      : 'Revenir à la version en ligne.'}
                </span>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-x-auto">
        {/* ── Sections de la page ──────────────────────────────────── */}
        {editing && (railCollapsed ? (
          <div className="flex w-11 shrink-0 flex-col items-center border-r border-border bg-ivory pt-3">
            <button
              type="button"
              onClick={() => setRailOverlay(true)}
              aria-label="Afficher la liste des sections"
              title="Sections de la page"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-deep/50"
            >
              <PanelLeft className="h-4 w-4" strokeWidth={1.6} />
            </button>
            <span className="mt-1 text-[10.5px] tabular-nums text-stone">
              {roots.length}
            </span>
          </div>
        ) : (
          <div
            className={cn(
              railOverlay && 'absolute inset-y-0 left-0 z-30 flex',
            )}
          >
            <SectionRail
              roots={roots}
              selectedId={selectedId}
              highlightId={highlightId}
              confirmId={confirmDeleteId}
              onConfirmChange={setConfirmDeleteId}
              floating={railOverlay}
              onCollapse={() => setRailOverlay(false)}
              onSelect={(id) => {
                setSelectedId(id)
                scrollStageTo(id)
                if (railOverlay) setRailOverlay(false)
              }}
              onToggle={(section) => void toggleWithHistory(section)}
              onDuplicate={(section) => void duplicateWithHistory(section)}
              onDelete={deleteWithHistory}
              onRename={(section, value) =>
                void renameWithHistory(section, value)
              }
              reorderTo={reorderTo}
              onAdd={() => {
                /* Depuis le rail : jamais la frontière laissée par un « + »
                   survolé plus tôt — après la sélection, sinon en fin. */
                insertIndexRef.current = null
                setLibraryOpen(true)
              }}
            />
          </div>
        ))}

        {/* ── La page ──────────────────────────────────────────────── */}
        <div
          ref={paneRef}
          onPointerMove={onPaneMove}
          onPointerLeave={() => setHoverId(null)}
          onPointerDown={() => {
            if (railOverlay) setRailOverlay(false)
          }}
          className="min-h-0 min-w-[520px] flex-1 overflow-auto bg-[#eae6df] p-[22px]"
        >
          {/* Page sans section : une invitation, au centre — pas une page
              blanche muette. */}
          {editing && roots.length === 0 && (
            <div className="flex h-full min-h-[360px] items-center justify-center">
              <div className="max-w-sm rounded-[14px] border border-dashed border-line-strong bg-ivory/80 px-8 py-9 text-center">
                <p className="font-serif text-[1.15rem] text-foreground">
                  Cette page est vide.
                </p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
                  Choisissez un premier modèle dans la bibliothèque, puis
                  remplissez-le avec vos textes et vos images.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    insertIndexRef.current = null
                    setLibraryOpen(true)
                  }}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-deep px-4 py-2 text-[12.5px] font-medium text-white transition-all hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-deep/50 focus-visible:ring-offset-2"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Ajouter votre première section
                </button>
              </div>
            </div>
          )}

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
              {identityStyles && (
                <style dangerouslySetInnerHTML={{ __html: identityStyles }} />
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

                          {/* « + » aux deux frontières de la section — fixe
                              la position exacte, au clic seulement. */}
                          {(['before', 'after'] as const).map((side, pos) => (
                            <button
                              key={side}
                              type="button"
                              title="Insérer une section ici"
                              onClick={() => {
                                /* Avant cette section, ou avant la suivante
                                   (fin de page s'il n'y en a pas). */
                                insertIndexRef.current = {
                                  beforeId:
                                    side === 'before'
                                      ? r.id
                                      : (sectionRects[i + 1]?.id ?? null),
                                }
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
              pushHistory={pushHistory}
              onDelete={deleteWithHistory}
              onDraft={applyDraft}
              onSettings={applySettings}
              onSaved={onSavedCreated}
              onSaveStateChange={onSaveStateChange}
              runAction={enqueue}
              flushRef={flushDraftRef}
              initialOpen={
                selected.id === freshId ? { content: true } : undefined
              }
              simple
            />
          </aside>
        )}
      </div>

      <TemplateLibrary
        open={libraryOpen}
        onOpenChange={(open) => {
          setLibraryOpen(open)
          /* Fermée sans choisir : la frontière du « + » ne doit pas
             survivre au prochain « Ajouter une section ». */
          if (!open) insertIndexRef.current = null
        }}
        data={data}
        saved={savedList}
        onPick={addSection}
        onPickSaved={addSaved}
        onDeleteSaved={removeSaved}
      />

      {/* Pilule du bas — sans libellé d'état (la barre du haut le porte
          déjà) ; « Voir le site » ouvre la version EN LIGNE dans un
          nouvel onglet. */}
      <AdminPill
        actionLabel="Voir le site"
        actionHref={
          publishState === 'never' ? undefined : isHome ? '/' : `/${pageSlug}`
        }
        actionDisabledHint="Cette page n’est pas encore en ligne — publiez-la d’abord."
        newTab
        icon={<EyeIcon />}
        homeHref="/admin"
        name={userName}
        className="bottom-6"
      />

      {/* Confirmation — revenir à la version en ligne. */}
      <Dialog
        open={confirmDiscard}
        onOpenChange={(open) => {
          if (!discarding) setConfirmDiscard(open)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-[1.05rem] font-normal">
              Annuler les modifications non publiées ?
            </DialogTitle>
            <DialogDescription className="text-[0.82rem] leading-relaxed">
              La page reviendra exactement à sa version en ligne. Tout ce qui
              a été modifié depuis la dernière publication sera perdu, et
              l’historique ⌘Z sera vidé.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={discarding}
              onClick={() => setConfirmDiscard(false)}
            >
              Garder mon brouillon
            </Button>
            <Button
              variant="destructive"
              disabled={discarding}
              onClick={() => void discard()}
            >
              {discarding ? 'Retour en cours…' : 'Revenir à la version en ligne'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
