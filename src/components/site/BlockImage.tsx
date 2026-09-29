'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

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

  /*
   * L'image est-elle là ? Le rideau ne s'ouvre qu'à ce moment. Une image
   * lointaine dans la page n'est demandée qu'à l'approche (chargement
   * différé) : le rideau s'ouvrait AVANT qu'elle arrive, sur le flou, et
   * la photo apparaissait d'un coup après l'animation. Deux chemins pour
   * le savoir : `onLoad`, et — si l'image était déjà en cache avant que
   * React ne s'attache — `complete` à la première occasion.
   */
  const [ready, setReady] = useState(!media)
  const img = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const element = img.current
    if (element && element.complete && element.naturalWidth > 0) setReady(true)
  }, [])

  /*
   * Le chargement différé du navigateur ne suffit plus : Chrome tient
   * compte du découpage (`clip-path`) pour décider qu'une image est « à
   * l'écran », et une image entièrement rognée par le rideau fermé n'y
   * est jamais — elle ne se chargeait pas, le rideau attendait, et rien
   * ne se passait. On décide donc nous-mêmes : à 800 px de l'écran, en
   * observant le CADRE (jamais rogné), l'image passe en chargement
   * immédiat. Le hero, lui, est `priority` dès le départ.
   */
  const [proche, setProche] = useState(priority)
  useEffect(() => {
    if (proche) return
    const cadre = img.current?.closest('[data-veil]') ?? img.current
    if (!cadre) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setProche(true)
          observer.disconnect()
        }
      },
      { rootMargin: '800px 0px 800px 0px' },
    )
    observer.observe(cadre)
    return () => observer.disconnect()
  }, [proche])

  const content = media ? (
    <Image
      ref={img}
      src={media.url}
      alt={media.alt}
      fill
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : proche ? 'eager' : 'lazy'}
      quality={88}
      onLoad={() => setReady(true)}
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
    <ImageVeil tone={tone} delay={delay} className={className} ready={ready}>
      {content}
    </ImageVeil>
  )
}
