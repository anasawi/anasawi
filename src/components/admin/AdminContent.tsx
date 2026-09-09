import { cn } from '@/lib/utils'

/**
 * Zone de contenu défilante d'un écran du CMS.
 *
 * Le layout de l'administration est une colonne flex sans débordement :
 * c'est ce conteneur — et lui seul — qui défile. `min-h-0` est indispensable,
 * sans quoi un enfant flex refuse de rétrécir en dessous de sa hauteur de
 * contenu et le défilement remonte au document.
 *
 * La colonne est volontairement étroite et posée sur l'ivoire, comme les
 * écrans Apparence et Médias de la maquette : le contenu se lit au centre,
 * les cartes blanches respirent, rien ne s'étale.
 */
export function AdminContent({
  children,
  className,
  width = 'default',
}: {
  children: React.ReactNode
  className?: string
  /** `narrow` pour les formulaires courts, `wide` pour les listes. */
  width?: 'narrow' | 'default' | 'wide'
}) {
  const maxWidth = {
    narrow: 'max-w-[600px]',
    default: 'max-w-[720px]',
    wide: 'max-w-[860px]',
  }[width]

  return (
    <div
      className={cn('min-h-0 flex-1 overflow-y-auto bg-ivory', className)}
    >
      <div className={cn('mx-auto px-8 py-11 pb-24', maxWidth)}>{children}</div>
    </div>
  )
}
