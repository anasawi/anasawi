import { cn } from '@/lib/utils'

/**
 * Une carte de formulaire : un titre en capitales, une note qui dit à
 * quoi servent les champs, puis les champs — en grille de deux colonnes
 * par défaut, ou libres (`layout="stack"`) quand la carte compose sa
 * propre mise en page.
 *
 * `id` sert d'ancre (`#horaires`) : `scroll-mt` laisse l'air du haut.
 */
export function SectionCard({
  id,
  title,
  note,
  actions,
  layout = 'grid',
  children,
}: {
  id: string
  title: string
  note?: string
  /** Boutons à droite du titre (ex. « Revenir à la charte »). */
  actions?: React.ReactNode
  layout?: 'grid' | 'stack'
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 rounded-xl border border-border bg-white px-[22px] py-5"
    >
      <div
        className={cn(
          actions && 'flex flex-wrap items-start justify-between gap-3',
        )}
      >
        <div>
          <h2 className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {title}
          </h2>
          {note && (
            <p className="mt-1.5 max-w-[62ch] text-[12px] leading-[1.6] text-muted-foreground">
              {note}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-1.5">{actions}</div>}
      </div>
      <div className={cn('mt-4', layout === 'grid' && 'grid gap-4 sm:grid-cols-2')}>
        {children}
      </div>
    </section>
  )
}
