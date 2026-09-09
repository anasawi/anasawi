'use client'

import { useMemo, useState } from 'react'
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
  const [active, setActive] = useState<string>(
    templateLibrary[0]?.category ?? '',
  )

  const searching = query.trim().length > 0
  const q = query.trim().toLowerCase()

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

  const pick = async (fn: () => Promise<void>, key: string) => {
    setBusy(key)
    try {
      await fn()
      onOpenChange(false)
      setQuery('')
    } catch {
      toast.error('Impossible d’ajouter cette section.')
    } finally {
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
        'group rounded-lg border border-border p-2.5 text-left transition-colors',
        'hover:border-foreground/30 focus-visible:border-foreground/40',
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
        'group relative rounded-lg border border-border p-2.5 transition-colors hover:border-foreground/30',
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
      <button
        type="button"
        title="Supprimer ce modèle"
        onClick={(e) => {
          e.stopPropagation()
          void onDeleteSaved(model.id).then(() =>
            toast.success('Modèle supprimé.'),
          )
        }}
        className="absolute right-2 top-2 hidden rounded-md bg-white/90 p-1.5 text-neutral-400 shadow-sm transition-colors hover:text-red-600 group-hover:block"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[82vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-0 border-b border-border px-5 py-3">
          <div className="flex items-center justify-between gap-6 pr-8">
            <DialogTitle className="shrink-0 font-serif text-[1.05rem] font-normal">
              Choisir un modèle de section
            </DialogTitle>
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un modèle…"
                className="h-8 w-full rounded-md border border-border bg-transparent pl-8 pr-3 text-[0.8rem] outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40"
              />
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          {/* Catégories */}
          {!searching && (
            <nav className="w-44 shrink-0 space-y-0.5 overflow-y-auto border-r border-border p-2.5">
              {saved.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActive(MINE)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[0.78rem] transition-colors',
                    active === MINE
                      ? 'bg-secondary text-foreground'
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
              )}
              {templateLibrary.map((group) => (
                <button
                  key={group.category}
                  type="button"
                  onClick={() => setActive(group.category)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[0.78rem] transition-colors',
                    active === group.category
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {group.category}
                  <span className="text-[0.65rem] text-muted-foreground">
                    {group.options.length}
                  </span>
                </button>
              ))}
            </nav>
          )}

          {/* Previews */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {searching && results ? (
              results.options.length + results.mine.length === 0 ? (
                <p className="py-16 text-center text-[0.82rem] text-muted-foreground">
                  Aucun modèle ne correspond à « {query.trim()} ».
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {results.mine.map(savedCard)}
                  {results.options.map(templateCard)}
                </div>
              )
            ) : active === MINE ? (
              <div className="grid grid-cols-2 gap-4">
                {saved.map(savedCard)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
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

const PREVIEW_WIDTH = 1280
const PREVIEW_SCALE = 0.175

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

  return (
    <div
      className="pointer-events-none h-40 overflow-hidden rounded-md border border-border bg-white"
      aria-hidden="true"
    >
      <div
        style={{
          width: PREVIEW_WIDTH,
          transform: `scale(${PREVIEW_SCALE})`,
          transformOrigin: 'top left',
        }}
      >
        <MotionProvider>
          <SectionsView
            sections={[section]}
            data={data}
            breakpoint="desktop"
          />
        </MotionProvider>
      </div>
    </div>
  )
}
