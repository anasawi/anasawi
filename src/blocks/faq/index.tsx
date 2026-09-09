import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { MaskLines, Reveal } from '@/components/site/anim'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { FaqAccordion } from '@/components/site/FaqAccordion'
import { Prose } from '@/components/site/Prose'
import { SectionIndex } from '@/components/site/ornaments'

export const faqSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  intro: z.string().default(''),
})

export type FaqPayload = z.output<typeof faqSchema>

function Faq({ data, ctx }: BlockProps<FaqPayload>) {
  return (
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="questions" className="-top-14" />

      <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-x-24">
        <div className="lg:col-span-4">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow>{data.eyebrow}</Eyebrow>
            </Reveal>
          )}
          {data.title && (
            <h2 className="mt-7 max-w-[12ch] text-[length:var(--text-h2)]">
              <MaskLines delay={0.08}>
                <span>
                  <Emphasis text={data.title} />
                </span>
              </MaskLines>
            </h2>
          )}
          {data.intro && (
            <Reveal delay={0.14}>
              <Prose text={data.intro} className="mt-7 max-w-[38ch]" />
            </Reveal>
          )}
        </div>

        <div className="lg:col-span-7 lg:col-start-6">
          <Reveal delay={0.1}>
            <FaqAccordion items={ctx.faqItems} />
          </Reveal>
        </div>
      </div>
    </div>
  )
}

export const faqBlock: BlockDefinition<typeof faqSchema> = {
  label: 'FAQ — Deux colonnes',
  description:
    'Titre à gauche, accordéon de questions à droite. Le contenu se gère dans l’écran « FAQ ».',
  group: 'Sections',
  schema: faqSchema,
  suggestedAnchor: 'faq',
  navigable: true,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.textarea('intro', 'Introduction'),
  ],
  defaults: { eyebrow: 'Questions fréquentes', title: '', intro: '' },
  Component: Faq,
}
