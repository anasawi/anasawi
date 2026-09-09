import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { ActionLink } from '@/components/site/ActionLink'
import { Emphasis } from '@/components/site/Emphasis'
import { ImageReveal } from '@/components/motion/ImageReveal'
import { Reveal } from '@/components/motion/Reveal'
import { SplitText } from '@/components/motion/SplitText'

/* ════════════════════════════════════════════════════════════════════
   Appel à l'action — Avec image
   Carte en deux moitiés : photographie à gauche, panneau bleu brume
   à droite. Le panneau porte son propre fond, donc ses couleurs de
   texte sont posées en dur (bleu encre) — indépendantes du thème.
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
      <div className="grid grid-cols-1 overflow-hidden rounded-[4px] lg:grid-cols-2">
        <ImageReveal
          media={image}
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="aspect-4/3 w-full lg:aspect-auto lg:h-full"
        />

        <div className="flex flex-col justify-center bg-blue-mist px-8 py-16 md:px-14 md:py-20">
          {data.eyebrow && (
            <Reveal delay={0.1}>
              {/* Eyebrow recomposé : le panneau a son propre fond, les
                  couleurs du thème de section ne s'y appliquent pas. */}
              <p className="flex items-center gap-4 font-sans text-[length:var(--text-label)] font-medium uppercase tracking-[0.18em] text-blue-ink/80">
                <span
                  aria-hidden="true"
                  className="h-px w-8 shrink-0 bg-blue-ink/40"
                />
                <span>{data.eyebrow}</span>
              </p>
            </Reveal>
          )}

          {data.title && (
            <Reveal delay={0.16}>
              <h2 className="mt-7 max-w-[18ch] text-[clamp(1.7rem,2.8vw,2.6rem)] leading-[1.15] text-blue-ink">
                <Emphasis text={data.title} />
              </h2>
            </Reveal>
          )}

          {data.text && (
            <Reveal delay={0.22}>
              <p className="mt-6 max-w-[44ch] text-[0.95rem] leading-[1.75] text-blue-ink/80">
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
    eyebrow: 'PREMIER PAS',
    title: 'Et si on en *parlait* ?',
    text: 'Le premier échange est sans engagement : il sert simplement à faire connaissance et à voir si le cadre vous convient.',
    label: 'Prendre rendez-vous',
    href: '#contact',
    mediaId: null,
  },
  Component: CtaImage,
}

/* ════════════════════════════════════════════════════════════════════
   Appel à l'action — Immersif
   Une image pleine largeur sous un voile sombre, une seule grande
   ligne serif blanche au centre, un bouton. Le texte clair est posé
   sur l'image — indépendant du thème de section.
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
    <div className="relative flex min-h-[60svh] items-center justify-center px-[var(--spacing-gutter)] py-28">
      <ImageReveal
        media={image}
        sizes="100vw"
        className="absolute inset-0 h-full w-full"
      />

      <div aria-hidden="true" className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 mx-auto max-w-[46rem] text-center">
        {lines.length > 0 && (
          <SplitText
            as="h2"
            lines={lines}
            delay={0.1}
            className="text-[clamp(1.9rem,3.6vw,3.2rem)] leading-[1.15] text-white"
            emphasis
          />
        )}

        {data.label && (
          <Reveal delay={0.3}>
            <div className="mt-11 flex justify-center">
              <ActionLink href={data.href} variant="primary">
                {data.label}
              </ActionLink>
            </div>
          </Reveal>
        )}
      </div>
    </div>
  )
}

export const ctaImmersifBlock: BlockDefinition<typeof ctaImmersifSchema> = {
  label: 'Appel à l’action — Immersif',
  description: 'Image pleine largeur, voile sombre, ligne serif centrée.',
  group: 'Sections',
  schema: ctaImmersifSchema,
  bleed: true,
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
