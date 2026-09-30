'use client'

import type { Dispatch, SetStateAction } from 'react'
import {
  Eye,
  Monitor,
  Pencil,
  Redo2,
  RotateCcw,
  Smartphone,
  Tablet,
  Undo2,
} from 'lucide-react'

import type { PublishState } from './usePublish'
import { ActionMenu } from '@/components/ui/action-menu'
import { Button } from '@/components/ui/button'
import type { Breakpoint } from '@/lib/grid'
import { cn } from '@/lib/utils'

export const PUBLISH_STATUS: Record<
  PublishState,
  { label: string; dot: string; pill: string }
> = {
  live: {
    label: 'En ligne',
    dot: 'bg-success',
    pill: 'bg-success-soft text-success-ink',
  },
  pending: {
    label: 'Modifications à publier',
    dot: 'bg-warning',
    pill: 'bg-warning-soft text-warning-ink',
  },
  never: {
    label: 'Jamais publiée',
    dot: 'bg-muted-foreground/50',
    pill: 'bg-muted text-muted-foreground',
  },
}

/** Anneau de focus clavier commun aux boutons de la barre du haut. */
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-deep/50'

const VIEWPORT_ICONS = [
  { bp: 'desktop' as const, icon: Monitor, label: 'Ordinateur' },
  { bp: 'tablet' as const, icon: Tablet, label: 'Tablette' },
  { bp: 'mobile' as const, icon: Smartphone, label: 'Mobile' },
]

/**
 * La barre supérieure de l'éditeur : où l'on est, dans quel état, et les
 * actions globales (annuler / rétablir, écran simulé, aperçu, publier).
 */
export function EditorTopBar({
  pageTitle,
  publishState,
  saving,
  historyLen,
  runHistory,
  viewport,
  setViewport,
  mode,
  onToggleMode,
  publishing,
  canPublish,
  onPublish,
  onDiscardRequest,
}: {
  pageTitle: string
  publishState: PublishState
  /** Une frappe ou une action pas encore écrite. */
  saving: boolean
  historyLen: { undo: number; redo: number }
  runHistory: (direction: 'undo' | 'redo') => Promise<void>
  viewport: Breakpoint
  setViewport: Dispatch<SetStateAction<Breakpoint>>
  mode: 'edit' | 'preview'
  onToggleMode: () => void
  publishing: boolean
  canPublish: boolean
  onPublish: () => void
  onDiscardRequest: () => void
}) {
  const status = PUBLISH_STATUS[publishState]

  return (
    /* Une région nommée : dans le repère principal de l'administration,
       un <header> n'est plus une « bannière » pour les lecteurs
       d'écran — on la nomme donc explicitement. */
    <header
      role="region"
      aria-label="Barre de l’éditeur"
      className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-ivory px-4 py-2.5 lg:h-[54px] lg:flex-nowrap lg:py-0"
    >
      {/* 1. Où l'on est, et dans quel état : le nom de la page, l'état de
          publication, et — en clair — ce qu'il advient des modifications.
          C'est LA phrase qui répond à « est-ce que c'est enregistré ?
          est-ce que c'est en ligne ? ». */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="max-w-48 truncate font-serif text-[15px]">{pageTitle}</span>
        <span
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[12.5px]',
            status.pill,
          )}
        >
          <span className={cn('h-[6px] w-[6px] rounded-full', status.dot)} />
          {status.label}
        </span>
        <span
          className="hidden text-[12.5px] leading-none text-stone xl:block"
          aria-live="polite"
        >
          {saving
            ? 'Enregistrement…'
            : publishState === 'pending'
              ? 'Enregistré automatiquement · visible par vos visiteurs après « Publier »'
              : publishState === 'never'
                ? 'Enregistré automatiquement · rien n’est encore en ligne'
                : 'Enregistré automatiquement · tout est en ligne'}
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex flex-wrap items-center gap-2">
        {/* 2. Annuler / rétablir : nommés, pour le clavier et le lecteur
            d'écran, avec le raccourci des deux systèmes. */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => void runHistory('undo')}
            disabled={historyLen.undo === 0}
            aria-label="Annuler la dernière modification"
            title="Annuler (⌘Z / Ctrl+Z)"
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/90 hover:text-foreground disabled:opacity-30',
              FOCUS_RING,
            )}
          >
            <Undo2 className="h-4 w-4" strokeWidth={1.6} />
          </button>
          <button
            type="button"
            onClick={() => void runHistory('redo')}
            disabled={historyLen.redo === 0}
            aria-label="Rétablir la modification annulée"
            title="Rétablir (⌘⇧Z / Ctrl+⇧Z)"
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/90 hover:text-foreground disabled:opacity-30',
              FOCUS_RING,
            )}
          >
            <Redo2 className="h-4 w-4" strokeWidth={1.6} />
          </button>
        </div>

        {/* 3. L'écran simulé */}
        {/* Sur téléphone, l'écran simulé est l'écran lui-même : le
            choix disparaît. */}
        <div
          role="group"
          aria-label="Écran simulé"
          className="hidden items-center gap-px rounded-md border border-foreground/15 p-[2px] sm:flex"
        >
          {VIEWPORT_ICONS.map(({ bp, icon: Icon, label }) => (
            <button
              key={bp}
              type="button"
              aria-label={label}
              aria-pressed={viewport === bp}
              title={label}
              onClick={() => setViewport(bp)}
              className={cn(
                'flex h-[30px] w-9 items-center justify-center rounded-[5px] transition-colors',
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

        {/* 4. Aperçu du brouillon (bascule) */}
        <Button
          type="button"
          variant="outline"
          title={
            mode === 'edit'
              ? 'Voir la page telle qu’elle sera une fois publiée'
              : 'Revenir à l’édition'
          }
          onClick={onToggleMode}
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
        </Button>

        {/* 5. Publier — l'action principale, inerte quand tout est en ligne. */}
        <Button
          type="button"
          onClick={onPublish}
          disabled={publishing || !canPublish}
          title={
            canPublish
              ? 'Mettre vos modifications en ligne'
              : 'Tout est en ligne — rien à publier'
          }
        >
          {publishing ? 'Publication…' : 'Publier'}
        </Button>

        {/* 6. Autres actions : revenir à la version en ligne. */}
        <ActionMenu
          label="Autres actions"
          size="md"
          items={[
            {
              label: 'Annuler les modifications non publiées',
              icon: <RotateCcw />,
              disabled: publishState !== 'pending',
              hint:
                publishState === 'never'
                  ? 'Cette page n’a jamais été publiée.'
                  : publishState === 'live'
                    ? 'Le brouillon est identique à la version en ligne.'
                    : 'Revenir à la version en ligne.',
              onSelect: onDiscardRequest,
            },
          ]}
        />
      </div>
    </header>
  )
}
