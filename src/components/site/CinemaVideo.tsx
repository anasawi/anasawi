'use client'

import { m, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useEffect, useRef } from 'react'

import { useAnimEnabled } from '@/components/site/anim'
import { cn } from '@/lib/utils'
import type { Media } from '@/server/db/schema'

/**
 * Une vidéo « cinéma » : muette, en boucle, sans commande — une image
 * qui bouge, pas un lecteur. Et une entrée au défilement : le cadre
 * arrive resserré, aux coins doux, et s'ouvre jusqu'aux bords de
 * l'écran à mesure qu'on descend, pendant que l'image, un peu
 * agrandie, se pose. Comme un rideau qu'on écarte.
 *
 * Ce qu'il n'y a PAS, et pourquoi :
 *   — pas de commandes ni de pause : `controls` absent, clics ignorés
 *     (`pointer-events-none`), image-dans-l'image désactivée ;
 *   — pas de son : `muted`, et c'est aussi ce qui autorise la lecture
 *     automatique sur mobile ;
 *   — pas de lecture hors écran : la vidéo joue quand on la voit, se met
 *     en veille sinon — batterie et données, sur un téléphone.
 *
 * Sous prefers-reduced-motion, ni ouverture ni boucle : la première image,
 * fixe. Dans l'éditeur (animations coupées), le cadre est ouvert d'emblée.
 */
export function CinemaVideo({
  media,
  ratio,
  className,
}: {
  media: Media
  /** Format du cadre : `cinema` (21:9) ou `ecran` (16:9). */
  ratio: 'cinema' | 'ecran'
  className?: string
}) {
  /* L'ouverture au défilement suit l'interrupteur des animations (coupé
     dans l'éditeur) ; la LECTURE, elle, ne dépend que du mouvement
     réduit : dans l'éditeur aussi, Anne doit voir sa vidéo bouger. */
  const on = useAnimEnabled()
  const reduced = useReducedMotion()
  const cadre = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)

  /* Progression : 0 quand le haut du cadre entre par le bas de l'écran,
     1 quand son centre atteint le centre de l'écran. */
  const { scrollYProgress } = useScroll({
    target: cadre,
    offset: ['start end', 'center center'],
  })
  const largeur = useTransform(scrollYProgress, [0, 1], ['64%', '100%'])
  const rayon = useTransform(scrollYProgress, [0, 1], [32, 0])
  const zoom = useTransform(scrollYProgress, [0, 1], [1.18, 1])

  /* Lecture seulement à l'écran. */
  useEffect(() => {
    const element = video.current
    if (!element || reduced) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        if (entry.isIntersecting) void element.play().catch(() => undefined)
        else element.pause()
      },
      { threshold: 0.15 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [reduced])

  const aspect = ratio === 'cinema' ? 'aspect-[21/9]' : 'aspect-video'

  return (
    <div ref={cadre} className={cn('flex justify-center', className)}>
      <m.div
        style={on ? { width: largeur, borderRadius: rayon } : { width: '100%' }}
        className="relative overflow-hidden bg-night"
      >
        <div className={cn('relative w-full', aspect)}>
          <m.video
            ref={video}
            src={media.url}
            poster={media.blurDataUrl ?? undefined}
            style={on ? { scale: zoom } : undefined}
            autoPlay={!reduced}
            muted
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
            disableRemotePlayback
            aria-label={media.alt}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </m.div>
    </div>
  )
}
