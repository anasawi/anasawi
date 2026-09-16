'use client'

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Plus } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { ConfirmDelete } from './ConfirmDelete'
import { MediaPicker } from './MediaPicker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn, slugify } from '@/lib/utils'
import {
  createService,
  deleteService,
  reorderServices,
  toggleService,
  updateService,
} from '@/server/actions/content'
import type { ActionResult } from '@/server/actions/types'
import type { Media, ServiceWithMedia } from '@/server/db/schema'

type Draft = {
  id: string | null
  title: string
  slug: string
  excerpt: string
  body: string
  duration: string
  mediaId: string | null
  isActive: boolean
}

const emptyDraft: Draft = {
  id: null,
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  duration: '',
  mediaId: null,
  isActive: true,
}

export function ServicesManager({
  services: initial,
  library,
}: {
  services: ServiceWithMedia[]
  library: Media[]
}) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [pending, start] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((s) => s.id === active.id)
    const newIndex = items.findIndex((s) => s.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const next = arrayMove(items, oldIndex, newIndex)
    setItems(next)

    start(async () => {
      const result = await reorderServices(next.map((s) => s.id))
      if (!result.ok) {
        setItems(items)
        toast.error(result.error)
      }
    })
  }

  function save() {
    if (!draft) return

    start(async () => {
      const payload = {
        title: draft.title,
        slug: draft.slug || slugify(draft.title),
        excerpt: draft.excerpt,
        body: draft.body,
        duration: draft.duration || null,
        mediaId: draft.mediaId,
        isActive: draft.isActive,
      }

      const result = draft.id
        ? await updateService(draft.id, payload)
        : await createService(payload)

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success(draft.id ? 'Accompagnement enregistré.' : 'Accompagnement créé.')
      setDraft(null)
      router.refresh()
    })
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button
          className="rounded-md bg-blue-deep text-white hover:bg-blue-deep/90"
          onClick={() => setDraft(emptyDraft)}
        >
          <Plus />
          Nouvel accompagnement
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-white px-6 py-14 text-center">
          <p className="text-[13px] text-muted-foreground">
            Aucun accompagnement pour l’instant — créez le premier pour le
            présenter sur votre site.
          </p>
          <Button
            className="mt-4 rounded-md bg-blue-deep text-white hover:bg-blue-deep/90"
            onClick={() => setDraft(emptyDraft)}
          >
            <Plus />
            Créer un accompagnement
          </Button>
        </div>
      ) : (
        <DndContext
          /* Identifiant fixe : sans lui, dnd-kit génère un compteur différent
             côté serveur et côté client (`DndDescribedBy-N`) — erreur
             d'hydratation React à chaque ouverture de l'écran. */
          id="services-sortable"
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
              {items.map((service) => (
                <ServiceRow
                  key={service.id}
                  service={service}
                  onEdit={() =>
                    setDraft({
                      id: service.id,
                      title: service.title,
                      slug: service.slug,
                      excerpt: service.excerpt,
                      body: service.body,
                      duration: service.duration ?? '',
                      mediaId: service.mediaId,
                      isActive: service.isActive,
                    })
                  }
                  onToggle={(checked) =>
                    start(async () => {
                      const result = await toggleService(service.id, checked)
                      if (result.ok) {
                        setItems((prev) =>
                          prev.map((s) =>
                            s.id === service.id ? { ...s, isActive: checked } : s,
                          ),
                        )
                      } else toast.error(result.error)
                    })
                  }
                  onDeleted={async () => {
                    const result = await deleteService(service.id)
                    if (result.ok) {
                      setItems((prev) => prev.filter((s) => s.id !== service.id))
                    }
                    return result
                  }}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <Dialog
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
      >
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {draft?.id ? 'Modifier l’accompagnement' : 'Nouvel accompagnement'}
            </DialogTitle>
          </DialogHeader>

          {draft && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="s-title" className="mb-2 block">
                  Titre
                </Label>
                <Input
                  id="s-title"
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      title: e.target.value,
                      slug: draft.id ? draft.slug : slugify(e.target.value),
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="s-slug" className="mb-2 block">
                  Adresse de la page
                </Label>
                <Input
                  id="s-slug"
                  value={draft.slug}
                  onChange={(e) =>
                    setDraft({ ...draft, slug: slugify(e.target.value) })
                  }
                />
              </div>

              <div>
                <Label htmlFor="s-duration" className="mb-2 block">
                  Durée
                </Label>
                <Input
                  id="s-duration"
                  value={draft.duration}
                  placeholder="60 minutes"
                  onChange={(e) =>
                    setDraft({ ...draft, duration: e.target.value })
                  }
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="s-excerpt" className="mb-2 block">
                  Description courte
                </Label>
                <Textarea
                  id="s-excerpt"
                  rows={3}
                  value={draft.excerpt}
                  onChange={(e) =>
                    setDraft({ ...draft, excerpt: e.target.value })
                  }
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  C’est ce texte qui apparaît sur la page d’accueil.
                </p>
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="s-body" className="mb-2 block">
                  Description longue
                </Label>
                <Textarea
                  id="s-body"
                  rows={6}
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                />
              </div>

              <MediaPicker
                label="Image"
                value={draft.mediaId}
                onChange={(id) => setDraft({ ...draft, mediaId: id })}
                library={library}
              />

              <div className="flex h-fit items-center justify-between self-end rounded-md border border-border px-3.5 py-2.5">
                <Label htmlFor="s-active" className="cursor-pointer">
                  Visible sur le site
                </Label>
                <Switch
                  id="s-active"
                  checked={draft.isActive}
                  onCheckedChange={(checked) =>
                    setDraft({ ...draft, isActive: checked })
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDraft(null)}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button
              className="rounded-md bg-blue-deep text-white hover:bg-blue-deep/90"
              onClick={save}
              disabled={pending || !draft?.title.trim()}
            >
              {pending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ServiceRow({
  service,
  onEdit,
  onToggle,
  onDeleted,
}: {
  service: ServiceWithMedia
  onEdit: () => void
  onToggle: (checked: boolean) => void
  onDeleted: () => Promise<ActionResult<unknown>>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: service.id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group flex items-center gap-3 bg-white px-4 py-3 transition-colors duration-150 hover:bg-ivory/50',
        isDragging && 'relative z-10 rounded-lg border border-border shadow-sm',
        !service.isActive && 'opacity-60',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Déplacer ${service.title}`}
        className="cursor-grab touch-none text-muted-foreground/50 opacity-0 transition-opacity active:cursor-grabbing group-focus-within:opacity-100 group-hover:opacity-100"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded bg-muted">
        {service.media && (
          <Image
            src={service.media.url}
            alt={service.media.alt}
            fill
            sizes="44px"
            className="object-cover"
          />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{service.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {service.excerpt || `/${service.slug}`}
        </p>
      </div>

      <Switch
        checked={service.isActive}
        onCheckedChange={onToggle}
        aria-label={`Afficher ${service.title}`}
      />

      <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label={`Modifier ${service.title}`}
        >
          <Pencil />
        </Button>

        <ConfirmDelete label={service.title} onConfirm={onDeleted} />
      </span>
    </li>
  )
}
