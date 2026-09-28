import Image from 'next/image'

import logoAnasawi from './logo-anasawi.png'
import { cn } from '@/lib/utils'

/**
 * Marque ANASAWI — l'ombelle de pissenlit d'Anne.
 *
 * C'est une ILLUSTRATION, pas un tracé au trait : ses couleurs sont
 * fixes, elle ne suit donc pas `currentColor` et ne s'inverse pas sur
 * fond sombre. Les classes de couleur passées par `className`
 * (`text-stone`, `text-ink`…) n'ont plus d'effet ; elles restent sans
 * danger et évitent de reprendre les cinq appelants.
 *
 * Le fichier est CADRÉ AU CONTENU. Le SVG d'origine laissait de larges
 * marges vides autour du dessin — les akènes qui s'envolent élargissent
 * la boîte — si bien qu'à 16 px la marque n'occupait que huit pixels et
 * devenait une tache. Marges retirées, elle se lit.
 */
export function LogoMark({
  className,
  src,
}: {
  className?: string
  /** Logo choisi dans les Réglages. Absent : celui livré avec le site. */
  src?: string | null
}) {
  return (
    <Image
      src={src || logoAnasawi}
      width={72}
      height={72}
      alt=""
      aria-hidden="true"
      priority
      /* 72px : le double de la plus grande taille d'affichage (36px dans
         l'en-tête), pour rester net sur écran à haute densité. */
      sizes="72px"
      className={cn('h-9 w-9 select-none object-contain', className)}
    />
  )
}

export function Logo({
  className,
  wordmarkClassName,
}: {
  className?: string
  wordmarkClassName?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-3.5', className)}>
      <LogoMark />
      <span
        className={cn(
          'font-serif text-[1.02rem] tracking-[0.28em] text-current',
          wordmarkClassName,
        )}
      >
        ANASAWI
      </span>
    </span>
  )
}
