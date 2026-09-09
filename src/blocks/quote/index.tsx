import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { MaskLines, Reveal } from '@/components/site/anim'
import { Emphasis } from '@/components/site/Emphasis'

export const quoteSchema = z.object({
  lines: z.array(z.object({ text: z.string() })).default([]),
  attribution: z.string().default(''),
})

export type QuotePayload = z.output<typeof quoteSchema>

/**
 * Respiration entre deux sections denses. Rien d'autre qu'une phrase
 * centrée qui monte de son masque, un filet, et beaucoup de vide.
 */
function Quote({ data }: BlockProps<QuotePayload>) {
  const lines = data.lines.map((l) => l.text).filter(Boolean)
  if (lines.length === 0) return null

  return (
    <div className="container-editorial">
      <figure className="mx-auto max-w-[38rem] text-center">
        <Reveal>
          <span
            aria-hidden="true"
            className="mx-auto mb-12 block h-14 w-px bg-line-strong"
          />
        </Reveal>

        <blockquote className="font-serif text-[clamp(1.6rem,3.2vw,2.9rem)] font-light leading-[1.3] text-ink">
          <MaskLines delay={0.1}>
            {lines.map((line, i) => (
              <span key={i}>
                <Emphasis text={line} />
              </span>
            ))}
          </MaskLines>
        </blockquote>

        {data.attribution && (
          <Reveal delay={0.3}>
            <figcaption className="mt-10 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
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
