import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { ImageReveal } from '@/components/motion/ImageReveal'
import { Prose } from '@/components/site/Prose'
import { Reveal } from '@/components/motion/Reveal'

/* ════════════════════════════════════════════════════════════════════
   À propos — Portrait éditorial
   Portrait haut à gauche, colonne de texte décalée vers le bas à
   droite, signée en serif italique. Le décalage vertical crée la
   tension éditoriale — pas d'ornement.
   ════════════════════════════════════════════════════════════════════ */

export const aproposPortraitSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  intro: z.string().default(''),
  body: z.string().default(''),
  signature: z.string().default(''),
  mediaId: z.string().uuid().nullable().default(null),
})

function AproposPortrait({
  data,
  ctx,
}: BlockProps<z.output<typeof aproposPortraitSchema>>) {
  const image = ctx.resolveMedia(data.mediaId)

  return (
    <div className="container-editorial">
      <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-x-24">
        <div className="lg:col-span-5">
          <ImageReveal
            media={image}
            sizes="(max-width: 1024px) 100vw, 38vw"
            className="aspect-3/4 w-full"
          />
        </div>

        {/* Colonne décalée vers le bas — la lecture descend avec elle. */}
        <div className="lg:col-span-6 lg:col-start-7 lg:pt-28">
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

          {data.signature && (
            <Reveal delay={0.28}>
              <div className="mt-12 border-t border-line pt-8">
                <p className="font-serif text-[1.3rem] italic leading-snug text-ink">
                  {data.signature}
                </p>
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </div>
  )
}

export const aproposPortraitBlock: BlockDefinition<
  typeof aproposPortraitSchema
> = {
  label: 'À propos — Portrait éditorial',
  description: 'Portrait à gauche, texte décalé vers le bas, signature.',
  group: 'Sections',
  schema: aproposPortraitSchema,
  suggestedAnchor: 'a-propos',
  navigable: true,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.textarea('intro', 'Accroche'),
    field.richtext('body', 'Présentation'),
    field.text('signature', 'Signature', {
      placeholder: 'Amaswi — thérapeute',
    }),
    field.media('mediaId', 'Portrait'),
  ],
  defaults: {
    eyebrow: 'À PROPOS',
    title: 'Une présence *attentive*, avant toute méthode.',
    intro:
      'Je vous accueille dans un cadre calme, sans jugement, où chaque mot a le temps d’arriver.',
    body: 'Formée à l’écoute active et aux approches psychocorporelles, j’accompagne depuis plusieurs années des personnes traversant des périodes de doute, de transition ou d’épuisement.\n\nMon travail ne consiste pas à donner des réponses toutes faites, mais à ouvrir un espace où les vôtres peuvent émerger.',
    signature: 'Amaswi',
    mediaId: null,
  },
  Component: AproposPortrait,
}

/* ════════════════════════════════════════════════════════════════════
   À propos — Asymétrique
   Titre en haut à droite, image carrée qui descend à gauche, un
   chiffre clé en grande serif qui chevauche le bord de l'image, deux
   colonnes de texte. Le chiffre est posé sans fond : il reste juste
   sur le vide entre les colonnes, quel que soit le thème de section.
   ════════════════════════════════════════════════════════════════════ */

export const aproposAsymetriqueSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  statValue: z.string().default(''),
  statLabel: z.string().default(''),
  body: z.string().default(''),
  secondBody: z.string().default(''),
  mediaId: z.string().uuid().nullable().default(null),
})

function AproposAsymetrique({
  data,
  ctx,
}: BlockProps<z.output<typeof aproposAsymetriqueSchema>>) {
  const image = ctx.resolveMedia(data.mediaId)

  return (
    <div className="container-editorial">
      <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-x-12">
        {/* Image carrée, descendue — le titre la surplombe. */}
        <div className="relative order-2 lg:order-1 lg:col-span-5 lg:mt-24">
          <ImageReveal
            media={image}
            sizes="(max-width: 1024px) 100vw, 38vw"
            className="aspect-square w-full"
          />

          {(data.statValue || data.statLabel) && (
            <Reveal delay={0.25}>
              <div className="mt-8 lg:absolute lg:bottom-10 lg:right-0 lg:mt-0 lg:translate-x-1/3 lg:text-right">
                {data.statValue && (
                  <p className="font-serif text-[clamp(3rem,5vw,4.5rem)] leading-none text-blue-deep">
                    {data.statValue}
                  </p>
                )}
                {data.statLabel && (
                  <p className="mt-3 text-[0.72rem] uppercase tracking-[0.16em] text-stone">
                    {data.statLabel}
                  </p>
                )}
              </div>
            </Reveal>
          )}
        </div>

        <div className="order-1 lg:order-2 lg:col-span-7 lg:col-start-6">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow>{data.eyebrow}</Eyebrow>
            </Reveal>
          )}

          {data.title && (
            <Reveal delay={0.08}>
              <h2 className="mt-8 max-w-[22ch] text-[length:var(--text-h2)]">
                <Emphasis text={data.title} />
              </h2>
            </Reveal>
          )}

          {(data.body || data.secondBody) && (
            <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2">
              {data.body && (
                <Reveal delay={0.16}>
                  <Prose text={data.body} />
                </Reveal>
              )}
              {data.secondBody && (
                <Reveal delay={0.22}>
                  <Prose text={data.secondBody} />
                </Reveal>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const aproposAsymetriqueBlock: BlockDefinition<
  typeof aproposAsymetriqueSchema
> = {
  label: 'À propos — Asymétrique',
  description:
    'Titre à droite, image carrée descendue, chiffre clé en chevauchement.',
  group: 'Sections',
  schema: aproposAsymetriqueSchema,
  suggestedAnchor: 'a-propos',
  navigable: true,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.text('statValue', 'Chiffre clé', { placeholder: '10 ans' }),
    field.text('statLabel', 'Légende du chiffre', {
      placeholder: 'd’accompagnement',
    }),
    field.richtext('body', 'Première colonne'),
    field.richtext('secondBody', 'Seconde colonne'),
    field.media('mediaId', 'Image'),
  ],
  defaults: {
    eyebrow: 'À PROPOS',
    title: 'Un accompagnement construit sur la *confiance*.',
    statValue: '10 ans',
    statLabel: 'd’accompagnement',
    body: 'Chaque personne arrive avec une histoire singulière. Mon rôle est de l’accueillir telle qu’elle est, sans grille imposée, et de cheminer à ses côtés.',
    secondBody:
      'Les séances alternent parole, silence et respiration. C’est souvent dans ces respirations que quelque chose se dénoue.',
    mediaId: null,
  },
  Component: AproposAsymetrique,
}

/* ════════════════════════════════════════════════════════════════════
   À propos — Parcours
   Introduction fixée à gauche, chronologie à droite : chaque étape
   sur un filet vertical, ponctuée d'un point bleu, avec un décalage
   horizontal progressif qui fait descendre le regard.
   ════════════════════════════════════════════════════════════════════ */

export const aproposParcoursSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  intro: z.string().default(''),
  steps: z
    .array(z.object({ year: z.string(), title: z.string(), text: z.string() }))
    .default([]),
})

const PARCOURS_OFFSETS = ['', 'lg:ml-10', 'lg:ml-20', 'lg:ml-28'] as const

function AproposParcours({
  data,
}: BlockProps<z.output<typeof aproposParcoursSchema>>) {
  return (
    <div className="container-editorial">
      <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-x-24">
        <div className="lg:sticky lg:top-32 lg:col-span-4 lg:self-start">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow>{data.eyebrow}</Eyebrow>
            </Reveal>
          )}
          {data.title && (
            <Reveal delay={0.08}>
              <h2 className="mt-8 max-w-[14ch] text-[length:var(--text-h2)]">
                <Emphasis text={data.title} />
              </h2>
            </Reveal>
          )}
          {data.intro && (
            <Reveal delay={0.14}>
              <Prose text={data.intro} className="mt-7 max-w-[38ch]" />
            </Reveal>
          )}
        </div>

        <div className="lg:col-span-7 lg:col-start-6">
          {data.steps.map((step, i) => {
            const offset =
              PARCOURS_OFFSETS[Math.min(i, PARCOURS_OFFSETS.length - 1)] ?? ''
            const last = i === data.steps.length - 1

            return (
              <Reveal key={i} delay={Math.min(0.1 + i * 0.06, 0.5)}>
                <div
                  className={`relative border-l border-line pl-10 ${
                    last ? 'pb-2' : 'pb-16'
                  } ${offset}`}
                >
                  {/* Point sur la ligne — le seul accent de couleur. */}
                  <span
                    aria-hidden="true"
                    className="absolute -left-[3.5px] top-1.5 block h-[7px] w-[7px] rounded-full bg-blue-deep"
                  />

                  {step.year && (
                    <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-blue-deep">
                      {step.year}
                    </p>
                  )}
                  {step.title && (
                    <h3 className="mt-3 text-[length:var(--text-h3)]">
                      {step.title}
                    </h3>
                  )}
                  {step.text && (
                    <p className="mt-3 max-w-[46ch] text-[0.94rem] leading-[1.75] text-ink-soft">
                      {step.text}
                    </p>
                  )}
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export const aproposParcoursBlock: BlockDefinition<
  typeof aproposParcoursSchema
> = {
  label: 'À propos — Parcours',
  description: 'Chronologie d’étapes le long d’un filet, introduction fixe.',
  group: 'Sections',
  schema: aproposParcoursSchema,
  suggestedAnchor: 'a-propos',
  navigable: true,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.richtext('intro', 'Introduction'),
    field.list(
      'steps',
      'Étapes du parcours',
      [
        field.text('year', 'Année'),
        field.text('title', 'Intitulé'),
        field.textarea('text', 'Description'),
      ],
      { addLabel: 'Ajouter une étape' },
    ),
  ],
  defaults: {
    eyebrow: 'PARCOURS',
    title: 'Le chemin qui m’a menée *ici*.',
    intro:
      'Un parcours fait de formations exigeantes et de rencontres décisives — chacune a affiné ma manière d’accompagner.',
    steps: [
      {
        year: '2012',
        title: 'Formation initiale',
        text: 'Diplôme en psychologie clinique, suivi d’une spécialisation en accompagnement des transitions de vie.',
      },
      {
        year: '2016',
        title: 'Approches psychocorporelles',
        text: 'Certification en pratiques de pleine conscience et travail sur la respiration.',
      },
      {
        year: '2019',
        title: 'Ouverture du cabinet',
        text: 'Installation dans un lieu pensé comme un refuge : lumière douce, silence, confidentialité.',
      },
    ],
  },
  Component: AproposParcours,
}
