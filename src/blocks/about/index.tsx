import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { MaskLines, Reveal } from '@/components/site/anim'
import { BlockImage } from '@/components/site/BlockImage'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { Prose } from '@/components/site/Prose'
import { SectionIndex } from '@/components/site/ornaments'

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
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="à propos" />

      <div className="grid grid-cols-1 gap-10 md:gap-12 lg:grid-cols-12 lg:gap-x-24">
        {/* Arche portrait — colonnes 1-5, légèrement remontée. */}
        <div className="lg:col-span-5 lg:-mt-16">
          <BlockImage
            media={image}
            sizes="(max-width: 1024px) 88vw, 38vw"
            className="mx-auto aspect-[4/5] w-full max-w-[26rem] rounded-arch lg:mx-0"
            placeholder={1}
          />
        </div>

        {/* Texte — colonnes 7-12. */}
        <div className="lg:col-span-6 lg:col-start-7 lg:pt-10">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow>{data.eyebrow}</Eyebrow>
            </Reveal>
          )}

          {data.title && (
            <h2 className="mt-5 text-[length:var(--text-h2)]">
              <MaskLines delay={0.08}>
                <span>
                  <Emphasis text={data.title} />
                </span>
              </MaskLines>
            </h2>
          )}

          {data.intro && (
            <Reveal delay={0.14}>
              <p className="mt-6 max-w-[50ch] text-[length:var(--text-lead)] leading-[1.7] text-ink">
                {data.intro}
              </p>
            </Reveal>
          )}

          {data.body && (
            <Reveal delay={0.2}>
              <Prose text={data.body} className="mt-6 max-w-[56ch]" />
            </Reveal>
          )}

          {data.values.length > 0 && (
            <dl className="mt-10 grid grid-cols-1 gap-px border-t border-line-strong sm:grid-cols-2 md:mt-12">
              {data.values.map((value, i) => (
                <Reveal key={i} delay={0.24 + i * 0.06}>
                  <div className="border-b border-line py-6 sm:pr-10 md:py-7">
                    <dt className="font-serif text-[1.05rem] font-light text-ink">
                      {value.label}
                    </dt>
                    <dd className="mt-2 text-[0.92rem] leading-[1.75] text-ink-soft">
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
  description: 'Arche portrait, présentation, parcours et valeurs.',
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
    eyebrow: 'À propos',
    title: 'Une écoute *sans* jugement.',
    intro:
      'Je suis Anne Winzenried, thérapeute installée à Cesson-Sévigné depuis quinze ans. J’accompagne des adultes, des couples et des adolescents dans les moments où la vie demande d’être regardée autrement.',
    body:
      'Formée à l’écoute active et à la thérapie brève, j’ai d’abord travaillé en institution avant d’ouvrir mon cabinet. Plus de quatre cents personnes m’ont fait confiance depuis, chacune avec son histoire, son rythme, ses silences.\n\nJe ne crois pas aux méthodes qui s’appliquent à tout le monde. Je crois à la relation qui se construit séance après séance, à la parole qui se délie quand elle se sent accueillie, et au temps qu’il faut pour que quelque chose bouge vraiment.\n\nCe que je vous propose, c’est un espace où vous n’avez rien à prouver. Vous arrivez comme vous êtes ; nous avançons ensemble.',
    mediaId: null,
    values: [
      {
        label: 'Écoute',
        text: 'Chaque séance commence par ce que vous avez à dire, sans grille ni questionnaire. C’est votre parole qui donne la direction.',
      },
      {
        label: 'Confidentialité',
        text: 'Ce qui se dit au cabinet reste au cabinet. Le secret professionnel n’est pas une formalité, c’est la condition même de la confiance.',
      },
      {
        label: 'Rythme',
        text: 'Une séance par semaine, tous les quinze jours ou selon vos besoins : le rythme se décide ensemble et peut évoluer.',
      },
      {
        label: 'Autonomie',
        text: 'L’objectif n’est pas de vous garder, mais de vous aider à repartir avec vos propres ressources, plus solides qu’avant.',
      },
    ],
  },
  Component: About,
}
