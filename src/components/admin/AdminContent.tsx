import { cn } from '@/lib/utils'

/**
 * Zone de contenu défilante d'un écran du CMS.
 *
 * Le layout de l'administration est une colonne flex sans débordement :
 * l'en-tête reste fixe, et c'est ce conteneur — et lui seul — qui défile.
 * `min-h-0` est indispensable, sans quoi un enfant flex refuse de rétrécir
 * en dessous de sa hauteur de contenu et le défilement remonte au document.
 *
 * La largeur est bornée : au-delà, les lignes d'un tableau ou d'un formulaire
 * deviennent trop longues pour être suivies de l'œil.
 */
export function AdminContent({
  children,
  className,
  width = 'default',
}: {
  children: React.ReactNode
  className?: string
  /** `narrow` pour les formulaires, `wide` pour les grilles de médias. */
  width?: 'narrow' | 'default' | 'wide'
}) {
  const maxWidth = {
    narrow: 'max-w-[42rem]',
    default: 'max-w-[64rem]',
    wide: 'max-w-[80rem]',
  }[width]

  return (
    <div className={cn('min-h-0 flex-1 overflow-y-auto', className)}>
      <div className={cn('mx-auto px-7 py-7 pb-24', maxWidth)}>{children}</div>
    </div>
  )
}
