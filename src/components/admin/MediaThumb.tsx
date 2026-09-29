'use client'

import Image from 'next/image'

import { isVideoMimeType } from '@/lib/media-kind'
import type { Media } from '@/server/db/schema'

/**
 * Vignette d'un média, image ou vidéo — partout où l'écran Médias en
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

/* ── Ce qu'on dit d'un média, en français, jamais en jargon ─────────── */

/** « Image » ou « Vidéo » — jamais « image/webp ». */
export function libelleGenre(media: Pick<Media, 'mimeType'>): 'Image' | 'Vidéo' {
  return isVideoMimeType(media.mimeType) ? 'Vidéo' : 'Image'
}

/** Taille lisible : « 240 ko », « 1,8 Mo ». */
export function formatTaille(octets: number): string {
  if (!octets || octets <= 0) return ''
  if (octets < 1024 * 1024) return `${Math.max(1, Math.round(octets / 1024))} ko`
  return `${(octets / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
}

/** Dimensions lisibles : « 1200 × 800 » — ou rien si on ne les connaît pas. */
export function formatDimensions(media: Pick<Media, 'width' | 'height'>): string {
  if (!media.width || !media.height) return ''
  return `${media.width} × ${media.height}`
}

/**
 * Une ligne de détails humaine : « Image · 240 ko · 1200 × 800 ».
 * Chaque morceau absent est simplement omis.
 */
export function MediaMeta({
  media,
  className = '',
}: {
  media: Media
  className?: string
}) {
  const morceaux = [libelleGenre(media), formatTaille(media.size), formatDimensions(media)].filter(
    Boolean,
  )
  return (
    <p className={`text-[12px] leading-[1.4] text-stone ${className}`}>
      {morceaux.join(' · ')}
    </p>
  )
}
