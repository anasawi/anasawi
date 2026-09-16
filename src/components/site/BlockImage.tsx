import Image from 'next/image'

import { ImageVeil } from '@/components/site/anim'
import { cn } from '@/lib/utils'
import type { Media } from '@/server/db/schema'

/**
 * L'image des blocs — remplace l'ancien `ImageReveal`.
 *
 * Elle est dévoilée par le rideau de la maquette (`ImageVeil` : le voile se
 * retire vers le haut pendant que l'image dézoome). Le conteneur porte
 * l'arrondi — `rounded-arch` pour l'arche signature — et le rideau en hérite.
 *
 * Sans média choisi, elle rend l'un des trois dégradés doux de la planche :
 * les aperçus de la bibliothèque restent composés, jamais troués.
 */

type Tone = 'ivory' | 'sand' | 'cream'

const PLACEHOLDERS = [
  'linear-gradient(160deg, #d3ddd4, #a8bcae)',
  'linear-gradient(160deg, #e2d8c6, #c0b096)',
  'linear-gradient(160deg, #ccd8de, #9db3bf)',
] as const

export function BlockImage({
  media,
  sizes,
  className,
  imageClassName,
  tone = 'ivory',
  delay = 0,
  priority = false,
  instant = false,
  placeholder = 0,
}: {
  media: Media | null
  sizes: string
  /** Classes du conteneur : ratio (`aspect-3/4`) et arrondi (`rounded-arch`). */
  className?: string
  imageClassName?: string
  /** Couleur du rideau — celle du fond de la section. */
  tone?: Tone
  delay?: number
  /** Uniquement pour l'image du hero (LCP). */
  priority?: boolean
  /** Peinte immédiatement, sans rideau — hero uniquement. */
  instant?: boolean
  /** Variante du dégradé de remplacement (0, 1 ou 2). */
  placeholder?: number
}) {
  const fallback =
    PLACEHOLDERS[Math.abs(placeholder) % PLACEHOLDERS.length] ?? PLACEHOLDERS[0]

  const content = media ? (
    <Image
      src={media.url}
      alt={media.alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={88}
      className={cn('object-cover', imageClassName)}
      {...(media.blurDataUrl
        ? { placeholder: 'blur' as const, blurDataURL: media.blurDataUrl }
        : {})}
    />
  ) : (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{ background: fallback }}
    />
  )

  if (instant) {
    /* Même précaution que l'ImageVeil : masque radial + image un poil
       plus grande que son cadre, sinon un liseré sombre cerne l'arrondi. */
    return (
      <div
        className={cn(
          'relative isolate overflow-hidden [-webkit-mask-image:-webkit-radial-gradient(white,black)]',
          className,
        )}
      >
        <div className="absolute -inset-px scale-[1.02]">{content}</div>
      </div>
    )
  }

  return (
    <ImageVeil tone={tone} delay={delay} className={className}>
      {content}
    </ImageVeil>
  )
}
