import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { Reveal } from '@/components/motion/Reveal'
import { SplitText } from '@/components/motion/SplitText'

export const quoteSchema = z.object({
  lines: z.array(z.object({ text: z.string() })).default([]),
  attribution: z.string().default(''),
})

export type QuotePayload = z.output<typeof quoteSchema>

/**
 * Respiration entre deux sections denses. Rien d'autre qu'une phrase
 * centrée, un filet, et beaucoup de vide autour.
 */
function Quote({ data }: BlockProps<QuotePayload>) {
  const lines = data.lines.map((l) => l.text).filter(Boolean)
  if (lines.length === 0) return null

  return (
    <div className="container-editorial">
      {/* Largeur en rem : `ch` se calcule sur les 16px du figure, pas sur les
          46px de la citation — elle serait pliée en colonne étroite. */}
      <figure className="mx-auto max-w-[32rem] text-center">
        <span
          aria-hidden="true"
          className="mx-auto mb-12 block h-14 w-px bg-line"
        />

        <blockquote>
          <SplitText
            as="p"
            lines={lines}
            className="font-serif text-[clamp(1.6rem,3.2vw,2.9rem)] leading-[1.28] text-ink"
            emphasis
          />
        </blockquote>

        {data.attribution && (
          <Reveal delay={0.3}>
            <figcaption className="label-eyebrow mt-10 text-stone">
              {data.attribution}
            </figcaption>
          </Reveal>
        )}
      </figure>
    </div>
  )
}

export const quoteBlock: BlockDefinition<typeof quoteSchema> = {
  label: 'Éditorial — Citation',
  description: 'Respiration centrée entre deux sections.',
  group: 'Sections',
  schema: quoteSchema,
  fields: [
    field.list(
      'lines',
      'Citation — une entrée par ligne',
      [field.text('text', 'Ligne', { full: true })],
      {
        addLabel: 'Ajouter une ligne',
        help: 'Astérisques pour l’italique : *mot*.',
      },
    ),
    field.text('attribution', 'Attribution', { full: true }),
  ],
  defaults: { lines: [], attribution: '' },
  Component: Quote,
}
