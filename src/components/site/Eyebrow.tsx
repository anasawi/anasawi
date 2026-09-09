import { cn } from '@/lib/utils'

/**
 * Label supérieur de section — « ✳  QUI JE SUIS ».
 *
 * L'astérisque signature remplace l'ancien filet : c'est le méta-texte de la
 * planche V8, en capitales espacées de 0.24em. La couleur vient du thème de
 * la section (`--color-blue-deep` est recalculé sur fond sombre).
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
        'flex items-baseline gap-2.5 font-sans text-[11px] font-semibold uppercase tracking-[0.24em]',
        tone === 'accent' ? 'text-blue-deep' : 'text-stone',
        className,
      )}
    >
      <span aria-hidden="true" className="font-serif text-[1.25em] font-normal">
        ✳
      </span>
      <span>{children}</span>
    </p>
  )
}
