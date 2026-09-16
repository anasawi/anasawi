import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { MaskLines, Reveal } from '@/components/site/anim'
import { BlockImage } from '@/components/site/BlockImage'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { Prose } from '@/components/site/Prose'
import { SectionIndex } from '@/components/site/ornaments'

export const approachSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  body: z.string().default(''),
  mediaId: z.string().uuid().nullable().default(null),
  steps: z
    .array(z.object({ label: z.string(), text: z.string() }))
    .default([]),
})

export type ApproachPayload = z.output<typeof approachSchema>

/**
 * Section volontairement asymétrique : le texte occupe les colonnes 2-6,
 * l'arche photographique les colonnes 8-12, décalée vers le bas. C'est la
 * rupture d'alignement qui donne à la page son caractère éditorial.
 */
function Approach({ data, ctx }: BlockProps<ApproachPayload>) {
  const image = ctx.resolveMedia(data.mediaId)

  return (
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="approche" />

      <div className="grid grid-cols-1 gap-10 md:gap-12 lg:grid-cols-12 lg:gap-x-20">
        <div className="lg:col-span-5 lg:col-start-2">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow>{data.eyebrow}</Eyebrow>
            </Reveal>
          )}

          {data.title && (
            <h2 className="mt-5 max-w-[16ch] text-[length:var(--text-h2)]">
              <MaskLines delay={0.08}>
                <span>
                  <Emphasis text={data.title} />
                </span>
              </MaskLines>
            </h2>
          )}

          {data.body && (
            <Reveal delay={0.14}>
              <Prose
                text={data.body}
                size="lead"
                className="mt-6 max-w-[48ch]"
              />
            </Reveal>
          )}

          {data.steps.length > 0 && (
            <ol className="mt-10 md:mt-12">
              {data.steps.map((step, i) => (
                <Reveal key={i} delay={0.16 + i * 0.07}>
                  <li className="grid grid-cols-[auto_1fr] gap-5 border-t border-line py-6 sm:gap-7 md:py-7">
                    <span className="font-serif text-[0.95rem] font-light italic text-blue-deep">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="font-serif text-[1.15rem] font-light text-ink">
                        {step.label}
                      </h3>
                      <p className="mt-2 max-w-[46ch] text-[0.92rem] leading-[1.78] text-ink-soft">
                        {step.text}
                      </p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
          )}
        </div>

        {/* Décalage vertical assumé — l'arche ne s'aligne pas sur le texte. */}
        <div className="lg:col-span-5 lg:col-start-8 lg:pt-[120px]">
          <BlockImage
            media={image}
            sizes="(max-width: 1024px) 88vw, 38vw"
            className="mx-auto aspect-[3/4] w-full max-w-[26rem] rounded-arch lg:mx-0"
            placeholder={2}
          />
        </div>
      </div>
    </div>
  )
}

export const approachBlock: BlockDefinition<typeof approachSchema> = {
  label: 'Approche — Étapes',
  description:
    'Section éditoriale asymétrique : texte, étapes et arche décalée.',
  group: 'Sections',
  schema: approachSchema,
  suggestedAnchor: 'approche',
  navigable: true,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.richtext('body', 'Texte'),
    field.media('mediaId', 'Image'),
    field.list(
      'steps',
      'Étapes',
      [field.text('label', 'Intitulé'), field.textarea('text', 'Description')],
      { addLabel: 'Ajouter une étape' },
    ),
  ],
  defaults: {
    eyebrow: 'Approche',
    title: 'On ne répare pas les gens. On les *écoute*.',
    body:
      'Mon approche est intégrative : elle emprunte à plusieurs courants sans s’enfermer dans aucun. Ce qui compte, c’est ce qui vous aide, vous, ici et maintenant.\n\nLes séances durent 50 minutes. Elles s’organisent autour d’un fil simple : comprendre ce qui se répète, nommer ce qui n’a jamais été dit, puis expérimenter d’autres manières d’être en relation avec soi et avec les autres.',
    mediaId: null,
    steps: [
      {
        label: 'Première rencontre',
        text: 'Un premier échange pour poser ce qui vous amène, entendre votre demande et vérifier que le cadre vous convient. Rien n’est décidé à l’avance.',
      },
      {
        label: 'Comprendre',
        text: 'Nous prenons le temps d’explorer votre histoire, vos liens, ce qui se rejoue. Les prises de conscience arrivent souvent là où on ne les attendait pas.',
      },
      {
        label: 'Expérimenter',
        text: 'Entre les séances, de petits pas concrets : une parole posée, une limite tenue, un geste nouveau. Le changement se vit avant de se comprendre.',
      },
      {
        label: 'Consolider',
        text: 'Quand l’équilibre revient, nous espaçons les rendez-vous. Vous repartez avec vos propres repères, et la porte reste ouverte.',
      },
    ],
  },
  Component: Approach,
}
