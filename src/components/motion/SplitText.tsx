'use client'

import { m, useInView, useReducedMotion } from 'motion/react'
import { useRef } from 'react'

import { Emphasis } from '@/components/site/Emphasis'
import { cn } from '@/lib/utils'

type SplitTextProps = {
  /**
   * Lignes déjà découpées à la main. On ne découpe pas automatiquement le
   * texte : un découpage automatique dépend de la largeur rendue, casse la
   * sélection de texte et empêche le crawler de lire une phrase continue.
   * L'admin contrôle donc les ruptures de ligne, et le texte reste intact
   * pour les lecteurs d'écran.
   */
  lines: readonly string[]
  className?: string
  lineClassName?: string
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'div'
  delay?: number
  /**
   * Interprète `*mot*` en italique dans chaque ligne.
   *
   * C'est un booléen, pas une fonction de rendu : les blocs qui appellent
   * SplitText sont des Server Components, et une fonction ne franchit pas la
   * frontière RSC.
   */
  emphasis?: boolean
}

/**
 * Révélation ligne par ligne : chaque ligne remonte depuis un masque en
 * `overflow: hidden`, avec 80 ms de décalage. Le mouvement est masqué, pas
 * flottant — c'est ce qui le rend éditorial plutôt que web-design.
 */
export function SplitText({
  lines,
  className,
  lineClassName,
  as: Tag = 'div',
  delay = 0,
  emphasis = false,
}: SplitTextProps) {
  /* `as` peut être h1, h2, p… : on type la ref sur HTMLElement et on la
     transmet via un cast, sinon TS attend un type d'élément différent
     pour chaque balise possible. */
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -8% 0px' })
  const reduced = useReducedMotion()

  const content = (line: string) =>
    emphasis ? <Emphasis text={line} /> : line

  if (reduced) {
    return (
      <Tag ref={ref as React.Ref<never>} className={className}>
        {lines.map((line, i) => (
          <span key={i} className={cn('block', lineClassName)}>
            {content(line)}
          </span>
        ))}
      </Tag>
    )
  }

  return (
    <Tag ref={ref as React.Ref<never>} className={className}>
      {lines.map((line, i) => (
        <span key={i} className={cn('line-mask', lineClassName)}>
          <m.span
            className="block"
            initial={{ y: '105%' }}
            animate={inView ? { y: '0%' } : { y: '105%' }}
            transition={{
              duration: 1,
              delay: delay + i * 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {content(line)}
          </m.span>
        </span>
      ))}
    </Tag>
  )
}
