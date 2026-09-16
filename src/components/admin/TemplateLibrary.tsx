'use client'

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Bookmark, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  blockRegistry,
  getBlock,
  templateLibrary,
  type BlockType,
  type TemplateOption,
} from '@/blocks/registry'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MotionProvider } from '@/components/motion/MotionProvider'
import { AnimProvider } from '@/components/site/anim'
import {
  SectionsView,
  type SectionsViewData,
} from '@/components/site/SectionsView'
import { cn } from '@/lib/utils'
import type { Media, SavedSection, Section } from '@/server/db/schema'

const MINE = '__mine__'

/**
 * Bibliothèque de templates — la fenêtre « Ajouter une section ».
 *
 * Chaque template est prévisualisé par un VRAI rendu : son composant, ses
 * contenus d'exemple, les images de la bibliothèque médias, le tout à
 * l'échelle. « Mes sections » liste les modèles personnels — des sections
 * personnalisées enregistrées pour être réutilisées.
 */
export function TemplateLibrary({
  open,
  onOpenChange,
  data,
  saved,
  onPick,
  onPickSaved,
  onDeleteSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: SectionsViewData
  saved: SavedSection[]
  onPick: (type: string, label: string) => Promise<void>
  onPickSaved: (saved: SavedSection) => Promise<void>
  onDeleteSaved: (id: string) => Promise<void>
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  /** Modèle personnel dont la suppression attend confirmation. */
  const [confirmSavedId, setConfirmSavedId] = useState<string | null>(null)
  const [active, setActive] = useState<string>(
    templateLibrary[0]?.category ?? '',
  )

  const searching = query.trim().length > 0
  const q = query.trim().toLowerCase()

  /* Dernier modèle personnel supprimé : l'onglet « Mes sections »
     disparaît, on revient à la première catégorie plutôt que sur une
     grille vide. */
  useEffect(() => {
    if (active === MINE && saved.length === 0) {
      setActive(templateLibrary[0]?.category ?? '')
    }
  }, [active, saved.length])

  const results = useMemo(() => {
    if (!searching) return null
    const options = templateLibrary
      .flatMap((g) => g.options)
      .filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          o.description.toLowerCase().includes(q) ||
          o.category.toLowerCase().includes(q),
      )
    const mine = saved.filter((s) => s.name.toLowerCase().includes(q))
    return { options, mine }
  }, [q, saved, searching])

  const currentGroup = templateLibrary.find((g) => g.category === active)

  /* Miroir synchrone de `busy` : deux clics dans le même tour de boucle
     (double-clic sur une carte) n'ajoutaient DEUX sections, le rendu
     n'ayant pas encore désactivé les cartes. */
  const busyRef = useRef(false)

  const pick = async (fn: () => Promise<void>, key: string) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(key)
    try {
      await fn()
      onOpenChange(false)
      setQuery('')
    } catch {
      toast.error('Impossible d’ajouter cette section.')
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }

  const templateCard = (option: TemplateOption) => (
    <button
      key={option.type}
      type="button"
      disabled={busy !== null}
      onClick={() => void pick(() => onPick(option.type, option.label), option.type)}
      className={cn(
        'group rounded-[11px] border border-border p-2.5 text-left transition-[border-color,transform] duration-150',
        'hover:-translate-y-0.5 hover:border-blue-deep focus-visible:border-blue-deep',
        busy === option.type && 'opacity-60',
      )}
    >
      <TemplatePreview type={option.type} data={data} />
      <p className="mt-2.5 text-[0.82rem] font-medium text-foreground">
        {option.label}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[0.72rem] leading-[1.5] text-muted-foreground">
        {option.description}
      </p>
    </button>
  )

  const savedCard = (model: SavedSection) => (
    <div
      key={model.id}
      className={cn(
        'group relative rounded-[11px] border border-border p-2.5 transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-blue-deep',
        busy === model.id && 'opacity-60',
      )}
    >
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void pick(() => onPickSaved(model), model.id)}
        className="block w-full text-left"
      >
        <TemplatePreview
          type={model.type as BlockType}
          data={data}
          payloadOverride={model.payload}
          backgroundColor={model.backgroundColor}
        />
        <p className="mt-2.5 flex items-center gap-1.5 text-[0.82rem] font-medium text-foreground">
          <Bookmark className="h-3 w-3 text-blue-deep" />
          {model.name}
        </p>
        <p className="mt-0.5 text-[0.72rem] text-muted-foreground">
          {getBlock(model.type)?.label ?? model.type}
        </p>
      </button>
      {confirmSavedId === model.id ? (
        /* Confirmation en place : pas de corbeille qui efface d'un clic. */
        <div
          role="alertdialog"
          aria-label="Confirmer la suppression du modèle"
          className="absolute inset-x-2 top-2 flex items-center gap-1.5 rounded-md bg-white/95 px-2 py-1.5 text-[0.72rem] text-foreground shadow-sm"
        >
          <span className="mr-auto">Supprimer ce modèle ?</span>
          <button
            type="button"
            autoFocus
            onClick={() => {
              setConfirmSavedId(null)
              /* Le constructeur retire le modèle tout de suite et signale
                 lui-même le résultat (succès ou erreur). */
              void onDeleteSaved(model.id)
            }}
            className="rounded-[5px] bg-red-600 px-2 py-[2px] text-[0.7rem] font-medium text-white hover:bg-red-700"
          >
            Supprimer
          </button>
          <button
            type="button"
            onClick={() => setConfirmSavedId(null)}
            className="rounded-[5px] border border-line-strong px-2 py-[2px] text-[0.7rem] text-ink-soft hover:text-foreground"
          >
            Annuler
          </button>
        </div>
      ) : (
        <button
          type="button"
          title="Supprimer ce modèle"
          aria-label="Supprimer ce modèle"
          onClick={(e) => {
            e.stopPropagation()
            setConfirmSavedId(model.id)
          }}
          className="absolute right-2 top-2 hidden rounded-md bg-white/90 p-1.5 text-neutral-400 shadow-sm transition-colors hover:text-red-600 focus-visible:block group-hover:block"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Large et haute : on choisit un modèle à ce qu'on voit, pas à son
          nom — les aperçus ont besoin de place. */}
      <DialogContent className="flex h-[90vh] w-[94vw] max-w-[1480px] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-0 border-b border-border px-5 py-3">
          <div className="flex items-center justify-between gap-6 pr-8">
            <DialogTitle className="shrink-0 font-serif text-[1.05rem] font-normal">
              Que voulez-vous ajouter ?
            </DialogTitle>
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un modèle…"
                aria-label="Rechercher un modèle"
                className="h-8 w-full rounded-md border border-border bg-transparent pl-8 pr-3 text-[0.8rem] outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40"
              />
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          {/* Catégories */}
          {!searching && (
            <nav className="w-44 shrink-0 space-y-0.5 overflow-y-auto border-r border-border p-2.5">
              <p className="px-2.5 pb-1 pt-2 text-[0.66rem] uppercase tracking-[0.09em] text-muted-foreground">
                Bibliothèque
              </p>
              {templateLibrary.map((group) => (
                <button
                  key={group.category}
                  type="button"
                  onClick={() => setActive(group.category)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[0.78rem] transition-colors',
                    active === group.category
                      ? 'bg-white text-foreground shadow-[0_1px_2px_rgba(28,32,30,0.05)]'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {group.category}
                  <span className="text-[0.65rem] text-muted-foreground">
                    {group.options.length}
                  </span>
                </button>
              ))}
              {saved.length > 0 && (
                <>
                  <p className="px-2.5 pb-1 pt-3 text-[0.66rem] uppercase tracking-[0.09em] text-muted-foreground">
                    Personnel
                  </p>
                  <button
                    type="button"
                    onClick={() => setActive(MINE)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[0.78rem] transition-colors',
                      active === MINE
                        ? 'bg-white text-foreground shadow-[0_1px_2px_rgba(28,32,30,0.05)]'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <Bookmark className="h-3 w-3" />
                      Mes sections
                    </span>
                    <span className="text-[0.65rem] text-muted-foreground">
                      {saved.length}
                    </span>
                  </button>
                </>
              )}
            </nav>
          )}

          {/* Previews */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {searching && results ? (
              results.options.length + results.mine.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-[0.82rem] text-muted-foreground">
                    Aucun modèle ne correspond à « {query.trim()} ».
                  </p>
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="mt-3 rounded-lg border border-line-strong px-3 py-1.5 text-[0.78rem] text-ink-soft transition-colors hover:border-blue-deep hover:text-blue-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-deep/50"
                  >
                    Effacer la recherche
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {results.mine.map(savedCard)}
                  {results.options.map(templateCard)}
                </div>
              )
            ) : active === MINE ? (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {saved.map(savedCard)}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {currentGroup?.options.map(templateCard)}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Preview : le vrai composant, à l'échelle ───────────────────────── */

/** Largeur de rendu simulée — un écran d'ordinateur. */
const PREVIEW_WIDTH = 1280
/** Au-delà, une section très haute (galerie, FAQ) écraserait la grille. */
const PREVIEW_MAX_HEIGHT = 340

/** Contenus d'exemple : les défauts du template, avec des images de la
    bibliothèque glissées dans chaque emplacement média vide. */
function previewPayload(type: BlockType, media: Media[]): unknown {
  const block = blockRegistry[type]
  const payload = block.schema.parse(block.defaults) as Record<string, unknown>

  for (const f of block.fields) {
    if (f.kind === 'media' && !payload[f.name] && media[0]) {
      payload[f.name] = media[0].id
    }
    if (
      f.kind === 'mediaList' &&
      Array.isArray(payload[f.name]) &&
      (payload[f.name] as unknown[]).length === 0
    ) {
      payload[f.name] = media.slice(0, 3).map((m) => m.id)
    }
  }
  return payload
}

export function TemplatePreview({
  type,
  data,
  payloadOverride,
  backgroundColor = '#fcfaf7',
}: {
  type: BlockType
  data: SectionsViewData
  /** Modèle personnel : son contenu réel plutôt que les défauts. */
  payloadOverride?: unknown
  backgroundColor?: string
}) {
  /* Une fausse ligne de section, jamais écrite en base — juste de quoi
     faire tourner le moteur de rendu réel. */
  const section = useMemo(
    () =>
      ({
        id: `apercu-${type}`,
        pageId: 'apercu',
        parentId: null,
        columnIndex: 0,
        placement: null,
        styles: null,
        settings: null,
        name: null,
        type,
        anchor: null,
        navLabel: null,
        showInNav: false,
        sortOrder: 0,
        isActive: true,
        backgroundColor,
        payload: payloadOverride ?? previewPayload(type, data.media),
        createdAt: new Date(),
        updatedAt: new Date(),
      }) as Section,
    [type, data.media, payloadOverride, backgroundColor],
  )

  /* L'aperçu épouse la largeur de sa carte : l'échelle se déduit de la
     mesure, au lieu d'un facteur figé qui laissait un vide à droite et
     rendait les modèles minuscules. La hauteur suit celle du contenu. */
  const frameRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ scale: 0.3, height: 180, clipped: false })

  useLayoutEffect(() => {
    const frame = frameRef.current
    const inner = innerRef.current
    if (!frame || !inner) return

    const measure = () => {
      const width = frame.clientWidth
      if (width === 0) return
      const scale = width / PREVIEW_WIDTH
      const full = inner.scrollHeight * scale
      setBox({
        scale,
        height: Math.max(120, Math.min(Math.round(full), PREVIEW_MAX_HEIGHT)),
        clipped: full > PREVIEW_MAX_HEIGHT + 1,
      })
    }

    measure()
    /* Seule la carte (`frame`) est observée : sa largeur donne l'échelle.
       `inner` est lu dans le callback (scrollHeight) mais n'est pas observé —
       son échelle est justement modifiée par la mesure, l'observer aurait
       pu boucler (« ResizeObserver loop completed… »). Le changement de
       hauteur de la carte déclenche naturellement une seconde passe. */
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [section])

  return (
    <div
      ref={frameRef}
      className="pointer-events-none relative overflow-hidden rounded-md border border-border bg-white"
      style={{ height: box.height }}
      aria-hidden="true"
    >
      <div
        ref={innerRef}
        style={{
          width: PREVIEW_WIDTH,
          transform: `scale(${box.scale})`,
          transformOrigin: 'top left',
        }}
      >
        <MotionProvider>
          {/* Animations coupées : la vignette montre l'état final, jamais
              un contenu invisible. */}
          <AnimProvider enabled={false}>
            <SectionsView
              sections={[section]}
              data={data}
              breakpoint="desktop"
            />
          </AnimProvider>
        </MotionProvider>
      </div>

      {/* Section plus haute que le cadre : un fondu dit que ça continue,
          plutôt qu'une coupe nette qui ressemble à un défaut. */}
      {box.clipped && (
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
      )}
    </div>
  )
}
