'use client'

import {
  m,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { EASE, useAnimEnabled } from '@/components/site/anim'
import type { ServiceWithMedia } from '@/server/db/schema'

/*
 * Carte flottante au survol d'un accompagnement.
 *
 * Une carte en verre dépoli, façon iOS, qui suit la souris avec un retard
 * élastique : l'index, le titre, la description longue, la durée — et
 * l'invitation à ouvrir la fiche. Format portrait, étroit et haut. La page
 * transparaît à travers elle, floutée et saturée ; rien d'autre ne change.
 *
 * Elle s'anime à l'ouverture et à la fermeture seulement. D'une rangée à
 * l'autre, le contenu se remplace sans transition : la carte est déjà là,
 * on lit la suite. Sa hauteur suit le texte à partir d'un minimum fixe ; on
 * la mesure en direct pour la retenir dans la fenêtre. Au-delà de l'écran,
 * le texte s'estompe vers le bas — la fiche a le reste.
 *
 * Pointeurs fins seulement : au doigt, rien ne survole, et la fiche s'ouvre
 * au toucher. Inerte au pointeur, pour ne jamais intercepter le clic.
 */

/* Format paysage : large et basse, un seul paragraphe. */
const CARD_W = 560
const CARD_MIN_H = 220
/* Décalage : à droite du curseur, centrée verticalement sur lui. */
const OFFSET_X = 32
const MARGIN = 14

const NUMBER_WORDS = [
  'un',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
] as const

/** Vrai quand un survol a un sens : pointeur fin, qui sait survoler. */
export function useCanHover(): boolean {
  const [can, setCan] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)')
    setCan(media.matches)
    const onChange = (event: MediaQueryListEvent) => setCan(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return can
}

function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}

export function ServiceHoverPreview({
  service,
  index,
  pointerX,
  pointerY,
}: {
  /** L'accompagnement survolé ; `null` cache la carte. */
  service: ServiceWithMedia | null
  /** Rang, pour l'index en toutes lettres. */
  index: number
  /** Position brute du curseur dans la fenêtre — des valeurs de mouvement,
      mises à jour hors du cycle de rendu React. */
  pointerX: MotionValue<number>
  pointerY: MotionValue<number>
}) {
  const on = useAnimEnabled()
  const visible = service !== null

  /* Valeurs brutes → ressorts : la carte court après le curseur. */
  const spring = { stiffness: 260, damping: 30, mass: 0.7 }
  const x = useSpring(pointerX, spring)
  const y = useSpring(pointerY, spring)

  /* À l'apparition, les ressorts sautent sur le curseur au lieu d'y courir
     depuis leur dernière position — ou depuis l'origine, la première fois. */
  useEffect(() => {
    if (!visible) return
    x.jump(pointerX.get())
    y.jump(pointerY.get())
  }, [visible, x, y, pointerX, pointerY])

  /* Inclinaison depuis la vitesse horizontale, bornée : une nuance. */
  const velocity = useVelocity(x)
  const rotate = useTransform(velocity, [-2400, 0, 2400], [-3, 0, 3], {
    clamp: true,
  })
  const rotateSmooth = useSpring(rotate, { stiffness: 180, damping: 24 })

  /* La dernière fiche survolée reste affichée pendant le fondu de sortie. */
  const [shown, setShown] = useState<{
    service: ServiceWithMedia
    index: number
  } | null>(null)
  useEffect(() => {
    if (service) setShown({ service, index })
  }, [service, index])

  /* Hauteur réelle de la carte, mesurée : elle change avec le texte. */
  const cardRef = useRef<HTMLElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const cardH = useMotionValue(CARD_MIN_H)
  const [overflowing, setOverflowing] = useState(false)
  useEffect(() => {
    const card = cardRef.current
    const text = textRef.current
    if (!card || !text) return
    const measure = () => {
      cardH.set(card.offsetHeight)
      setOverflowing(text.scrollHeight > text.clientHeight + 2)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(card)
    observer.observe(text)
    return () => observer.disconnect()
    /* Sur `shown`, pas `service` : la carte n'est montée qu'au rendu qui
       suit la mise à jour de `shown`. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardH, shown])

  /* Position finale : décalée du curseur, retenue dans la fenêtre. */
  const left = useTransform(x, (v) =>
    Math.min(
      Math.max(v + OFFSET_X, MARGIN),
      (typeof window === 'undefined' ? 1280 : window.innerWidth) - CARD_W - MARGIN,
    ),
  )
  const top = useTransform([y, cardH], ([v, h]) => {
    const height = typeof window === 'undefined' ? 800 : window.innerHeight
    const wanted = (v as number) - (h as number) / 2
    return Math.min(Math.max(wanted, MARGIN), height - (h as number) - MARGIN)
  })

  /* Portail vers <body> : hors de tout ancêtre transformé ou rogné. */
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted || !shown) return null

  const body = paragraphs(shown.service.body)
  const texte = body.length > 0 ? body : [shown.service.excerpt]
  const duration = on ? (visible ? 0.55 : 0.32) : 0

  return createPortal(
    <>
      <m.div
        aria-hidden="true"
        className="pointer-events-none fixed z-[60] hidden md:block"
        style={{ left, top, width: CARD_W, rotate: rotateSmooth }}
        initial={false}
        animate={{
          opacity: visible ? 1 : 0,
          scale: visible ? 1 : 0.94,
          y: visible ? 0 : 14,
        }}
        transition={{ duration, ease: EASE }}
      >
        {/* Pas de clé ni de transition sur le contenu : d'une rangée à
            l'autre, il se remplace instantanément. */}
        <article
          ref={cardRef}
          style={{ minHeight: CARD_MIN_H, maxHeight: `calc(100vh - ${MARGIN * 2}px)` }}
          /* Carte « Froide » de la planche : blanc franc, angles serrés, et
             trois bulles translucides aux couleurs de la charte, rognées par
             les bords — deux bleus qui se chevauchent en haut à droite (le
             recouvrement s'assombrit par multiplication), une sauge en bas à
             gauche. Le texte passe au-dessus. */
          className="relative isolate flex flex-col overflow-hidden rounded-[18px] border border-white/60 bg-white/[0.82] px-7 pb-6 pt-7 text-ink shadow-[0_32px_80px_-24px_rgba(46,66,79,0.5),0_1px_0_rgba(255,255,255,0.9)_inset] backdrop-blur-[26px] backdrop-saturate-[1.7]"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-[72px] -z-10 h-[210px] w-[210px] rounded-full bg-blue-deep/55 mix-blend-multiply"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-[64px] -top-[46px] -z-10 h-[156px] w-[156px] rounded-full bg-blue/60 mix-blend-multiply"
          />
          <span
            aria-hidden="true"
            /* Sauge : pas encore de jeton dans la charte — candidat à en
               devenir un si la bulle plaît. */
            className="pointer-events-none absolute -bottom-[96px] -left-12 -z-10 h-[180px] w-[180px] rounded-full bg-[#b8d1c5]/75 mix-blend-multiply"
          />
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-stone">
            <span aria-hidden="true" className="text-blue-deep">
              ✳
            </span>
            Accompagnement · {NUMBER_WORDS[shown.index] ?? String(shown.index + 1)}
          </p>

          <h4 className="mt-3 font-serif text-[30px] font-light leading-[1.08]">
            {shown.service.title}
          </h4>

          {/* Un seul bloc : le premier paragraphe de la description longue,
              à défaut l'extrait. La fiche a le reste. S'il dépasse l'écran,
              il se rogne ici et s'estompe — le pied reste visible. */}
          <div ref={textRef} className="relative mt-4 min-h-0 flex-1 overflow-hidden pb-6">
            <p className="max-w-[58ch] text-[14.5px] leading-[1.75] text-ink-soft">
              {texte[0]}
            </p>
            {overflowing && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white/90 via-white/60 to-transparent"
              />
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-4 border-t border-line pt-4">
            {shown.service.duration ? (
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone">
                {shown.service.duration}
              </span>
            ) : (
              <span />
            )}
            <span className="inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-blue-deep">
              Ouvrir la fiche
              <span aria-hidden="true">→</span>
            </span>
          </div>
        </article>
      </m.div>
    </>,
    document.body,
  )
}
