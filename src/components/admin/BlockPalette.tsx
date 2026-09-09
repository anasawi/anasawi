'use client'

import {
  AlignLeft,
  Heading,
  Image as ImageIcon,
  LayoutTemplate,
  List,
  Minus,
  MousePointerClick,
  MoveVertical,
  Square,
  type LucideIcon,
} from 'lucide-react'

import { blockGroups, type BlockOption } from '@/blocks/registry'
import { cn } from '@/lib/utils'

const icons: Record<string, LucideIcon> = {
  columns: LayoutTemplate,
  heading: Heading,
  text: AlignLeft,
  image: ImageIcon,
  button: MousePointerClick,
  list: List,
  divider: Minus,
  spacer: MoveVertical,
}

/**
 * Palette des blocs, à droite du constructeur.
 *
 * Les éléments sont glissables : le glisser-déposer se fait via l'API HTML
 * native plutôt que dnd-kit. La cible du dépôt est une couche superposée à
 * une iframe, dont dnd-kit ne peut pas observer les collisions — il raisonne
 * sur des nœuds du même document.
 */
export function BlockPalette({
  onDragStart,
  onDragEnd,
  onAdd,
  disabled,
}: {
  onDragStart: (option: BlockOption) => void
  onDragEnd: () => void
  onAdd: (option: BlockOption) => void
  disabled: boolean
}) {
  /* Pas de conteneur défilant propre : la palette partage désormais le
     défilement du panneau avec la liste des sections au-dessus d'elle. */
  return (
    <div>
      <p className="mb-3 text-[0.72rem] leading-[1.5] text-muted-foreground">
        Glissez un bloc sur la page, ou cliquez pour l’ajouter à la fin.
      </p>

      {blockGroups.map(({ group, options }) => (
        <div key={group} className="mb-5">
          <p className="mb-1.5 px-0.5 text-[0.65rem] font-medium uppercase tracking-[0.1em] text-muted-foreground/75">
            {group}
          </p>

          <div className="grid grid-cols-2 gap-1.5">
            {options.map((option) => {
              const Icon = icons[option.type] ?? Square

              return (
                <button
                  key={option.type}
                  type="button"
                  draggable={!disabled}
                  title={option.description}
                  disabled={disabled}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'copy'
                    /* Payload requis par Firefox pour amorcer un glisser. */
                    event.dataTransfer.setData('text/plain', option.type)
                    onDragStart(option)
                  }}
                  onDragEnd={onDragEnd}
                  onClick={() => onAdd(option)}
                  className={cn(
                    'flex cursor-grab flex-col items-start gap-2 rounded-[5px] border border-border bg-card p-2.5 text-left transition-colors duration-150',
                    'hover:border-input hover:bg-secondary/40 active:cursor-grabbing',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                >
                  <Icon
                    className="h-[15px] w-[15px] text-blue-deep/75"
                    strokeWidth={1.75}
                  />
                  <span className="text-[0.74rem] font-medium leading-tight">
                    {option.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
