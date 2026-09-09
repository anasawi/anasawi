import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { Prose } from '@/components/site/Prose'
import { Reveal } from '@/components/motion/Reveal'

/* ════════════════════════════════════════════════════════════════════
   Approche — Principes
   Trois colonnes ouvertes par un filet supérieur appuyé et un petit
   numéro bleu. Une grille de revue, pas des cartes.
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
}: BlockProps<z.output<typeof approcheColonnesSchema>>) {
  return (
    <div className="container-editorial">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow>{data.eyebrow}</Eyebrow>
            </Reveal>
          )}
          {data.title && (
            <Reveal delay={0.06}>
              <h2 className="mt-8 text-[length:var(--text-h2)]">
                <Emphasis text={data.title} />
              </h2>
            </Reveal>
          )}
        </div>

        {data.intro && (
          <div className="lg:col-span-5 lg:col-start-8 lg:pt-4">
            <Reveal delay={0.12}>
              <Prose text={data.intro} size="lead" />
            </Reveal>
          </div>
        )}
      </div>

      {data.items.length > 0 && (
        <div className="mt-20 grid grid-cols-1 gap-x-12 gap-y-14 lg:grid-cols-3">
          {data.items.map((item, i) => (
            <Reveal key={i} delay={Math.min(0.1 + i * 0.07, 0.45)}>
              <div className="h-full border-t border-line-strong pt-8">
                <span className="text-[0.8rem] font-medium tracking-[0.1em] text-blue-deep">
                  {String(i + 1).padStart(2, '0')} ·
                </span>
                {item.title && (
                  <h3 className="mt-4 text-[length:var(--text-h3)]">
                    {item.title}
                  </h3>
                )}
                {item.text && (
                  <p className="mt-4 max-w-[42ch] text-[0.94rem] leading-[1.78] text-ink-soft">
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
  description: 'Trois principes en colonnes, filets supérieurs appuyés.',
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
    eyebrow: 'L’APPROCHE',
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
   chacune ouverte par un grand numéro serif italique. En mobile :
   une pile simple le long d'un bord gauche.
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
}: BlockProps<z.output<typeof processusVerticalSchema>>) {
  return (
    <div className="container-editorial">
      <div className="mx-auto max-w-[44rem] text-center">
        {data.eyebrow && (
          <Reveal>
            <Eyebrow className="justify-center">{data.eyebrow}</Eyebrow>
          </Reveal>
        )}
        {data.title && (
          <Reveal delay={0.06}>
            <h2 className="mt-8 text-[length:var(--text-h2)]">
              <Emphasis text={data.title} />
            </h2>
          </Reveal>
        )}
      </div>

      {data.steps.length > 0 && (
        <div className="relative mt-20 lg:mt-28">
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
                      <span className="font-serif text-[2.6rem] italic leading-none text-blue-deep">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {step.title && (
                        <h3 className="mt-5 text-[length:var(--text-h3)]">
                          {step.title}
                        </h3>
                      )}
                      {step.text && (
                        <p
                          className={`mt-3 max-w-[44ch] text-[0.94rem] leading-[1.78] text-ink-soft ${
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
    eyebrow: 'COMMENT ÇA SE PASSE',
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
