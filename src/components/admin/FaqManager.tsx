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
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { ConfirmDelete } from './ConfirmDelete'
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
import { cn, truncate } from '@/lib/utils'
import {
  createFaq,
  deleteFaq,
  reorderFaq,
  toggleFaq,
  updateFaq,
} from '@/server/actions/content'
import type { ActionResult } from '@/server/actions/types'
import type { FaqItem } from '@/server/db/schema'

type Draft = {
  id: string | null
  question: string
  answer: string
  category: string
  isActive: boolean
}

const emptyDraft: Draft = {
  id: null,
  question: '',
  answer: '',
  category: '',
  isActive: true,
}

export function FaqManager({ items: initial }: { items: FaqItem[] }) {
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

    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const next = arrayMove(items, oldIndex, newIndex)
    setItems(next)

    start(async () => {
      const result = await reorderFaq(next.map((i) => i.id))
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
        question: draft.question,
        answer: draft.answer,
        category: draft.category || null,
        isActive: draft.isActive,
      }

      const result = draft.id
        ? await updateFaq(draft.id, payload)
        : await createFaq(payload)

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success('Question enregistrée.')
      setDraft(null)
      router.refresh()
    })
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-[12.5px] text-muted-foreground">
          Les questions visibles aident aussi Google à mieux présenter votre
          site.
        </p>
        <Button
          className="rounded-md bg-blue-deep text-white hover:bg-blue-deep/90"
          onClick={() => setDraft(emptyDraft)}
        >
          <Plus />
          Nouvelle question
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-white px-6 py-14 text-center">
          <p className="text-[13px] text-muted-foreground">
            Aucune question pour l’instant — commencez par celles qu’on vous
            pose le plus souvent.
          </p>
          <Button
            className="mt-4 rounded-md bg-blue-deep text-white hover:bg-blue-deep/90"
            onClick={() => setDraft(emptyDraft)}
          >
            <Plus />
            Ajouter une question
          </Button>
        </div>
      ) : (
        <DndContext
          /* Identifiant fixe : sans lui, dnd-kit génère un compteur différent
             côté serveur et côté client (`DndDescribedBy-N`) — erreur
             d'hydratation React à chaque ouverture de l'écran. */
          id="faq-sortable"
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
              {items.map((item) => (
                <FaqRow
                  key={item.id}
                  item={item}
                  onEdit={() =>
                    setDraft({
                      id: item.id,
                      question: item.question,
                      answer: item.answer,
                      category: item.category ?? '',
                      isActive: item.isActive,
                    })
                  }
                  onToggle={(checked) =>
                    start(async () => {
                      const result = await toggleFaq(item.id, checked)
                      if (result.ok) {
                        setItems((prev) =>
                          prev.map((i) =>
                            i.id === item.id ? { ...i, isActive: checked } : i,
                          ),
                        )
                      } else toast.error(result.error)
                    })
                  }
                  onDeleted={async () => {
                    const result = await deleteFaq(item.id)
                    if (result.ok) {
                      setItems((prev) => prev.filter((i) => i.id !== item.id))
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {draft?.id ? 'Modifier la question' : 'Nouvelle question'}
            </DialogTitle>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="f-question" className="mb-2 block">
                  Question
                </Label>
                <Input
                  id="f-question"
                  value={draft.question}
                  onChange={(e) =>
                    setDraft({ ...draft, question: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="f-answer" className="mb-2 block">
                  Réponse
                </Label>
                <Textarea
                  id="f-answer"
                  rows={6}
                  value={draft.answer}
                  onChange={(e) =>
                    setDraft({ ...draft, answer: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-md border border-border px-3.5 py-2.5">
                <Label htmlFor="f-active" className="cursor-pointer">
                  Visible sur le site
                </Label>
                <Switch
                  id="f-active"
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
              disabled={
                pending || !draft?.question.trim() || !draft?.answer.trim()
              }
            >
              {pending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function FaqRow({
  item,
  onEdit,
  onToggle,
  onDeleted,
}: {
  item: FaqItem
  onEdit: () => void
  onToggle: (checked: boolean) => void
  onDeleted: () => Promise<ActionResult<unknown>>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group flex items-center gap-3 bg-white px-4 py-3 transition-colors duration-150 hover:bg-ivory/50',
        isDragging && 'relative z-10 rounded-lg border border-border shadow-sm',
        !item.isActive && 'opacity-60',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Déplacer « ${item.question} »`}
        className="cursor-grab touch-none text-muted-foreground/50 opacity-0 transition-opacity active:cursor-grabbing group-focus-within:opacity-100 group-hover:opacity-100"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.question}</p>
        <p className="truncate text-xs text-muted-foreground">
          {truncate(item.answer, 110)}
        </p>
      </div>

      <Switch
        checked={item.isActive}
        onCheckedChange={onToggle}
        aria-label="Afficher cette question"
      />

      <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label="Modifier"
        >
          <Pencil />
        </Button>

        <ConfirmDelete label={item.question} onConfirm={onDeleted} />
      </span>
    </li>
  )
}
