import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { MaskLines, Reveal } from '@/components/site/anim'
import { ActionLink } from '@/components/site/ActionLink'
import { BlockImage } from '@/components/site/BlockImage'
import { Emphasis } from '@/components/site/Emphasis'
import { Aster } from '@/components/site/ornaments'

/*
 * Les invitations à l'action — toujours sobres : le fond fonce, la
 * flèche glisse, rien d'autre.
 */

/* ════════════════════════════════════════════════════════════════════
   Appel à l'action — Avec image
   Carte en deux moitiés aux coins doux : photographie d'un côté,
   panneau bleu brume de l'autre. Les couleurs du panneau sont posées
   en dur — indépendantes du thème de section.
   ════════════════════════════════════════════════════════════════════ */

export const ctaImageSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  text: z.string().default(''),
  label: z.string().default(''),
  href: z.string().default('#contact'),
  mediaId: z.string().uuid().nullable().default(null),
})

function CtaImage({ data, ctx }: BlockProps<z.output<typeof ctaImageSchema>>) {
  const image = ctx.resolveMedia(data.mediaId)

  return (
    <div className="container-editorial">
      <div className="grid grid-cols-1 overflow-hidden rounded-[28px] lg:grid-cols-2">
        <BlockImage
          media={image}
          tone="cream"
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="aspect-[4/3] w-full lg:aspect-auto lg:h-full"
        />

        <div className="flex flex-col justify-center bg-blue-mist px-8 py-16 md:px-14 md:py-20">
          {data.eyebrow && (
            <Reveal delay={0.1}>
              <p className="flex items-baseline gap-2.5 font-sans text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-ink/80">
                <Aster className="text-[1.25em] font-normal" />
                <span>{data.eyebrow}</span>
              </p>
            </Reveal>
          )}

          {data.title && (
            <h2 className="mt-6 max-w-[18ch] font-serif text-[clamp(1.7rem,2.8vw,2.6rem)] font-light leading-[1.15] text-blue-ink">
              <MaskLines delay={0.16}>
                <span>
                  <Emphasis text={data.title} />
                </span>
              </MaskLines>
            </h2>
          )}

          {data.text && (
            <Reveal delay={0.22}>
              <p className="mt-6 max-w-[44ch] text-[0.95rem] leading-[1.8] text-blue-ink/80">
                {data.text}
              </p>
            </Reveal>
          )}

          {data.label && (
            <Reveal delay={0.3}>
              <div className="mt-10">
                <ActionLink href={data.href} variant="primary">
                  {data.label}
                </ActionLink>
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </div>
  )
}

export const ctaImageBlock: BlockDefinition<typeof ctaImageSchema> = {
  label: 'Appel à l’action — Avec image',
  description: 'Carte en deux moitiés : image et panneau bleu brume.',
  group: 'Sections',
  schema: ctaImageSchema,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.textarea('text', 'Texte'),
    field.text('label', 'Bouton — libellé'),
    field.text('href', 'Bouton — lien'),
    field.media('mediaId', 'Image'),
  ],
  defaults: {
    eyebrow: 'Premier pas',
    title: 'Et si on en *parlait* ?',
    text: 'Le premier échange est sans engagement : il sert simplement à faire connaissance et à voir si le cadre vous convient.',
    label: 'Prendre rendez-vous',
    href: '#contact',
    mediaId: null,
  },
  Component: CtaImage,
}

/* ════════════════════════════════════════════════════════════════════
   Appel à l'action — L'arche immersive
   Une grande arche pleine d'image sous un voile nuit, une seule
   phrase serif ivoire au centre, un bouton clair.
   ════════════════════════════════════════════════════════════════════ */

export const ctaImmersifSchema = z.object({
  lines: z.array(z.object({ text: z.string() })).default([]),
  label: z.string().default(''),
  href: z.string().default('#contact'),
  mediaId: z.string().uuid().nullable().default(null),
})

function CtaImmersif({
  data,
  ctx,
}: BlockProps<z.output<typeof ctaImmersifSchema>>) {
  const image = ctx.resolveMedia(data.mediaId)
  const lines = data.lines.map((l) => l.text).filter(Boolean)

  return (
    <div className="container-editorial">
      <div className="relative flex min-h-[58svh] items-center justify-center overflow-hidden rounded-t-[min(240px,26vw)] rounded-b-[28px] px-8 py-24 md:rounded-t-[min(240px,19vw)]">
        <BlockImage
          media={image}
          instant
          sizes="92vw"
          className="absolute inset-0 h-full w-full"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-night/55"
        />

        <div className="relative z-10 mx-auto max-w-[46rem] text-center">
          <Reveal>
            <Aster className="text-[22px] text-blue" />
          </Reveal>

          {lines.length > 0 && (
            <h2 className="mt-6 font-serif text-[clamp(1.9rem,3.8vw,3.6rem)] font-light leading-[1.15] text-ivory">
              <MaskLines delay={0.12}>
                {lines.map((line, i) => (
                  <span key={i}>
                    <Emphasis text={line} />
                  </span>
                ))}
              </MaskLines>
            </h2>
          )}

          {data.label && (
            <Reveal delay={0.3}>
              <div className="mt-10 flex justify-center">
                <ActionLink
                  href={data.href}
                  variant="primary"
                  className="bg-ivory text-night hover:bg-cream"
                >
                  {data.label}
                </ActionLink>
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </div>
  )
}

export const ctaImmersifBlock: BlockDefinition<typeof ctaImmersifSchema> = {
  label: 'Appel à l’action — L’arche immersive',
  description:
    'Une grande arche pleine d’image sous un voile nuit, phrase serif au centre.',
  group: 'Sections',
  schema: ctaImmersifSchema,
  fields: [
    field.list(
      'lines',
      'Titre — une entrée par ligne',
      [field.text('text', 'Ligne', { full: true })],
      {
        addLabel: 'Ajouter une ligne',
        help: 'Astérisques pour l’italique : *mot*.',
      },
    ),
    field.text('label', 'Bouton — libellé'),
    field.text('href', 'Bouton — lien'),
    field.media('mediaId', 'Image de fond'),
  ],
  defaults: {
    lines: [
      { text: 'Le premier pas est souvent' },
      { text: 'le plus *doux*.' },
    ],
    label: 'Prendre rendez-vous',
    href: '#contact',
    mediaId: null,
  },
  Component: CtaImmersif,
}
