import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { Prose } from '@/components/site/Prose'
import { Reveal } from '@/components/motion/Reveal'

/* ════════════════════════════════════════════════════════════════════
   FAQ — Éditoriale
   Un très grand titre serif fixé à gauche, l'accordéon des questions
   à droite. Les questions viennent de `ctx.faqItems` (écran « FAQ »
   du CMS, déjà filtré sur les actives) — le payload ne porte que la
   présentation. Accordéon natif `details/summary` : aucune once de
   JavaScript, le chevron pivote en CSS via `group-open`.
   ════════════════════════════════════════════════════════════════════ */

export const faqEditorialeSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default('Questions'),
  intro: z.string().default(''),
})

function FaqEditoriale({
  data,
  ctx,
}: BlockProps<z.output<typeof faqEditorialeSchema>>) {
  return (
    <div className="container-editorial">
      <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-x-24">
        <div className="lg:sticky lg:top-32 lg:col-span-5 lg:self-start">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow>{data.eyebrow}</Eyebrow>
            </Reveal>
          )}

          {data.title && (
            <Reveal delay={0.06}>
              <h2 className="mt-8 max-w-[8ch] text-[length:var(--text-display)] leading-[1.02]">
                <Emphasis text={data.title} />
              </h2>
            </Reveal>
          )}

          {data.intro && (
            <Reveal delay={0.14}>
              <Prose text={data.intro} className="mt-8 max-w-[36ch]" />
            </Reveal>
          )}
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          {ctx.faqItems.length > 0 && (
            <div className="border-t border-line-strong">
              {ctx.faqItems.map((item, i) => (
                <Reveal key={item.id} delay={Math.min(0.1 + i * 0.05, 0.4)}>
                  <details className="group border-b border-line">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-10 py-7 text-left [&::-webkit-details-marker]:hidden">
                      <span className="font-serif text-[1.1rem] leading-[1.4] text-ink transition-colors duration-500 group-hover:text-blue-deep md:text-[1.25rem]">
                        {item.question}
                      </span>
                      <span
                        aria-hidden="true"
                        className="mt-2 shrink-0 text-stone transition-transform duration-500 ease-[var(--ease-out-soft)] group-open:rotate-180"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <path
                            d="M2 4l4 4 4-4"
                            stroke="currentColor"
                            strokeWidth="1"
                          />
                        </svg>
                      </span>
                    </summary>
                    <p className="max-w-[60ch] pb-8 pr-10 text-[0.95rem] leading-[1.8] text-ink-soft">
                      {item.answer}
                    </p>
                  </details>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const faqEditorialeBlock: BlockDefinition<typeof faqEditorialeSchema> =
  {
    label: 'FAQ — Éditoriale',
    description:
      'Grand titre fixé à gauche, questions en accordéon à droite. Le contenu se gère dans l’écran « FAQ ».',
    group: 'Sections',
    schema: faqEditorialeSchema,
    suggestedAnchor: 'faq',
    navigable: true,
    fields: [
      field.text('eyebrow', 'Label supérieur'),
      field.text('title', 'Titre', {
        full: true,
        help: 'Astérisques pour l’italique : *mot*.',
      }),
      field.textarea('intro', 'Introduction'),
    ],
    defaults: {
      eyebrow: 'QUESTIONS FRÉQUENTES',
      title: '*Questions*',
      intro:
        'Les réponses aux questions qui reviennent le plus souvent avant une première séance. Pour tout le reste, écrivez-moi.',
    },
    Component: FaqEditoriale,
  }
