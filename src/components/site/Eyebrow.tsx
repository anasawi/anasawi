import { cn } from '@/lib/utils'

/**
 * Petit label en capitales précédé d'un filet.
 * Le filet se déploie de 0 à sa largeur au scroll — le seul mouvement
 * décoratif du site, et il est purement CSS.
 */
export function Eyebrow({
  children,
  className,
  tone = 'accent',
}: {
  children: React.ReactNode
  className?: string
  tone?: 'accent' | 'muted'
}) {
  return (
    <p
      className={cn(
        'label-eyebrow flex items-center gap-4',
        tone === 'muted' && 'text-stone',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-px w-8 shrink-0',
          tone === 'accent' ? 'bg-blue' : 'bg-line',
        )}
      />
      <span>{children}</span>
    </p>
  )
}
