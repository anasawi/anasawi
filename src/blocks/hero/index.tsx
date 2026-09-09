import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { MaskLines, Reveal } from '@/components/site/anim'
import { ActionLink } from '@/components/site/ActionLink'
import { BlockImage } from '@/components/site/BlockImage'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { SectionIndex } from '@/components/site/ornaments'

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

/**
 * Hero en deux colonnes : l'éditorial à gauche — méta ✳, titre serif en
 * lignes masquées, boutons sobres — et l'arche photographique à droite.
 */
function Hero({ data, ctx }: BlockProps<HeroPayload>) {
  const image = ctx.resolveMedia(data.mediaId)
  const lines = data.titleLines.map((l) => l.text).filter(Boolean)
  const first = ctx.index === 0

  return (
    <div className="relative grid min-h-[92svh] grid-cols-1 items-center gap-y-4 lg:min-h-[100svh] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <SectionIndex index={ctx.index} label="ouverture" />

      {/* ── Colonne éditoriale ─────────────────────────────────── */}
      <div className="order-2 flex flex-col justify-center px-[var(--spacing-gutter)] pb-24 pt-10 lg:order-1 lg:py-40">
        <div className="max-w-[46rem]">
          {data.eyebrow && (
            <Reveal delay={0.05}>
              <Eyebrow>{data.eyebrow}</Eyebrow>
            </Reveal>
          )}

          {/* H1 unique du site — jamais rendu vide. */}
          {lines.length > 0 && (
            <h1 className="mt-9 font-serif text-[clamp(2.7rem,5.4vw,5.8rem)] font-light leading-[1.05] text-ink">
              <MaskLines delay={0.15} lineClassName="lg:whitespace-nowrap">
                {lines.map((line, i) => (
                  <span key={i}>
                    <Emphasis text={line} />
                  </span>
                ))}
              </MaskLines>
            </h1>
          )}

          {data.intro && (
            <Reveal delay={0.42}>
              <p className="mt-9 max-w-[34rem] text-[length:var(--text-lead)] leading-[1.8] text-ink-soft">
                {data.intro}
              </p>
            </Reveal>
          )}

          {(data.primaryLabel || data.secondaryLabel) && (
            <Reveal delay={0.54}>
              <div className="mt-12 flex flex-wrap items-center gap-3.5">
                {data.primaryLabel && (
                  <ActionLink href={data.primaryHref} variant="primary">
                    {data.primaryLabel}
                  </ActionLink>
                )}
                {data.secondaryLabel && (
                  <ActionLink
                    href={data.secondaryHref}
                    variant="ghost"
                    withArrow={false}
                  >
                    {data.secondaryLabel}
                  </ActionLink>
                )}
              </div>
            </Reveal>
          )}
        </div>

        {/* Filet vertical descendant — le trait du logo. */}
        <div
          aria-hidden="true"
          className="mt-16 hidden h-20 w-px bg-line-strong lg:block"
        />
      </div>

      {/* ── L'arche photographique ─────────────────────────────── */}
      <div className="order-1 flex items-center justify-center px-[var(--spacing-gutter)] pt-32 lg:order-2 lg:py-24 lg:pr-[var(--spacing-gutter)]">
        <BlockImage
          media={image}
          instant={first}
          priority={first}
          sizes="(max-width: 1024px) 80vw, 40vw"
          className="aspect-[3/4.2] w-[min(320px,78vw)] rounded-arch sm:w-[min(420px,60vw)] lg:w-full lg:max-w-[30rem]"
        />
      </div>
    </div>
  )
}

export const heroBlock: BlockDefinition<typeof heroSchema> = {
  label: 'Hero — Deux colonnes',
  description: 'Titre et boutons à gauche, arche photographique à droite.',
  group: 'Sections',
  schema: heroSchema,
  suggestedAnchor: 'accueil',
  navigable: true,
  bleed: true,
  fields: [
    field.text('eyebrow', 'Label supérieur', {
      placeholder: 'Thérapie · Accompagnement · Écoute',
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
    eyebrow: 'Thérapie · Accompagnement · Écoute',
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
