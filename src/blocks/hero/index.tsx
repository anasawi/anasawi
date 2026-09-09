import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { ActionLink } from '@/components/site/ActionLink'
import { Eyebrow } from '@/components/site/Eyebrow'
import { ImageReveal } from '@/components/motion/ImageReveal'
import { Reveal } from '@/components/motion/Reveal'
import { SplitText } from '@/components/motion/SplitText'

export const heroSchema = z.object({
  eyebrow: z.string().default(''),
  titleLines: z.array(z.object({ text: z.string() })).default([]),
  intro: z.string().default(''),
  primaryLabel: z.string().default(''),
  primaryHref: z.string().default('#contact'),
  secondaryLabel: z.string().default(''),
  secondaryHref: z.string().default('#a-propos'),
  mediaId: z.string().uuid().nullable().default(null),
})

export type HeroPayload = z.output<typeof heroSchema>

function Hero({ data, ctx }: BlockProps<HeroPayload>) {
  const image = ctx.resolveMedia(data.mediaId)
  const lines = data.titleLines.map((l) => l.text).filter(Boolean)

  return (
    <div className="relative grid min-h-[92svh] grid-cols-1 items-stretch lg:min-h-[100svh] lg:grid-cols-[minmax(0,1fr)_minmax(0,40%)]">
      {/* ── Colonne éditoriale ─────────────────────────────────── */}
      <div className="order-2 flex flex-col justify-center px-[var(--spacing-gutter)] pb-24 pt-16 lg:order-1 lg:pb-36 lg:pt-44">
        {/*
          Largeur en rem, surtout pas en `ch` : l'unité `ch` se calcule sur la
          police de l'élément qui la porte — ici 16px — et écraserait le titre
          en 90px dans une colonne de 300px.
        */}
        <div className="max-w-[46rem]">
          {data.eyebrow && (
            <Reveal delay={0.05}>
              <Eyebrow>{data.eyebrow}</Eyebrow>
            </Reveal>
          )}

          {/* H1 unique du site — jamais rendu vide. */}
          {lines.length > 0 && (
            <SplitText
              as="h1"
              lines={lines}
              delay={0.12}
              className="mt-10 text-[length:var(--text-display)] leading-[1.04]"
              /* Au-delà de lg, la colonne est assez large pour garantir une
                 ligne saisie = une ligne affichée. En dessous, on laisse le
                 texte se replier plutôt que déborder. */
              lineClassName="lg:whitespace-nowrap"
              emphasis
            />
          )}

          {data.intro && (
            <Reveal delay={0.4}>
              <p className="mt-10 max-w-[34rem] text-[length:var(--text-lead)] leading-[1.7] text-ink-soft">
                {data.intro}
              </p>
            </Reveal>
          )}

          {(data.primaryLabel || data.secondaryLabel) && (
            <Reveal delay={0.5}>
              <div className="mt-14 flex flex-wrap items-center gap-4">
                {data.primaryLabel && (
                  <ActionLink href={data.primaryHref} variant="primary">
                    {data.primaryLabel}
                  </ActionLink>
                )}
                {data.secondaryLabel && (
                  <ActionLink
                    href={data.secondaryHref}
                    variant="outline"
                    withArrow={false}
                  >
                    {data.secondaryLabel}
                  </ActionLink>
                )}
              </div>
            </Reveal>
          )}
        </div>

        {/* Filet vertical descendant — rappel du trait du logo. */}
        <div
          aria-hidden="true"
          className="mt-20 hidden h-24 w-px bg-line lg:block"
        />
      </div>

      {/* ── Image immersive ────────────────────────────────────────
          `instant` : peinte sans animation d'entrée. C'est le LCP. */}
      <div className="order-1 lg:order-2">
        <ImageReveal
          media={image}
          instant
          priority
          sizes="(max-width: 1024px) 100vw, 46vw"
          className="h-[52svh] w-full lg:h-full"
        />
      </div>
    </div>
  )
}

export const heroBlock: BlockDefinition<typeof heroSchema> = {
  label: 'Hero — Split',
  description: 'Ouverture de page : titre, introduction, image et CTA.',
  group: 'Sections',
  schema: heroSchema,
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
        help: 'Entourez un mot d’astérisques pour le mettre en italique : *intérieur*.',
      },
    ),
    field.textarea('intro', 'Texte d’introduction'),
    field.text('primaryLabel', 'CTA principal — libellé'),
    field.text('primaryHref', 'CTA principal — lien'),
    field.text('secondaryLabel', 'CTA secondaire — libellé'),
    field.text('secondaryHref', 'CTA secondaire — lien'),
    field.media('mediaId', 'Image du hero'),
  ],
  defaults: {
    eyebrow: 'THÉRAPIE · ACCOMPAGNEMENT · ÉCOUTE',
    titleLines: [
      { text: 'Retrouver un' },
      { text: 'espace *intérieur*' },
      { text: 'où respirer.' },
    ],
    intro: '',
    primaryLabel: 'Prendre rendez-vous',
    primaryHref: '#contact',
    secondaryLabel: 'En savoir plus',
    secondaryHref: '#a-propos',
    mediaId: null,
  },
  Component: Hero,
}
