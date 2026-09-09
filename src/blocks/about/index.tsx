import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { ImageReveal } from '@/components/motion/ImageReveal'
import { Parallax } from '@/components/motion/Parallax'
import { Prose } from '@/components/site/Prose'
import { Reveal } from '@/components/motion/Reveal'

export const aboutSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  intro: z.string().default(''),
  body: z.string().default(''),
  mediaId: z.string().uuid().nullable().default(null),
  values: z
    .array(z.object({ label: z.string(), text: z.string() }))
    .default([]),
})

export type AboutPayload = z.output<typeof aboutSchema>

function About({ data, ctx }: BlockProps<AboutPayload>) {
  const image = ctx.resolveMedia(data.mediaId)

  return (
    <div className="container-editorial">
      <div className="grid grid-cols-1 gap-20 lg:grid-cols-12 lg:gap-x-24">
        {/* Portrait — colonnes 1-5, légèrement remonté. */}
        <div className="lg:col-span-5 lg:-mt-16">
          <Parallax amount={5}>
            <ImageReveal
              media={image}
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="aspect-4/5 w-full"
            />
          </Parallax>
        </div>

        {/* Texte — colonnes 7-12. */}
        <div className="lg:col-span-6 lg:col-start-7 lg:pt-10">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow>{data.eyebrow}</Eyebrow>
            </Reveal>
          )}

          {data.title && (
            <Reveal delay={0.08}>
              <h2 className="mt-8 text-[length:var(--text-h2)]">
                <Emphasis text={data.title} />
              </h2>
            </Reveal>
          )}

          {data.intro && (
            <Reveal delay={0.14}>
              <p className="mt-8 max-w-[50ch] text-[length:var(--text-lead)] leading-[1.65] text-ink">
                {data.intro}
              </p>
            </Reveal>
          )}

          {data.body && (
            <Reveal delay={0.2}>
              <Prose text={data.body} className="mt-7 max-w-[56ch]" />
            </Reveal>
          )}

          {data.values.length > 0 && (
            <dl className="mt-16 grid grid-cols-1 gap-px border-t border-line-strong sm:grid-cols-2">
              {data.values.map((value, i) => (
                <Reveal key={i} delay={0.24 + i * 0.06}>
                  <div className="border-b border-line py-8 pr-10">
                    <dt className="font-serif text-[1.05rem] text-ink">
                      {value.label}
                    </dt>
                    <dd className="mt-2 text-[0.92rem] leading-[1.7] text-ink-soft">
                      {value.text}
                    </dd>
                  </div>
                </Reveal>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  )
}

export const aboutBlock: BlockDefinition<typeof aboutSchema> = {
  label: 'À propos — Image + texte',
  description: 'Portrait, présentation, parcours et valeurs.',
  group: 'Sections',
  schema: aboutSchema,
  suggestedAnchor: 'a-propos',
  navigable: true,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.textarea('intro', 'Accroche'),
    field.richtext('body', 'Présentation'),
    field.media('mediaId', 'Portrait'),
    field.list(
      'values',
      'Valeurs',
      [field.text('label', 'Intitulé'), field.textarea('text', 'Description')],
      { addLabel: 'Ajouter une valeur' },
    ),
  ],
  defaults: {
    eyebrow: 'À PROPOS',
    title: '',
    intro: '',
    body: '',
    mediaId: null,
    values: [],
  },
  Component: About,
}
