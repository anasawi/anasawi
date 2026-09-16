import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { CircleText, Counter, MaskLines, Reveal } from '@/components/site/anim'
import { BlockImage } from '@/components/site/BlockImage'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { Prose } from '@/components/site/Prose'
import { SectionIndex } from '@/components/site/ornaments'

/*
 * Se présenter — les compositions « qui je suis » de la bibliothèque.
 */

/* ════════════════════════════════════════════════════════════════════
   À propos — Portrait (proposition D de la planche)
   Arche portrait à gauche avec badge du nom en pilule, titre serif en
   lignes masquées à droite, rangée de chiffres qui se comptent.
   ════════════════════════════════════════════════════════════════════ */

export const aproposPortraitSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  intro: z.string().default(''),
  body: z.string().default(''),
  signature: z.string().default(''),
  mediaId: z.string().uuid().nullable().default(null),
  stats: z
    .array(
      z.object({
        value: z.number().default(0),
        suffix: z.string().default(''),
        label: z.string().default(''),
      }),
    )
    .default([]),
  linkLabel: z.string().default(''),
  linkHref: z.string().default('#contact'),
})

function AproposPortrait({
  data,
  ctx,
}: BlockProps<z.output<typeof aproposPortraitSchema>>) {
  const image = ctx.resolveMedia(data.mediaId)

  return (
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="à propos" />

      <div className="grid grid-cols-1 items-center gap-10 md:gap-12 lg:grid-cols-12 lg:gap-x-5">
        {/* Arche portrait + badge du nom. */}
        <div className="relative mx-auto w-full max-w-[24rem] lg:col-span-4 lg:col-start-2 lg:mx-0">
          <BlockImage
            media={image}
            sizes="(max-width: 1024px) 88vw, 32vw"
            className="aspect-[3/4] w-full rounded-arch"
            placeholder={1}
          />
          {data.signature && (
            <Reveal delay={0.3}>
              <span className="absolute -right-4 bottom-9 z-[3] rounded-full border border-line-strong bg-ivory px-6 py-3 font-serif text-[17px] font-light italic text-blue-deep shadow-[0_14px_40px_rgba(43,47,44,0.08)] lg:right-[-26px]">
                {data.signature}
              </span>
            </Reveal>
          )}
        </div>

        <div className="lg:col-span-5 lg:col-start-7">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow>{data.eyebrow}</Eyebrow>
            </Reveal>
          )}

          {data.title && (
            <h2 className="mt-5 max-w-[24ch] font-serif text-[clamp(28px,2.8vw,46px)] font-light leading-[1.3] text-ink">
              <MaskLines delay={0.1}>
                <span>
                  <Emphasis text={data.title} />
                </span>
              </MaskLines>
            </h2>
          )}

          {data.intro && (
            <Reveal delay={0.16}>
              <p className="mt-6 max-w-[50ch] text-[length:var(--text-lead)] leading-[1.7] text-ink">
                {data.intro}
              </p>
            </Reveal>
          )}

          {data.body && (
            <Reveal delay={0.22}>
              <Prose text={data.body} className="mt-6 max-w-[56ch]" />
            </Reveal>
          )}

          {data.stats.length > 0 && (
            <Reveal delay={0.28}>
              <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4 sm:gap-x-12 md:gap-y-5">
                {data.stats.map((stat, i) => (
                  <div key={i}>
                    <span className="font-serif text-[2.5rem] font-light italic leading-none text-blue-deep">
                      <Counter value={stat.value} />
                      {stat.suffix}
                    </span>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>
          )}

          {data.linkLabel && (
            <Reveal delay={0.36}>
              {/* Le lien méta souligné de bleu — proposition D. */}
              <p className="mt-8">
                <a
                  href={data.linkHref}
                  className="inline-block border-b border-blue pb-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-deep transition-colors duration-300 hover:text-night"
                >
                  {data.linkLabel} →
                </a>
              </p>
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
  label: 'À propos — Portrait',
  description:
    'Arche portrait avec badge du nom, titre serif, chiffres qui se comptent.',
  group: 'Sections',
  schema: aproposPortraitSchema,
  suggestedAnchor: 'a-propos',
  navigable: true,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.textarea('title', 'Titre', {
      help: 'Astérisques pour l’italique : *mot*.',
    }),
    field.textarea('intro', 'Accroche'),
    field.richtext('body', 'Présentation'),
    field.text('signature', 'Badge sur le portrait', {
      placeholder: 'Anne Winzenried',
    }),
    field.media('mediaId', 'Portrait'),
    field.list(
      'stats',
      'Chiffres clés',
      [
        field.number('value', 'Nombre'),
        field.text('suffix', 'Après le nombre', { placeholder: '+, h…' }),
        field.text('label', 'Légende'),
      ],
      { addLabel: 'Ajouter un chiffre' },
    ),
    field.text('linkLabel', 'Lien — libellé'),
    field.text('linkHref', 'Lien — destination'),
  ],
  defaults: {
    eyebrow: 'Qui je suis',
    title:
      'Quinze ans à accueillir ce qui vient — les silences comme les débordements — *sans jamais juger*.',
    intro:
      'Je suis Anne Winzenried, thérapeute à Cesson-Sévigné. Depuis quinze ans, j’accompagne des adultes, des adolescents et des parents qui traversent une période où quelque chose ne tient plus tout à fait.',
    body: 'Formée à l’écoute thérapeutique et supervisée régulièrement, je travaille sans méthode toute faite : chaque personne arrive avec son histoire, son rythme, et c’est de là que nous partons.\n\nLe cabinet est un lieu simple, calme, où l’on peut déposer ce qui pèse — le deuil, l’anxiété, l’épuisement, une séparation — sans avoir à se justifier. On ne répare pas les gens ici. On les écoute, et quelque chose se remet en mouvement.',
    signature: 'Anne Winzenried',
    mediaId: null,
    stats: [
      { value: 15, suffix: ' ans', label: 'de pratique' },
      { value: 400, suffix: '+', label: 'personnes accompagnées' },
      { value: 48, suffix: ' h', label: 'pour vous répondre' },
    ],
    linkLabel: 'Découvrir mon parcours',
    linkHref: '#a-propos',
  },
  Component: AproposPortrait,
}

/* ════════════════════════════════════════════════════════════════════
   À propos — Asymétrique
   Titre en haut à droite, arche carrée descendue à gauche, chiffre
   serif italique qui chevauche son bord, deux colonnes de texte.
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
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="à propos" />

      <div className="grid grid-cols-1 gap-10 md:gap-12 lg:grid-cols-12 lg:gap-x-12">
        {/* Arche descendue — le titre la surplombe. */}
        <div className="relative order-2 lg:order-1 lg:col-span-5 lg:mt-24">
          <BlockImage
            media={image}
            sizes="(max-width: 1024px) 100vw, 38vw"
            className="aspect-[4/4.6] w-full rounded-arch"
            placeholder={1}
          />

          {(data.statValue || data.statLabel) && (
            <Reveal delay={0.25}>
              <div className="mt-8 lg:absolute lg:bottom-10 lg:right-0 lg:mt-0 lg:translate-x-1/3 lg:text-right">
                {data.statValue && (
                  <p className="font-serif text-[clamp(3rem,5vw,4.5rem)] font-light italic leading-none text-blue-deep">
                    {data.statValue}
                  </p>
                )}
                {data.statLabel && (
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
                    {data.statLabel}
                  </p>
                )}
              </div>
            </Reveal>
          )}
        </div>

        <div className="order-1 lg:order-2 lg:col-span-6 lg:col-start-7">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow>{data.eyebrow}</Eyebrow>
            </Reveal>
          )}

          {data.title && (
            <h2 className="mt-5 max-w-[22ch] text-[length:var(--text-h2)]">
              <MaskLines delay={0.08}>
                <span>
                  <Emphasis text={data.title} />
                </span>
              </MaskLines>
            </h2>
          )}

          {(data.body || data.secondBody) && (
            <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-2 md:mt-12">
              {data.body && (
                <Reveal delay={0.16}>
                  <Prose text={data.body} />
                </Reveal>
              )}
              {data.secondBody && (
                <Reveal delay={0.24}>
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
    'Titre à droite, arche descendue à gauche, chiffre italique en chevauchement.',
  group: 'Sections',
  schema: aproposAsymetriqueSchema,
  suggestedAnchor: 'a-propos',
  navigable: true,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.text('statValue', 'Chiffre clé', { placeholder: '15 ans' }),
    field.text('statLabel', 'Légende du chiffre', {
      placeholder: 'd’accompagnement',
    }),
    field.richtext('body', 'Première colonne'),
    field.richtext('secondBody', 'Seconde colonne'),
    field.media('mediaId', 'Image'),
  ],
  defaults: {
    eyebrow: 'À propos',
    title: 'Un accompagnement construit sur la *confiance*.',
    statValue: '15 ans',
    statLabel: 'd’accompagnement',
    body: 'Chaque personne arrive avec une histoire singulière. Mon rôle est de l’accueillir telle qu’elle est, sans grille imposée, et de cheminer à ses côtés le temps qu’il faut.\n\nJe reçois des adultes, des adolescents et des parents, au cabinet de Cesson-Sévigné ou en visio. Quinze ans de pratique et une supervision régulière m’ont appris une chose simple : l’écoute précède toujours le conseil.',
    secondBody:
      'Les séances alternent parole, silence et respiration. C’est souvent dans ces respirations que quelque chose se dénoue — une phrase que l’on n’avait jamais dite, une émotion enfin nommée.\n\nLe cadre est clair, confidentiel et chaleureux. On y avance sans urgence, avec la certitude d’être entendu·e, et la liberté de s’arrêter quand on se sent prêt·e.',
    mediaId: null,
  },
  Component: AproposAsymetrique,
}

/* ════════════════════════════════════════════════════════════════════
   À propos — Parcours
   Introduction fixée à gauche, chronologie à droite : chaque étape
   sur un filet vertical, ponctuée d'un point bleu, décalage
   horizontal progressif.
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
  ctx,
}: BlockProps<z.output<typeof aproposParcoursSchema>>) {
  return (
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="parcours" />

      <div className="grid grid-cols-1 gap-10 md:gap-12 lg:grid-cols-12 lg:gap-x-24">
        <div className="lg:sticky lg:top-32 lg:col-span-4 lg:self-start">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow>{data.eyebrow}</Eyebrow>
            </Reveal>
          )}
          {data.title && (
            <h2 className="mt-5 max-w-[14ch] text-[length:var(--text-h2)]">
              <MaskLines delay={0.08}>
                <span>
                  <Emphasis text={data.title} />
                </span>
              </MaskLines>
            </h2>
          )}
          {data.intro && (
            <Reveal delay={0.14}>
              <Prose text={data.intro} className="mt-6 max-w-[38ch]" />
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
                  className={`relative border-l border-line pl-7 md:pl-10 ${
                    last ? 'pb-0' : 'pb-10 md:pb-12'
                  } ${offset}`}
                >
                  <span
                    aria-hidden="true"
                    className="absolute -left-1 top-1.5 block h-[7px] w-[7px] rounded-full bg-blue-deep"
                  />

                  {step.year && (
                    <p className="font-serif text-[15px] font-light italic text-blue-deep">
                      {step.year}
                    </p>
                  )}
                  {step.title && (
                    <h3 className="mt-3 text-[length:var(--text-h3)]">
                      {step.title}
                    </h3>
                  )}
                  {step.text && (
                    <p className="mt-3 max-w-[46ch] text-[0.94rem] leading-[1.8] text-ink-soft">
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
  suggestedAnchor: 'parcours',
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
    eyebrow: 'Parcours',
    title: 'Le chemin qui m’a menée *ici*.',
    intro:
      'Des formations exigeantes, des rencontres décisives — chacune a affiné ma manière d’accompagner.\n\nCe parcours n’est pas une ligne droite : il ressemble aux chemins que l’on emprunte ensemble en séance, avec ses détours et ses éclaircies.',
    steps: [
      {
        year: 'Les débuts',
        title: 'Formée à l’écoute thérapeutique',
        text: 'Plusieurs années de formation à la relation d’aide et à l’écoute, puis les premiers accompagnements, auprès d’adultes traversant deuils et séparations.',
      },
      {
        year: 'Au fil des années',
        title: 'Le corps entre dans la séance',
        text: 'Respiration, sensations, posture : je me forme aux approches qui relient le corps et la parole, pour accueillir ce que les mots ne disent pas encore.',
      },
      {
        year: 'Rue Saint-Martin',
        title: 'Ouverture du cabinet',
        text: 'Installation à Cesson-Sévigné, dans un lieu pensé comme un refuge : lumière douce, silence, confidentialité. Un cabinet qui ressemble à une maison.',
      },
      {
        year: 'Aujourd’hui',
        title: 'Quinze ans de pratique',
        text: 'Plus de quatre cents personnes accompagnées, une supervision régulière, et la même conviction : on ne répare pas les gens, on les écoute.',
      },
    ],
  },
  Component: AproposParcours,
}

/* ════════════════════════════════════════════════════════════════════
   À propos — Le médaillon (proposition L de la planche)
   Un grand chiffre serif italique dans un médaillon circulaire, une
   couronne de texte qui tourne autour, la phrase qui le porte à côté.
   ════════════════════════════════════════════════════════════════════ */

export const aproposMedaillonSchema = z.object({
  value: z.number().default(15),
  unit: z.string().default(''),
  ring: z.string().default(''),
  title: z.string().default(''),
  text: z.string().default(''),
})

function AproposMedaillon({
  data,
  ctx,
}: BlockProps<z.output<typeof aproposMedaillonSchema>>) {
  return (
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="en chiffres" />

      <div className="grid grid-cols-1 items-center gap-10 md:gap-12 lg:grid-cols-12 lg:gap-x-5">
        <Reveal className="lg:col-span-4 lg:col-start-2 lg:justify-self-center">
          <div className="relative mx-auto grid aspect-square w-[min(270px,64vw)] place-items-center rounded-full border border-line-strong lg:w-[min(270px,27vw)]">
            {/* Chiffre et légende empilés : les chiffres elzéviriens de
                Cormorant descendent sous la ligne de base (le 5, le 4…),
                donc une légende positionnée en absolu finit par les
                toucher. Le flux garantit l'écart à toutes les tailles. */}
            <div className="flex flex-col items-center">
              {/* pb = la place du jambage du 5 italique, qui descend
                  sous la ligne de base d'environ un quart de cadratin. */}
              <span className="pb-[0.24em] font-serif text-[clamp(4.75rem,8.5vw,8.25rem)] font-light italic leading-[0.9] text-blue-deep">
                <Counter value={data.value} />
              </span>
              {data.unit && (
                <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
                  {data.unit}
                </span>
              )}
            </div>
            {data.ring && (
              <CircleText
                text={data.ring}
                radius={56}
                textClassName="fill-stone text-[6.5px] tracking-[0.42em]"
                className="absolute -inset-[9%] h-auto w-[118%]"
              />
            )}
          </div>
        </Reveal>

        <div className="text-center lg:col-span-6 lg:col-start-6 lg:text-left">
          {data.title && (
            <Reveal delay={0.12}>
              <p className="font-serif text-[clamp(1.5rem,2.4vw,2.5rem)] font-light leading-[1.35] text-ink">
                <Emphasis text={data.title} />
              </p>
            </Reveal>
          )}
          {data.text && (
            <Reveal delay={0.2}>
              <p className="mx-auto mt-6 max-w-[44ch] text-[14px] leading-[1.85] text-ink-soft lg:mx-0">
                {data.text}
              </p>
            </Reveal>
          )}
        </div>
      </div>
    </div>
  )
}

export const aproposMedaillonBlock: BlockDefinition<
  typeof aproposMedaillonSchema
> = {
  label: 'À propos — Le médaillon',
  description:
    'Un grand chiffre dans un médaillon, une couronne de texte qui tourne autour.',
  group: 'Sections',
  schema: aproposMedaillonSchema,
  suggestedAnchor: 'a-propos',
  fields: [
    field.number('value', 'Le chiffre'),
    field.text('unit', 'Sous le chiffre', { placeholder: 'années' }),
    field.text('ring', 'Texte de la couronne', {
      full: true,
      help: 'Il tourne autour du médaillon — terminez par « · ».',
    }),
    field.textarea('title', 'Phrase principale', {
      help: 'Astérisques pour l’italique : *mot*.',
    }),
    field.textarea('text', 'Texte d’appui'),
  ],
  defaults: {
    value: 15,
    unit: 'années',
    ring: 'quinze années d’écoute · quinze années de présence · ',
    title: 'Quinze années à accompagner ce qui *déborde*.',
    text: 'Deuils, séparations, épuisements, transitions — et tout ce qui n’a pas encore de nom. Plus de quatre cents personnes reçues au cabinet de Cesson-Sévigné ou en visio, chacune à son rythme, sans jamais la réduire à ce qui l’a amenée.',
  },
  Component: AproposMedaillon,
}

/* ════════════════════════════════════════════════════════════════════
   À propos — Citation personnelle
   Un petit portrait rond, une conviction en grande serif, la
   signature en italique. La présentation la plus intime.
   ════════════════════════════════════════════════════════════════════ */

export const aproposCitationSchema = z.object({
  quote: z.string().default(''),
  name: z.string().default(''),
  role: z.string().default(''),
  mediaId: z.string().uuid().nullable().default(null),
})

function AproposCitation({
  data,
  ctx,
}: BlockProps<z.output<typeof aproposCitationSchema>>) {
  const image = ctx.resolveMedia(data.mediaId)

  return (
    <div className="container-editorial">
      <figure className="mx-auto max-w-[52rem] text-center">
        <Reveal>
          <BlockImage
            media={image}
            sizes="112px"
            className="mx-auto aspect-square w-24 rounded-full sm:w-28"
            placeholder={1}
          />
        </Reveal>

        {data.quote && (
          <blockquote className="mt-8">
            <Reveal delay={0.12}>
              <p className="font-serif text-[clamp(1.6rem,3vw,2.7rem)] font-light leading-[1.4] text-ink">
                <Emphasis text={data.quote} />
              </p>
            </Reveal>
          </blockquote>
        )}

        {(data.name || data.role) && (
          <Reveal delay={0.24}>
            <figcaption className="mt-8">
              <span
                aria-hidden="true"
                className="mx-auto mb-5 block h-9 w-px bg-line-strong"
              />
              {data.name && (
                <span className="block font-serif text-[1.1rem] font-light italic text-blue-deep">
                  {data.name}
                </span>
              )}
              {data.role && (
                <span className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
                  {data.role}
                </span>
              )}
            </figcaption>
          </Reveal>
        )}
      </figure>
    </div>
  )
}

export const aproposCitationBlock: BlockDefinition<
  typeof aproposCitationSchema
> = {
  label: 'À propos — Citation personnelle',
  description: 'Petit portrait rond, conviction en grande serif, signature.',
  group: 'Sections',
  schema: aproposCitationSchema,
  suggestedAnchor: 'a-propos',
  fields: [
    field.textarea('quote', 'La phrase', {
      help: 'Astérisques pour l’italique : *mot*.',
    }),
    field.text('name', 'Nom'),
    field.text('role', 'Précision', { placeholder: 'Thérapeute' }),
    field.media('mediaId', 'Portrait rond'),
  ],
  defaults: {
    quote:
      'Je ne crois pas aux méthodes toutes faites. Je crois aux personnes, à leur rythme, et à ce qui se répare quand on *écoute vraiment*.',
    name: 'Anne Winzenried',
    role: 'Thérapeute — Cesson-Sévigné',
    mediaId: null,
  },
  Component: AproposCitation,
}
