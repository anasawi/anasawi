'use client'

import type { Dispatch, SetStateAction } from 'react'
import Link from 'next/link'
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
  { label: string; court: string; dot: string; pill: string }
> = {
  live: {
    label: 'En ligne',
    court: 'En ligne',
    dot: 'bg-success',
    pill: 'bg-success-soft text-success-ink',
  },
  pending: {
    label: 'Modifications à publier',
    court: 'À publier',
    dot: 'bg-warning',
    pill: 'bg-warning-soft text-warning-ink',
  },
  never: {
    label: 'Jamais publiée',
    court: 'Non publiée',
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
  theme = 'classique',
}: {
  /** Le site édité — classique ou moderne (arbitrage en cours). */
  theme?: 'classique' | 'moderne'
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
      className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-card px-4 py-2.5 lg:h-[60px] lg:flex-nowrap lg:px-5 lg:py-0"
    >
      {/* 1. Où l'on est, et dans quel état : le nom de la page, l'état de
          publication, et — en clair — ce qu'il advient des modifications.
          C'est LA phrase qui répond à « est-ce que c'est enregistré ?
          est-ce que c'est en ligne ? ». */}
      <div className="flex min-w-0 items-center gap-3">
        {/* Le temps de l'arbitrage : quel site édite-t-on ? Chacun a ses
            sections et ses modèles ; le contenu (accompagnements,
            questions, médias, réglages) est commun aux deux. */}
        <span role="group" aria-label={`Site édité — ${pageTitle}`} className="flex shrink-0 items-center gap-0.5 rounded-[10px] bg-block p-[3px] text-[13px] font-medium">
          {(
            [
              ['classique', '/admin/accueil?theme=classique', 'Classique'],
              ['moderne', '/admin/accueil?theme=moderne', 'Moderne'],
            ] as const
          ).map(([t, href, libelle]) => (
            <Link
              key={t}
              href={href}
              aria-current={theme === t ? 'page' : undefined}
              className={cn(
                'rounded-[8px] px-2.5 py-1 transition-[background-color,color,box-shadow] duration-300',
                theme === t ? 'bg-white text-foreground shadow-[0_1px_2px_rgba(22,73,81,0.08)]' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {libelle}
            </Link>
          ))}
        </span>
        <span
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium',
            status.pill,
          )}
        >
          <span className={cn('h-[6px] w-[6px] rounded-full', status.dot)} />
          <span className="max-sm:hidden">{status.label}</span>
          {/* Téléphone : le nom court, en contenu CSS — un seul texte pour les lecteurs d'écran et les tests. */}
          <span aria-hidden="true" data-court={status.court} className="after:content-[attr(data-court)] sm:hidden" />
        </span>
        <span
          className="hidden text-[13px] leading-none text-muted-foreground xl:block"
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
              'flex h-9 w-9 items-center justify-center rounded-[9px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30',
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
              'flex h-9 w-9 items-center justify-center rounded-[9px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30',
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
          className="hidden items-center gap-0.5 rounded-[10px] bg-secondary p-[3px] sm:flex"
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
                'flex h-[30px] w-9 items-center justify-center rounded-[7px] transition-[background-color,color,box-shadow]',
                FOCUS_RING,
                viewport === bp
                  ? 'bg-card text-foreground shadow-xs ring-1 ring-black/[0.04]'
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
