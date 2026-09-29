import { cn } from '@/lib/utils'

/**
 * Label supérieur de section — « ✳︎  QUI JE SUIS ».
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
  /*
   * Astérisque et texte dans le MÊME flux de ligne, pas deux boîtes flex :
   * quand un label long se replie sur un téléphone (« Gestalt-thérapie ·
   * Coaching · Supervision »), l'astérisque restait collé au bord gauche
   * pendant que le texte se centrait. Ici il ouvre la première ligne et
   * suit l'alignement du texte. `justify-center` (les anciens appels)
   * vaut `text-center`.
   */
  return (
    <p
      className={cn(
        'font-sans text-[11px] font-semibold uppercase tracking-[0.24em]',
        tone === 'accent' ? 'text-blue-deep' : 'text-stone',
        className?.includes('justify-center') && 'text-center',
        className,
      )}
    >
      <span aria-hidden="true" className="mr-2.5 font-serif text-[1.25em] font-normal">
        ✳︎
      </span>
      <span>{children}</span>
    </p>
  )
}
