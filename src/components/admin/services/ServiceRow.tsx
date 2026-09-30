'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil } from 'lucide-react'
import Image from 'next/image'

import { ConfirmDelete } from '../ConfirmDelete'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { ActionResult } from '@/server/actions/types'
import type { ServiceWithMedia } from '@/server/db/schema'

/** Une ligne d'accompagnement : poignée, vignette, titre, commandes. */
export function ServiceRow({
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
        /* `flex-wrap` : sur téléphone, les commandes passent sous le texte
           plutôt que de l'écraser. */
        'flex flex-wrap items-center gap-x-3 gap-y-2 bg-white px-3 py-3 transition-colors duration-150 hover:bg-ivory/50 sm:px-4',
        /* C'est le calque qu'on suit : l'original marque la place. */
        isDragging && 'opacity-35',
        !service.isActive && 'opacity-60',
      )}
    >
      {/* Poignée toujours visible — rien n'apparaît seulement au survol. */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Déplacer ${service.title}`}
        className="flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
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

      <div className="min-w-[9rem] flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-medium">
          {service.title}
          {service.method && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[12px] font-medium text-muted-foreground">
              {service.method}
            </span>
          )}
          {!service.isActive && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[12px] font-medium text-muted-foreground">
              Masqué
            </span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {service.excerpt || 'Aucune description courte pour l’instant.'}
        </p>
      </div>

      <span className="ml-auto flex shrink-0 items-center gap-1">
        {/* Le mot « Visible » explique l'interrupteur ; l'aria-label reste
            le nom complet, propre à chaque ligne. */}
        <span className="mr-1 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="hidden text-xs text-muted-foreground sm:inline"
          >
            Visible
          </span>
          <Switch
            checked={service.isActive}
            onCheckedChange={onToggle}
            aria-label={`Afficher ${service.title}`}
          />
        </span>

        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label={`Modifier ${service.title}`}
          title="Modifier"
        >
          <Pencil />
        </Button>

        <ConfirmDelete
          label={service.title}
          description="Cet accompagnement disparaîtra du site immédiatement. Cette action est définitive."
          onConfirm={onDeleted}
        />
      </span>
    </li>
  )
}
