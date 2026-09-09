import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { Reveal } from '@/components/site/anim'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { SectionIndex } from '@/components/site/ornaments'

/* ════════════════════════════════════════════════════════════════════
   FAQ — Éditoriale (proposition N de la planche)
   Une colonne centrale de questions serif sur filets fins ; la
   question ouverte se pose sur un dégradé de sable, sa réponse
   respire dessous. Accordéon natif `details/summary` — zéro script.

   Les questions viennent de `ctx.faqItems` (écran « FAQ » du CMS).
   ════════════════════════════════════════════════════════════════════ */

export const faqEditorialeSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  intro: z.string().default(''),
})

function FaqEditoriale({
  data,
  ctx,
}: BlockProps<z.output<typeof faqEditorialeSchema>>) {
  return (
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="questions" className="-top-14" />

      <div className="mx-auto max-w-[46rem]">
        <div className="text-center">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow className="justify-center">{data.eyebrow}</Eyebrow>
            </Reveal>
          )}
          {data.title && (
            <Reveal delay={0.08}>
              <h2 className="mt-7 text-[length:var(--text-h2)]">
                <Emphasis text={data.title} />
              </h2>
            </Reveal>
          )}
          {data.intro && (
            <Reveal delay={0.14}>
              <p className="mx-auto mt-6 max-w-[52ch] text-[15px] leading-[1.85] text-ink-soft">
                {data.intro}
              </p>
            </Reveal>
          )}
        </div>

        {ctx.faqItems.length > 0 && (
          <div className="mt-14">
            {ctx.faqItems.map((item, i) => (
              <Reveal key={item.id} delay={Math.min(0.08 + i * 0.05, 0.35)}>
                <details className="group border-b border-line transition-colors duration-500 open:rounded-t-[18px] open:bg-gradient-to-b open:from-sand open:to-transparent">
                  <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 px-2 py-7 text-left [&::-webkit-details-marker]:hidden">
                    <span className="font-serif text-[clamp(1.2rem,1.7vw,1.6rem)] font-light leading-[1.35] text-ink transition-colors duration-500 group-hover:text-blue-deep group-open:italic group-open:text-blue-deep">
                      {item.question}
                    </span>
                    <span
                      aria-hidden="true"
                      className="shrink-0 font-serif text-[22px] font-light text-stone group-open:hidden"
                    >
                      ＋
                    </span>
                    <span
                      aria-hidden="true"
                      className="hidden shrink-0 font-serif text-[22px] font-light text-blue-deep group-open:inline"
                    >
                      －
                    </span>
                  </summary>
                  <p className="max-w-[56ch] px-2 pb-8 text-[14px] leading-[1.85] text-ink-soft">
                    {item.answer}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export const faqEditorialeBlock: BlockDefinition<typeof faqEditorialeSchema> =
  {
    label: 'FAQ — Éditoriale',
    description:
      'Colonne centrale de questions serif ; la question ouverte se pose sur un dégradé de sable. Le contenu se gère dans l’écran « FAQ ».',
    group: 'Sections',
    schema: faqEditorialeSchema,
    suggestedAnchor: 'questions',
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
      eyebrow: 'Questions fréquentes',
      title: '',
      intro:
        'Les réponses aux questions qui reviennent le plus souvent avant une première séance. Pour tout le reste, écrivez-moi.',
    },
    Component: FaqEditoriale,
  }
