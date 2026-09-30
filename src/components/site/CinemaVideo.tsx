'use client'

import { m, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

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
 *   — pas de commandes natives : `controls` absent, clics sur l'image
 *     ignorés (`pointer-events-none`), image-dans-l'image désactivée.
 *     Une seule commande, discrète : « Mettre en pause / Reprendre »,
 *     qui n'apparaît qu'au survol du cadre ou au focus clavier — une
 *     image qui bouge sans qu'on puisse l'arrêter est un critère
 *     d'accessibilité manqué (WCAG 2.2.2), pas un choix esthétique ;
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
  /* Arrêt demandé par la personne : l'entrée à l'écran ne relance plus
     la lecture tant qu'elle n'a pas repris elle-même. L'état AFFICHÉ,
     lui, suit les événements de l'élément : il dit toujours vrai, même
     quand le mouvement réduit a empêché la lecture automatique. */
  const pauseVoulue = useRef(false)
  const [enPause, setEnPause] = useState(false)

  /* Progression : 0 quand le haut du cadre entre par le bas de l'écran,
     1 quand son centre atteint le centre de l'écran. */
  const { scrollYProgress } = useScroll({
    target: cadre,
    offset: ['start end', 'center center'],
  })
  const largeur = useTransform(scrollYProgress, [0, 1], ['64%', '100%'])
  const rayon = useTransform(scrollYProgress, [0, 1], [32, 0])
  const zoom = useTransform(scrollYProgress, [0, 1], [1.18, 1])

  /* Lecture seulement à l'écran — et jamais contre la volonté de la
     personne qui a mis en pause. */
  useEffect(() => {
    const element = video.current
    if (!element || reduced) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        if (entry.isIntersecting && !pauseVoulue.current) {
          void element.play().catch(() => undefined)
        } else {
          element.pause()
        }
      },
      { threshold: 0.15 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [reduced])

  const basculer = () => {
    const element = video.current
    if (!element) return
    if (element.paused) {
      pauseVoulue.current = false
      void element.play().catch(() => undefined)
    } else {
      pauseVoulue.current = true
      element.pause()
    }
  }

  const aspect = ratio === 'cinema' ? 'aspect-[21/9]' : 'aspect-video'

  return (
    <div ref={cadre} className={cn('flex justify-center', className)}>
      <m.div
        style={on ? { width: largeur, borderRadius: rayon } : { width: '100%' }}
        className="group/cinema relative overflow-hidden bg-night"
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
            onPlay={() => setEnPause(false)}
            onPause={() => setEnPause(true)}
            /* Sans lecture automatique (mouvement réduit), aucun événement
               ne dit l'état initial : on le lit à l'arrivée des données. */
            onLoadedMetadata={(event) => setEnPause(event.currentTarget.paused)}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        </div>

        {/* Frère du cadre de la vidéo, pas parent : la structure
            cadre > format > vidéo reste celle que mesure l'ouverture au
            défilement. Invisible au repos, révélé au survol du cadre ou au
            focus clavier ; `aria-pressed` dit l'état, le libellé le geste. */}
        <button
          type="button"
          onClick={basculer}
          aria-pressed={enPause}
          aria-label={enPause ? 'Reprendre la vidéo' : 'Mettre la vidéo en pause'}
          className={cn(
            'absolute bottom-4 right-4 z-[1] grid size-11 place-items-center rounded-full border border-ivory/40 bg-night/60 text-ivory backdrop-blur',
            'opacity-0 transition-opacity duration-300 focus-visible:opacity-100 group-hover/cinema:opacity-100',
            /* À l'arrêt (pause demandée, ou mouvement réduit) : le bouton
               reste visible, sinon on ne saurait plus où reprendre. */
            enPause && 'opacity-100',
          )}
        >
          {enPause ? (
            <svg aria-hidden="true" viewBox="0 0 16 16" className="size-[12px] translate-x-px" fill="currentColor">
              <path d="M4 2.5v11l9-5.5z" />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 16 16" className="size-[12px]" fill="currentColor">
              <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" />
            </svg>
          )}
        </button>
      </m.div>
    </div>
  )
}
