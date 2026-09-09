import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { MaskLines, Reveal } from '@/components/site/anim'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { Prose } from '@/components/site/Prose'
import { SectionIndex } from '@/components/site/ornaments'

/*
 * L'approche — principes et déroulés.
 */

const NUMBER_WORDS = [
  'un',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
] as const

function numberWord(i: number): string {
  return NUMBER_WORDS[i] ?? String(i + 1)
}

/* ════════════════════════════════════════════════════════════════════
   Approche — Principes
   Trois colonnes ouvertes par un filet appuyé et un index serif
   italique en toutes lettres. Une grille de revue, pas des cartes.
   ════════════════════════════════════════════════════════════════════ */

export const approcheColonnesSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  intro: z.string().default(''),
  items: z
    .array(z.object({ title: z.string(), text: z.string() }))
    .default([]),
})

function ApprocheColonnes({
  data,
  ctx,
}: BlockProps<z.output<typeof approcheColonnesSchema>>) {
  return (
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="approche" className="-top-14" />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow>{data.eyebrow}</Eyebrow>
            </Reveal>
          )}
          {data.title && (
            <h2 className="mt-7 text-[length:var(--text-h2)]">
              <MaskLines delay={0.08}>
                <span>
                  <Emphasis text={data.title} />
                </span>
              </MaskLines>
            </h2>
          )}
        </div>

        {data.intro && (
          <div className="lg:col-span-5 lg:col-start-8 lg:pt-4">
            <Reveal delay={0.14}>
              <Prose text={data.intro} size="lead" />
            </Reveal>
          </div>
        )}
      </div>

      {data.items.length > 0 && (
        <div className="mt-16 grid grid-cols-1 gap-x-12 gap-y-14 lg:mt-20 lg:grid-cols-3">
          {data.items.map((item, i) => (
            <Reveal key={i} delay={Math.min(0.1 + i * 0.08, 0.45)}>
              <div className="h-full border-t border-line-strong pt-8">
                <span className="font-serif text-[1.2rem] font-light italic text-blue-deep">
                  {numberWord(i)}
                </span>
                {item.title && (
                  <h3 className="mt-3 text-[length:var(--text-h3)]">
                    {item.title}
                  </h3>
                )}
                {item.text && (
                  <p className="mt-4 max-w-[42ch] text-[0.94rem] leading-[1.8] text-ink-soft">
                    {item.text}
                  </p>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  )
}

export const approcheColonnesBlock: BlockDefinition<
  typeof approcheColonnesSchema
> = {
  label: 'Approche — Principes',
  description:
    'Trois principes en colonnes, filets appuyés, index en toutes lettres.',
  group: 'Sections',
  schema: approcheColonnesSchema,
  suggestedAnchor: 'approche',
  navigable: true,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.textarea('intro', 'Introduction'),
    field.list(
      'items',
      'Principes',
      [field.text('title', 'Intitulé'), field.textarea('text', 'Description')],
      { addLabel: 'Ajouter un principe' },
    ),
  ],
  defaults: {
    eyebrow: 'L’approche',
    title: 'Trois principes, un seul *cap*.',
    intro: '',
    items: [
      {
        title: 'Écouter sans juger',
        text: 'Tout peut se dire ici. Le cadre est confidentiel, et rien de ce que vous déposez ne sera retourné contre vous.',
      },
      {
        title: 'Avancer à votre rythme',
        text: 'Il n’y a pas de calendrier imposé. Certaines choses demandent du temps — on le leur accorde.',
      },
      {
        title: 'Relier corps et esprit',
        text: 'La respiration, les sensations, la posture : le corps sait souvent avant les mots. On l’écoute aussi.',
      },
    ],
  },
  Component: ApprocheColonnes,
}

/* ════════════════════════════════════════════════════════════════════
   Approche — Processus vertical
   Une fine ligne centrale, des étapes alternées de part et d'autre,
   chacune ouverte par son index serif italique. En mobile : une pile
   simple le long d'un bord gauche.
   ════════════════════════════════════════════════════════════════════ */

export const processusVerticalSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  steps: z
    .array(z.object({ title: z.string(), text: z.string() }))
    .default([]),
})

function ProcessusVertical({
  data,
  ctx,
}: BlockProps<z.output<typeof processusVerticalSchema>>) {
  return (
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="le chemin" className="-top-14" />

      <div className="mx-auto max-w-[44rem] text-center">
        {data.eyebrow && (
          <Reveal>
            <Eyebrow className="justify-center">{data.eyebrow}</Eyebrow>
          </Reveal>
        )}
        {data.title && (
          <h2 className="mt-7 text-[length:var(--text-h2)]">
            <MaskLines delay={0.08}>
              <span>
                <Emphasis text={data.title} />
              </span>
            </MaskLines>
          </h2>
        )}
      </div>

      {data.steps.length > 0 && (
        <div className="relative mt-16 lg:mt-24">
          {/* Ligne centrale — invisible en mobile, où la pile suffit. */}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-line lg:block"
          />

          <div className="space-y-14 lg:space-y-24">
            {data.steps.map((step, i) => {
              const left = i % 2 === 0

              return (
                <Reveal key={i} delay={Math.min(0.1 + i * 0.06, 0.45)}>
                  <div className="border-l border-line pl-8 lg:grid lg:grid-cols-2 lg:border-l-0 lg:pl-0">
                    <div
                      className={
                        left
                          ? 'lg:pr-20 lg:text-right'
                          : 'lg:col-start-2 lg:pl-20'
                      }
                    >
                      <span className="font-serif text-[2.2rem] font-light italic leading-none text-blue-deep">
                        {numberWord(i)}
                      </span>
                      {step.title && (
                        <h3 className="mt-4 text-[length:var(--text-h3)]">
                          {step.title}
                        </h3>
                      )}
                      {step.text && (
                        <p
                          className={`mt-3 max-w-[44ch] text-[0.94rem] leading-[1.8] text-ink-soft ${
                            left ? 'lg:ml-auto' : ''
                          }`}
                        >
                          {step.text}
                        </p>
                      )}
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export const processusVerticalBlock: BlockDefinition<
  typeof processusVerticalSchema
> = {
  label: 'Approche — Processus vertical',
  description: 'Étapes alternées le long d’une fine ligne centrale.',
  group: 'Sections',
  schema: processusVerticalSchema,
  suggestedAnchor: 'approche',
  navigable: true,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.list(
      'steps',
      'Étapes',
      [field.text('title', 'Intitulé'), field.textarea('text', 'Description')],
      { addLabel: 'Ajouter une étape' },
    ),
  ],
  defaults: {
    eyebrow: 'Comment ça se passe',
    title: 'Le déroulé d’un *accompagnement*.',
    steps: [
      {
        title: 'Premier échange',
        text: 'Un appel ou une rencontre pour poser votre situation, vos attentes, et répondre à vos questions.',
      },
      {
        title: 'Cadre et rythme',
        text: 'Nous définissons ensemble la fréquence des séances et les objectifs — révisables à tout moment.',
      },
      {
        title: 'Le travail de fond',
        text: 'Séance après séance, ce qui pesait se dépose, se met en mots et trouve peu à peu sa place.',
      },
      {
        title: 'Vers l’autonomie',
        text: 'L’accompagnement se conclut quand vous vous sentez prêt·e — la porte reste toujours ouverte.',
      },
    ],
  },
  Component: ProcessusVertical,
}
