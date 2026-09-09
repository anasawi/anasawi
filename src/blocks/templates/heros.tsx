import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { ActionLink } from '@/components/site/ActionLink'
import { Eyebrow } from '@/components/site/Eyebrow'
import { ImageReveal } from '@/components/motion/ImageReveal'
import { Reveal } from '@/components/motion/Reveal'
import { SplitText } from '@/components/motion/SplitText'

/* ════════════════════════════════════════════════════════════════════
   Hero — Plein écran
   Image immersive sur toute la hauteur, texte blanc calé en bas à
   gauche sur un voile dégradé. Indépendant du thème de section :
   l'image porte son propre contraste.
   ════════════════════════════════════════════════════════════════════ */

export const heroPleinEcranSchema = z.object({
  eyebrow: z.string().default(''),
  titleLines: z.array(z.object({ text: z.string() })).default([]),
  intro: z.string().default(''),
  primaryLabel: z.string().default(''),
  primaryHref: z.string().default('#contact'),
  secondaryLabel: z.string().default(''),
  secondaryHref: z.string().default('#a-propos'),
  mediaId: z.string().uuid().nullable().default(null),
})

function HeroPleinEcran({
  data,
  ctx,
}: BlockProps<z.output<typeof heroPleinEcranSchema>>) {
  const image = ctx.resolveMedia(data.mediaId)
  const lines = data.titleLines.map((l) => l.text).filter(Boolean)

  return (
    <div className="relative flex min-h-[100svh] items-end">
      {/* Image de fond — LCP : peinte immédiatement, sans animation. */}
      <ImageReveal
        media={image}
        instant
        priority
        sizes="100vw"
        className="absolute inset-0 h-full w-full"
      />

      {/* Voile dégradé — garantit la lisibilité du texte, quel que soit
          le sujet de la photographie. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-transparent"
      />

      <div className="container-editorial relative z-10 pb-24 pt-40">
        <div className="max-w-[46rem]">
          {data.eyebrow && (
            <Reveal delay={0.05}>
              {/* Eyebrow recomposé en clair : le composant Eyebrow porte le
                  bleu du thème, illisible sur une photographie sombre. */}
              <p className="flex items-center gap-4 font-sans text-[length:var(--text-label)] font-medium uppercase tracking-[0.18em] text-white/70">
                <span
                  aria-hidden="true"
                  className="h-px w-8 shrink-0 bg-white/50"
                />
                <span>{data.eyebrow}</span>
              </p>
            </Reveal>
          )}

          {lines.length > 0 && (
            <SplitText
              as="h1"
              lines={lines}
              delay={0.12}
              className="mt-8 text-[length:var(--text-display)] leading-[1.05] text-white"
              emphasis
            />
          )}

          {data.intro && (
            <Reveal delay={0.35}>
              <p className="mt-8 max-w-[36rem] text-[length:var(--text-lead)] leading-[1.7] text-white/85">
                {data.intro}
              </p>
            </Reveal>
          )}

          {(data.primaryLabel || data.secondaryLabel) && (
            <Reveal delay={0.45}>
              <div className="mt-12 flex flex-wrap items-center gap-4">
                {data.primaryLabel && (
                  <ActionLink href={data.primaryHref} variant="primary">
                    {data.primaryLabel}
                  </ActionLink>
                )}
                {data.secondaryLabel && (
                  <ActionLink
                    href={data.secondaryHref}
                    variant="ghost"
                    className="text-white/80 hover:text-white"
                  >
                    {data.secondaryLabel}
                  </ActionLink>
                )}
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </div>
  )
}

export const heroPleinEcranBlock: BlockDefinition<
  typeof heroPleinEcranSchema
> = {
  label: 'Hero — Plein écran',
  description: 'Image immersive pleine hauteur, texte clair calé en bas.',
  group: 'Sections',
  schema: heroPleinEcranSchema,
  suggestedAnchor: 'accueil',
  navigable: true,
  bleed: true,
  fields: [
    field.text('eyebrow', 'Label supérieur', {
      placeholder: 'THÉRAPIE · ACCOMPAGNEMENT · ÉCOUTE',
    }),
    field.list(
      'titleLines',
      'Titre — une entrée par ligne',
      [field.text('text', 'Ligne', { full: true })],
      {
        addLabel: 'Ajouter une ligne',
        help: 'Entourez un mot d’astérisques pour le mettre en italique : *mot*.',
      },
    ),
    field.textarea('intro', 'Texte d’introduction'),
    field.text('primaryLabel', 'CTA principal — libellé'),
    field.text('primaryHref', 'CTA principal — lien'),
    field.text('secondaryLabel', 'CTA secondaire — libellé'),
    field.text('secondaryHref', 'CTA secondaire — lien'),
    field.media('mediaId', 'Image de fond'),
  ],
  defaults: {
    eyebrow: 'THÉRAPIE · ACCOMPAGNEMENT · ÉCOUTE',
    titleLines: [
      { text: 'Un espace pour' },
      { text: 'déposer ce qui *pèse*.' },
    ],
    intro:
      'Un accompagnement à votre rythme, dans un cadre calme et confidentiel, pour retrouver de l’air là où tout semblait serré.',
    primaryLabel: 'Prendre rendez-vous',
    primaryHref: '#contact',
    secondaryLabel: 'Découvrir l’approche',
    secondaryHref: '#a-propos',
    mediaId: null,
  },
  Component: HeroPleinEcran,
}

/* ════════════════════════════════════════════════════════════════════
   Hero — Éditorial
   Composition magazine : un très grand titre qui traverse la page,
   puis une grille asymétrique — introduction à gauche, portrait
   décalé qui remonte sous le titre à droite.
   ════════════════════════════════════════════════════════════════════ */

export const heroEditorialSchema = z.object({
  eyebrow: z.string().default(''),
  titleLines: z.array(z.object({ text: z.string() })).default([]),
  intro: z.string().default(''),
  note: z.string().default(''),
  mediaId: z.string().uuid().nullable().default(null),
})

function HeroEditorial({
  data,
  ctx,
}: BlockProps<z.output<typeof heroEditorialSchema>>) {
  const image = ctx.resolveMedia(data.mediaId)
  const lines = data.titleLines.map((l) => l.text).filter(Boolean)

  return (
    <div className="flex min-h-[90svh] flex-col justify-center px-[var(--spacing-gutter)] pb-24 pt-40">
      <div className="mx-auto w-full max-w-[1560px]">
        {data.eyebrow && (
          <Reveal delay={0.05}>
            <Eyebrow>{data.eyebrow}</Eyebrow>
          </Reveal>
        )}

        {/* Le titre traverse : ~10 colonnes sur 12, l'image remontera
            dessous. C'est ce chevauchement qui fait la page magazine. */}
        {lines.length > 0 && (
          <SplitText
            as="h1"
            lines={lines}
            delay={0.12}
            className="mt-10 text-[length:var(--text-display)] leading-[1.02] lg:max-w-[83%]"
            emphasis
          />
        )}

        <div className="mt-16 grid grid-cols-1 gap-16 lg:mt-20 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-5">
            {data.intro && (
              <Reveal delay={0.3}>
                <p className="max-w-[34rem] text-[length:var(--text-lead)] leading-[1.7] text-ink-soft">
                  {data.intro}
                </p>
              </Reveal>
            )}

            {data.note && (
              <Reveal delay={0.4}>
                <div className="mt-12 flex items-start gap-5">
                  <span
                    aria-hidden="true"
                    className="mt-1 h-16 w-px shrink-0 bg-line-strong"
                  />
                  <p className="max-w-[24rem] text-[0.85rem] leading-[1.7] text-stone">
                    {data.note}
                  </p>
                </div>
              </Reveal>
            )}
          </div>

          {/* Portrait décalé — remonte légèrement sous le titre. */}
          <div className="lg:col-span-6 lg:col-start-7 lg:-mt-16">
            <ImageReveal
              media={image}
              instant
              priority
              sizes="(max-width: 1024px) 100vw, 44vw"
              className="aspect-3/4 w-full"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export const heroEditorialBlock: BlockDefinition<typeof heroEditorialSchema> =
  {
    label: 'Hero — Éditorial',
    description:
      'Grand titre magazine qui traverse la page, portrait décalé à droite.',
    group: 'Sections',
    schema: heroEditorialSchema,
    suggestedAnchor: 'accueil',
    navigable: true,
    bleed: true,
    fields: [
      field.text('eyebrow', 'Label supérieur'),
      field.list(
        'titleLines',
        'Titre — une entrée par ligne',
        [field.text('text', 'Ligne', { full: true })],
        {
          addLabel: 'Ajouter une ligne',
          help: 'Astérisques pour l’italique : *mot*.',
        },
      ),
      field.textarea('intro', 'Texte d’introduction'),
      field.textarea('note', 'Mention descriptive', {
        help: 'Courte précision affichée sous l’introduction, le long du filet.',
      }),
      field.media('mediaId', 'Portrait'),
    ],
    defaults: {
      eyebrow: 'CABINET DE THÉRAPIE',
      titleLines: [
        { text: 'Avancer vers un' },
        { text: 'équilibre *durable*.' },
      ],
      intro:
        'Chaque parcours commence par une écoute attentive. Nous prenons le temps de comprendre ce qui vous amène, avant de tracer ensemble un chemin qui vous ressemble.',
      note: 'Consultations au cabinet ou à distance, sur rendez-vous uniquement.',
      mediaId: null,
    },
    Component: HeroEditorial,
  }

/* ════════════════════════════════════════════════════════════════════
   Hero — Minimal
   Typographie seule, centrée dans une immense respiration. Aucun
   décor : le vide et le serif portent tout.
   ════════════════════════════════════════════════════════════════════ */

export const heroMinimalSchema = z.object({
  eyebrow: z.string().default(''),
  titleLines: z.array(z.object({ text: z.string() })).default([]),
  intro: z.string().default(''),
  linkLabel: z.string().default(''),
  linkHref: z.string().default('#contact'),
})

function HeroMinimal({ data }: BlockProps<z.output<typeof heroMinimalSchema>>) {
  const lines = data.titleLines.map((l) => l.text).filter(Boolean)

  return (
    <div className="flex min-h-[85svh] flex-col items-center justify-center px-[var(--spacing-gutter)] py-32 text-center">
      {data.eyebrow && (
        <Reveal delay={0.05}>
          <Eyebrow className="justify-center">{data.eyebrow}</Eyebrow>
        </Reveal>
      )}

      {lines.length > 0 && (
        <SplitText
          as="h1"
          lines={lines}
          delay={0.12}
          className="mt-12 max-w-[60rem] text-[length:var(--text-display)] leading-[1.04]"
          emphasis
        />
      )}

      {data.intro && (
        <Reveal delay={0.35}>
          <p className="mx-auto mt-10 max-w-[36rem] text-[length:var(--text-lead)] leading-[1.7] text-ink-soft">
            {data.intro}
          </p>
        </Reveal>
      )}

      {data.linkLabel && (
        <Reveal delay={0.45}>
          <div className="mt-12">
            <ActionLink href={data.linkHref} variant="ghost">
              {data.linkLabel}
            </ActionLink>
          </div>
        </Reveal>
      )}

      {/* Filet vertical de 6rem — rappel du trait du logo. */}
      <Reveal delay={0.5}>
        <span aria-hidden="true" className="mt-20 block h-24 w-px bg-line" />
      </Reveal>
    </div>
  )
}

export const heroMinimalBlock: BlockDefinition<typeof heroMinimalSchema> = {
  label: 'Hero — Minimal',
  description: 'Typographie seule, centrée, immense respiration.',
  group: 'Sections',
  schema: heroMinimalSchema,
  suggestedAnchor: 'accueil',
  navigable: true,
  bleed: true,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.list(
      'titleLines',
      'Titre — une entrée par ligne',
      [field.text('text', 'Ligne', { full: true })],
      {
        addLabel: 'Ajouter une ligne',
        help: 'Astérisques pour l’italique : *mot*.',
      },
    ),
    field.textarea('intro', 'Ligne d’introduction'),
    field.text('linkLabel', 'Lien — libellé'),
    field.text('linkHref', 'Lien — destination'),
  ],
  defaults: {
    eyebrow: 'THÉRAPIE · ÉCOUTE',
    titleLines: [
      { text: 'Ce qui se dépose' },
      { text: 'peut enfin *s’apaiser*.' },
    ],
    intro:
      'Un espace de parole confidentiel, pour traverser ce qui pèse et retrouver un souffle.',
    linkLabel: 'Prendre rendez-vous',
    linkHref: '#contact',
  },
  Component: HeroMinimal,
}
