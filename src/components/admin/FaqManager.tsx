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
  DialogDescription,
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
  /* Erreurs du serveur, champ par champ, affichées sous le champ fautif. */
  const [erreurs, setErreurs] = useState<Record<string, string[]>>({})
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
      if (result.ok) toast.success('Ordre enregistré.')
      else {
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

      /*
       * L'état local fait foi — comme dans l'écran des accompagnements, et
       * pour la même raison : un effet qui recopierait les props écraserait
       * l'ordre obtenu au glisser-déposer. Il faut donc écrire ici ce que
       * le serveur vient d'enregistrer. Sans cela, `router.refresh()` seul
       * ne changeait RIEN à l'écran : la question créée n'apparaissait pas,
       * et la question modifiée gardait son ancien texte. La notification
       * confirmait pourtant, ce qui est la pire des combinaisons.
       */
      setErreurs({})
      if (draft.id) {
        const result = await updateFaq(draft.id, payload)
        if (!result.ok) {
          setErreurs(result.fieldErrors ?? {})
          toast.error(result.error)
          return
        }

        toast.success('Question enregistrée.')
        setItems((prev) =>
          prev.map((i) =>
            i.id === draft.id ? { ...i, ...payload, updatedAt: new Date() } : i,
          ),
        )
      } else {
        const result = await createFaq(payload)
        if (!result.ok) {
          setErreurs(result.fieldErrors ?? {})
          toast.error(result.error)
          return
        }

        toast.success('Question enregistrée.')
        const maintenant = new Date()
        setItems((prev) => [
          ...prev,
          {
            ...payload,
            id: result.data.id,
            sortOrder: prev.length,
            createdAt: maintenant,
            updatedAt: maintenant,
          },
        ])
      }

      setDraft(null)
      router.refresh()
    })
  }

  return (
    <>
      <p className="mb-4 rounded-lg border border-blue-deep/20 bg-blue-mist/30 px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-foreground">
        Les modifications sont visibles sur le site dès que vous enregistrez.
      </p>

      {/* Sur téléphone, le texte et le bouton passent l'un sous l'autre. */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12.5px] leading-[1.5] text-muted-foreground">
          Les questions visibles aident aussi Google à mieux présenter votre
          site.
        </p>
        <Button className="shrink-0" onClick={() => setDraft(emptyDraft)}>
          <Plus />
          Nouvelle question
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-border bg-white px-6 py-14 text-center">
          <p className="text-[13px] leading-[1.6] text-muted-foreground">
            Aucune question pour l’instant. Commencez par celles qu’on vous
            pose le plus souvent.
          </p>
          <Button className="mt-4" onClick={() => setDraft(emptyDraft)}>
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
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-white">
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
                        toast.success(
                          checked
                            ? 'Question affichée sur le site.'
                            : 'Question masquée du site.',
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
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {draft?.id ? 'Modifier la question' : 'Nouvelle question'}
            </DialogTitle>
            <DialogDescription>
              {draft?.id
                ? 'Vos changements seront visibles sur le site dès l’enregistrement.'
                : 'Écrivez la question comme vos visiteurs la posent, puis votre réponse.'}
            </DialogDescription>
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
                  placeholder="Combien de temps dure une séance ?"
                  aria-invalid={erreurs.question ? true : undefined}
                  aria-describedby={erreurs.question ? 'f-question-erreur' : undefined}
                  onChange={(e) =>
                    setDraft({ ...draft, question: e.target.value })
                  }
                />
                <ErreurChamp id="f-question-erreur" messages={erreurs.question} />
              </div>

              <div>
                <Label htmlFor="f-answer" className="mb-2 block">
                  Réponse
                </Label>
                <Textarea
                  id="f-answer"
                  rows={6}
                  value={draft.answer}
                  aria-invalid={erreurs.answer ? true : undefined}
                  aria-describedby={erreurs.answer ? 'f-answer-erreur' : undefined}
                  onChange={(e) =>
                    setDraft({ ...draft, answer: e.target.value })
                  }
                />
                <ErreurChamp id="f-answer-erreur" messages={erreurs.answer} />
                <p className="mt-1.5 text-xs leading-[1.5] text-muted-foreground">
                  Quelques phrases suffisent. Ce texte apparaît tel quel sur
                  le site.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-2.5">
                <Label htmlFor="f-active" className="cursor-pointer text-[13px] text-foreground">
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

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDraft(null)}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button
              onClick={save}
              disabled={
                pending || !draft?.question.trim() || !draft?.answer.trim()
              }
              aria-busy={pending}
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
        /* `flex-wrap` : sur téléphone, les commandes passent sous le texte
           plutôt que de l'écraser. */
        'flex flex-wrap items-center gap-x-3 gap-y-2 bg-white px-3 py-3 transition-colors duration-150 hover:bg-ivory/50 sm:px-4',
        isDragging && 'relative z-10 rounded-lg border border-border shadow-sm',
        !item.isActive && 'opacity-60',
      )}
    >
      {/* Poignée toujours visible — rien n'apparaît seulement au survol,
          qui n'existe pas au doigt. */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Déplacer « ${item.question} »`}
        className="flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="min-w-[9rem] flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-medium">
          {item.question}
          {!item.isActive && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Masquée
            </span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {truncate(item.answer, 110)}
        </p>
      </div>

      {/* Chaque commande NOMME sa question. « Modifier » et « Afficher
          cette question » répétés à l'identique sur dix lignes ne disent
          rien à qui navigue au lecteur d'écran : il entend dix fois le
          même libellé sans savoir lequel agit sur quoi. */}
      <span className="ml-auto flex shrink-0 items-center gap-1">
        <span className="mr-1 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="hidden text-xs text-muted-foreground sm:inline"
          >
            Visible
          </span>
          <Switch
            checked={item.isActive}
            onCheckedChange={onToggle}
            aria-label={`Afficher « ${item.question} »`}
          />
        </span>

        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label={`Modifier « ${item.question} »`}
          title="Modifier"
        >
          <Pencil />
        </Button>

        <ConfirmDelete
          label={item.question}
          description="Cette question disparaîtra du site immédiatement. Cette action est définitive."
          onConfirm={onDeleted}
        />
      </span>
    </li>
  )
}

/** Message d'erreur sous un champ — annoncé au lecteur d'écran. */
function ErreurChamp({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages || messages.length === 0) return null
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs leading-[1.5] text-red-700">
      {messages[0]}
    </p>
  )
}
