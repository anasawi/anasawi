'use client'

import Image from 'next/image'

import { isVideoMimeType } from '@/lib/media-kind'
import type { Media } from '@/server/db/schema'

/**
 * Vignette d'un média, image ou vidéo — partout où la médiathèque en
 * montre : sélecteur, inspecteur, écran Médias.
 *
 * Une vidéo passée à `next/image` donnait une image cassée. Ici elle est
 * montrée par un `<video>` muet, arrêté sur sa première image, avec sa
 * vignette floue en affiche le temps du chargement.
 */
export function MediaThumb({
  media,
  sizes,
  className = 'object-cover',
}: {
  media: Media
  sizes: string
  className?: string
}) {
  if (isVideoMimeType(media.mimeType)) {
    return (
      <video
        src={media.url}
        poster={media.blurDataUrl ?? undefined}
        muted
        playsInline
        preload="metadata"
        aria-label={media.alt}
        className={`absolute inset-0 h-full w-full ${className}`}
      />
    )
  }
  return (
    <Image src={media.url} alt={media.alt} fill sizes={sizes} className={className} />
  )
}
