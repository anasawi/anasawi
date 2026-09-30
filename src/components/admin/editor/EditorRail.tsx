'use client'

import type { ComponentProps } from 'react'
import { PanelLeft } from 'lucide-react'

import { SectionRail } from '../SectionRail'
import { cn } from '@/lib/utils'

/**
 * La liste des sections, à gauche — ou, repliée, une bande à icône qui
 * la rouvre en volet flottant au-dessus de la page.
 */
export function EditorRail({
  collapsed,
  overlay,
  onExpand,
  count,
  ...rail
}: ComponentProps<typeof SectionRail> & {
  /** Sous 1280 px avec l'inspecteur ouvert, ou sur téléphone. */
  collapsed: boolean
  /** La liste est ouverte par-dessus la page. */
  overlay: boolean
  onExpand: () => void
  /** Nombre de sections, affiché sous l'icône quand la liste est repliée. */
  count: number
}) {
  if (collapsed) {
    return (
      <div className="flex w-11 shrink-0 flex-col items-center border-r border-border bg-ivory pt-3">
        <button
          type="button"
          onClick={onExpand}
          aria-label="Afficher la liste des sections"
          title="Sections de la page"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-deep/50"
        >
          <PanelLeft className="h-4 w-4" strokeWidth={1.6} />
        </button>
        <span className="mt-1 text-[12px] tabular-nums text-stone">{count}</span>
      </div>
    )
  }
  return (
    <div className={cn(overlay && 'absolute inset-y-0 left-0 z-30 flex')}>
      <SectionRail {...rail} />
    </div>
  )
}
