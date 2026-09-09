'use client'

import { m, useInView, useReducedMotion } from 'motion/react'
import {
  Children,
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from 'react'

import { cn } from '@/lib/utils'

/* ══════════════════════════════════════════════════════════════════════
   AMASWI — primitives d'animation (planche V8)

   Toutes les primitives partagent le même mécanisme : quand l'animation
   est coupée — via <AnimProvider enabled={false}> (éditeur admin,
   vignettes de la bibliothèque) ou via prefers-reduced-motion — chacune
   rend son ÉTAT FINAL immédiatement. Aucune opacité 0, aucun masque :
   le contenu n'est jamais invisible hors du site public.

   Tout est en `m.*` (LazyMotion strict) : chaque consommateur doit être
   sous le <MotionProvider> du projet.
   ══════════════════════════════════════════════════════════════════════ */

/** Courbe signature de la maquette — cubic-bezier(.22,1,.36,1). */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** Déclenchement standard : une fois, ~20 % visible, un peu avant le bas. */
const VIEWPORT = { once: true, amount: 0.2, margin: '0px 0px -10% 0px' } as const

/* ── AnimProvider ──────────────────────────────────────────────────── */

const AnimContext = createContext<boolean>(true)

/**
 * Coupe (ou rétablit) toutes les primitives d'animation en dessous.
 * Défaut : activé. L'éditeur et les aperçus de la bibliothèque enveloppent
 * leur rendu de `<AnimProvider enabled={false}>` pour un rendu statique.
 */
export function AnimProvider({
  enabled,
  children,
}: {
  enabled: boolean
  children: ReactNode
}) {
  return <AnimContext.Provider value={enabled}>{children}</AnimContext.Provider>
}

/**
 * Vrai si les animations doivent jouer : contexte activé ET pas de
 * prefers-reduced-motion. C'est le seul interrupteur des primitives.
 */
export function useAnimEnabled(): boolean {
  const enabled = useContext(AnimContext)
  const reduced = useReducedMotion()
  return enabled && !reduced
}

/* ── Reveal ────────────────────────────────────────────────────────────
   Révélation de la maquette : 26px plus bas, flou de 5px, opacité 0 →
   net en 1s sur la courbe signature. */

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  /** Décalage en secondes (la maquette échelonne par pas de 0.1). */
  delay?: number
  className?: string
}) {
  const on = useAnimEnabled()

  if (!on) return <div className={className}>{children}</div>

  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 26, filter: 'blur(5px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={VIEWPORT}
      transition={{ duration: 1, ease: EASE, delay }}
    >
      {children}
    </m.div>
  )
}

/* ── MaskLines ─────────────────────────────────────────────────────────
   Chaque enfant est une ligne : elle monte depuis un masque
   (translateY 110% → 0), délais échelonnés 0 / .1 / .2s. */

export function MaskLines({
  children,
  delay = 0,
  step = 0.1,
  className,
  lineClassName,
}: {
  /** Un enfant = une ligne (spans, fragments…). */
  children: ReactNode
  delay?: number
  /** Écart entre deux lignes, en secondes. */
  step?: number
  className?: string
  /** Classes posées sur chaque conteneur de ligne. */
  lineClassName?: string
}) {
  const on = useAnimEnabled()
  const lines = Children.toArray(children)

  if (!on) {
    return (
      <div className={className}>
        {lines.map((line, i) => (
          <div key={i} className={lineClassName}>
            {line}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={className}>
      {lines.map((line, i) => (
        <div key={i} className={cn('line-mask', lineClassName)}>
          <m.div
            className="will-change-transform"
            initial={{ y: '110%' }}
            whileInView={{ y: '0%' }}
            viewport={VIEWPORT}
            transition={{ duration: 1.1, ease: EASE, delay: delay + i * step }}
          >
            {line}
          </m.div>
        </div>
      ))}
    </div>
  )
}

/* ── SplitChars ────────────────────────────────────────────────────────
   Le texte du hero : chaque lettre monte de 115 % depuis un masque,
   28 ms d'écart entre deux lettres. Texte brut uniquement — pour un
   passage en italique, la prop `italic` couvre tout le texte. */

export function SplitChars({
  text,
  italic = false,
  delay = 0,
  className,
  as,
}: {
  text: string
  /** Rend l'ensemble en italique (équivalent du <em> de la maquette). */
  italic?: boolean
  delay?: number
  className?: string
  /** Balise du conteneur — 'span' par défaut. */
  as?: ElementType
}) {
  const on = useAnimEnabled()
  const Comp: ElementType = as ?? 'span'
  const style = italic ? 'italic' : undefined

  if (!on) {
    return (
      <Comp className={cn('block', style, className)}>{text}</Comp>
    )
  }

  const chars = Array.from(text)

  return (
    <Comp className={cn('line-mask', style, className)} aria-label={text}>
      {chars.map((char, i) =>
        char === ' ' ? (
          <span key={i} aria-hidden="true">
            {' '}
          </span>
        ) : (
          <m.span
            key={i}
            aria-hidden="true"
            className="inline-block will-change-transform"
            initial={{ y: '115%' }}
            whileInView={{ y: '0%' }}
            viewport={VIEWPORT}
            transition={{ duration: 1, ease: EASE, delay: delay + i * 0.028 }}
          >
            {char}
          </m.span>
        ),
      )}
    </Comp>
  )
}

/* ── Counter ───────────────────────────────────────────────────────────
   Compte de 0 à `value` en ~1.3s, ease-out quartique, à l'entrée dans
   le viewport. Rend un simple <span>. */

export function Counter({
  value,
  duration = 1.3,
  className,
}: {
  value: number
  /** Durée en secondes. */
  duration?: number
  className?: string
}) {
  const on = useAnimEnabled()
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!on || !inView) return

    let frame = 0
    const start = performance.now()
    const total = Math.max(duration, 0.05) * 1000

    const tick = (now: number) => {
      const p = Math.min((now - start) / total, 1)
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 4))))
      if (p < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [on, inView, value, duration])

  return (
    <span ref={ref} className={className}>
      {on ? display : value}
    </span>
  )
}

/* ── ImageVeil ─────────────────────────────────────────────────────────
   Rideau qui se retire (scaleY 1 → 0 depuis le haut, 1.2s) pendant que
   l'image dézoome (scale 1.1 → 1, 1.4s). Le rideau prend la couleur du
   fond de la section via `tone`. Le conteneur porte l'arrondi (arche…) :
   le rideau en hérite. */

type VeilTone = 'ivory' | 'sand' | 'cream'

const VEIL_BG: Record<VeilTone, string> = {
  ivory: 'bg-ivory',
  sand: 'bg-sand',
  cream: 'bg-cream',
}

export function ImageVeil({
  children,
  tone = 'ivory',
  delay = 0,
  className,
}: {
  /** L'image (ou tout contenu) à dévoiler. */
  children: ReactNode
  /** Couleur du rideau — celle du fond de la section. */
  tone?: VeilTone
  delay?: number
  className?: string
}) {
  const on = useAnimEnabled()

  if (!on) {
    return (
      <div className={cn('relative overflow-hidden', className)}>{children}</div>
    )
  }

  return (
    <m.div
      className={cn('relative overflow-hidden', className)}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
    >
      <m.div
        className="h-full w-full will-change-transform"
        variants={{ hidden: { scale: 1.1 }, visible: { scale: 1 } }}
        transition={{ duration: 1.4, ease: EASE, delay: delay + 0.1 }}
      >
        {children}
      </m.div>
      <m.div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 z-[2] origin-top rounded-[inherit]',
          VEIL_BG[tone],
        )}
        variants={{ hidden: { scaleY: 1 }, visible: { scaleY: 0 } }}
        transition={{ duration: 1.2, ease: EASE, delay: delay + 0.1 }}
      />
    </m.div>
  )
}

/* ── Marquee ───────────────────────────────────────────────────────────
   Bandeau infini à tempo constant : contenu dupliqué, translateX -50 %
   en CSS. `prefers-reduced-motion` fige l'animation (règle globale). */

export function Marquee({
  children,
  duration = 38,
  className,
}: {
  children: ReactNode
  /** Durée d'un cycle complet, en secondes. */
  duration?: number
  className?: string
}) {
  const on = useAnimEnabled()

  return (
    <div className={cn('overflow-hidden', className)}>
      <div
        className={cn(
          'flex w-max whitespace-nowrap',
          on && 'amaswi-marquee will-change-transform',
        )}
        style={on ? { animationDuration: `${duration}s` } : undefined}
      >
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  )
}

/* ── CircleText ────────────────────────────────────────────────────────
   Texte sur un cercle qui tourne (26s, linéaire). `center` pose un
   glyphe au milieu — l'astérisque ✳ de la marque, typiquement. */

export function CircleText({
  text,
  size = 120,
  center,
  duration = 26,
  className,
}: {
  /** Texte de la couronne — terminer par « · » pour une boucle propre. */
  text: string
  /** Côté du carré SVG, en pixels (viewBox 120 constant). */
  size?: number
  /** Glyphe central optionnel, ex. '✳'. */
  center?: string
  /** Durée d'un tour, en secondes. */
  duration?: number
  className?: string
}) {
  const on = useAnimEnabled()
  const pathId = useId()

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={cn(on && 'amaswi-spin', className)}
      style={on ? { animationDuration: `${duration}s` } : undefined}
    >
      <defs>
        <path
          id={pathId}
          d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0"
          fill="none"
        />
      </defs>
      <text className="fill-blue-deep font-sans text-[10.4px] font-semibold uppercase tracking-[0.32em]">
        <textPath href={`#${pathId}`}>{text}</textPath>
      </text>
      {center ? (
        <text
          x="60"
          y="66"
          textAnchor="middle"
          className="fill-blue-deep font-serif text-[20px]"
        >
          {center}
        </text>
      ) : null}
    </svg>
  )
}

/* ── WordsIgnite ───────────────────────────────────────────────────────
   Le manifeste : les mots passent d'opacité .14 à 1 un à un, 65 ms
   d'écart, à l'entrée dans le viewport. */

export function WordsIgnite({
  text,
  delay = 0.18,
  step = 0.065,
  className,
  as,
}: {
  text: string
  /** Attente avant le premier mot, en secondes. */
  delay?: number
  /** Écart entre deux mots, en secondes. */
  step?: number
  className?: string
  /** Balise du conteneur — 'p' par défaut. */
  as?: ElementType
}) {
  const on = useAnimEnabled()
  const Comp: ElementType = as ?? 'p'

  if (!on) return <Comp className={className}>{text}</Comp>

  const words = text.split(/\s+/).filter((word) => word.length > 0)

  return (
    <Comp className={className} aria-label={text}>
      {words.map((word, i) => (
        <span key={i} aria-hidden="true">
          {i > 0 ? ' ' : null}
          <m.span
            className="inline-block"
            initial={{ opacity: 0.14 }}
            whileInView={{ opacity: 1 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.45, delay: delay + i * step }}
          >
            {word}
          </m.span>
        </span>
      ))}
    </Comp>
  )
}
