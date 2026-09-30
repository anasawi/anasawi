'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import { isVideoMimeType } from '@/lib/media-kind'
import type { Media } from '@/server/db/schema'

/**
 * Vignette d'un média, image ou vidéo — partout où l'écran Médias en
 * montre : sélecteur, inspecteur, écran Médias.
 *
 * Une vidéo passée à `next/image` donnait une image cassée. Ici elle est
 * montrée par un `<video>` muet, arrêté sur sa première image, avec sa
 * vignette floue en dessous le temps du chargement.
 *
 * Pourquoi pas l'attribut `poster` : la vignette floue (16 px) restait
 * affichée PAR-DESSUS la vidéo tant qu'elle ne jouait pas — dans l'écran
 * Médias, chaque vidéo n'était qu'une tache. Ici le flou est un calque
 * sous la vidéo, retiré dès qu'une image est décodée ; et l'on se place
 * un dixième de seconde après le début, ce qui force les navigateurs à
 * peindre une image même sans lecture (Safari, notamment).
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
    return <VideoThumb media={media} className={className} />
  }
  return (
    <Image src={media.url} alt={media.alt} fill sizes={sizes} className={className} />
  )
}

function VideoThumb({ media, className }: { media: Media; className: string }) {
  const [prete, setPrete] = useState(false)
  const ref = useRef<HTMLVideoElement>(null)

  /* Les événements de chargement ont pu partir AVANT que React n'écoute
     (page rendue côté serveur, vidéo déjà en cache) : on relit l'état au
     montage. */
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (v.readyState >= 1 && v.currentTime === 0) {
      v.currentTime = Math.min(0.1, v.duration || 0.1)
    }
    if (v.readyState >= 2) setPrete(true)
  }, [])

  return (
    <>
      {media.blurDataUrl && !prete && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media.blurDataUrl}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full ${className}`}
        />
      )}
      <video
        ref={ref}
        src={media.url}
        muted
        playsInline
        preload="metadata"
        aria-label={media.alt}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget
          if (v.currentTime === 0) v.currentTime = Math.min(0.1, v.duration || 0.1)
        }}
        onLoadedData={() => setPrete(true)}
        onSeeked={() => setPrete(true)}
        className={`absolute inset-0 h-full w-full ${className} transition-opacity duration-300 ${prete ? 'opacity-100' : 'opacity-0'}`}
      />
    </>
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
