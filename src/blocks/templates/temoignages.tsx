import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { MaskLines, Reveal } from '@/components/site/anim'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { Aster, SectionIndex } from '@/components/site/ornaments'

/*
 * Inspirer confiance — les paroles de celles et ceux qui sont passés par là.
 */

/* ════════════════════════════════════════════════════════════════════
   Témoignage — Simple
   Une seule voix, centrée et sobre : filet court, serif italique,
   nom en dessous. Rien qui cherche à convaincre.
   ════════════════════════════════════════════════════════════════════ */

export const temoignageSimpleSchema = z.object({
  quote: z.string().default(''),
  name: z.string().default(''),
  role: z.string().default(''),
})

function TemoignageSimple({
  data,
}: BlockProps<z.output<typeof temoignageSimpleSchema>>) {
  if (!data.quote) return null

  return (
    <div className="container-editorial">
      <figure className="mx-auto max-w-[36rem] text-center">
        <Reveal>
          <span
            aria-hidden="true"
            className="mx-auto mb-8 block h-10 w-px bg-line-strong"
          />
        </Reveal>

        <blockquote>
          <Reveal delay={0.08}>
            <p className="font-serif text-[clamp(1.25rem,1.9vw,1.6rem)] font-light italic leading-[1.6] text-ink">
              « {data.quote} »
            </p>
          </Reveal>
        </blockquote>

        {(data.name || data.role) && (
          <Reveal delay={0.2}>
            <figcaption className="mt-8">
              {data.name && (
                <span className="block font-serif text-[1rem] font-light italic text-blue-deep">
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

export const temoignageSimpleBlock: BlockDefinition<
  typeof temoignageSimpleSchema
> = {
  label: 'Témoignage — Simple',
  description: 'Une parole centrée et sobre, nom et précision en dessous.',
  group: 'Sections',
  schema: temoignageSimpleSchema,
  suggestedAnchor: 'temoignages',
  fields: [
    field.textarea('quote', 'Témoignage'),
    field.text('name', 'Nom'),
    field.text('role', 'Précision', {
      placeholder: 'Accompagnée pendant un an',
    }),
  ],
  defaults: {
    quote:
      'J’arrivais avec un nœud que je traînais depuis des années. Séance après séance, il s’est défait — sans forcer, presque à mon insu.',
    name: 'Claire',
    role: 'Accompagnée pendant un an',
  },
  Component: TemoignageSimple,
}

/* ════════════════════════════════════════════════════════════════════
   Témoignage — La nuit (proposition I de la planche)
   Fond nuit, arche en filet qui respire, halo bleu, citation centrée
   en très grande serif. La section la plus solennelle du site.
   ════════════════════════════════════════════════════════════════════ */

export const temoignageGrandSchema = z.object({
  quote: z.string().default(''),
  author: z.string().default(''),
})

function TemoignageGrand({
  data,
  ctx,
}: BlockProps<z.output<typeof temoignageGrandSchema>>) {
  if (!data.quote) return null

  return (
    /* `bleed` : le fond nuit doit couvrir toute la section, donc le
       template porte lui-même le padding — même token que le wrapper. */
    <div className="relative overflow-clip bg-night py-[var(--spacing-section)] text-center text-ivory">
      <SectionIndex index={ctx.index} label="parole" light />

      {/* L'arche en filet qui respire. */}
      <div
        aria-hidden="true"
        className="anasawi-breathe pointer-events-none absolute left-1/2 top-1/2 aspect-[3/4] w-[min(460px,56vw)] -translate-x-1/2 -translate-y-1/2 rounded-arch border border-[rgba(251,248,242,0.16)]"
      />
      {/* Le halo bleu. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[min(560px,68vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(123,163,182,0.14),transparent_65%)]"
      />

      <figure className="container-editorial relative">
        <Reveal>
          <Aster className="text-[24px] text-blue" />
        </Reveal>

        <blockquote className="mx-auto mt-5 max-w-[62rem]">
          <MaskLines delay={0.12}>
            <p className="font-serif text-[clamp(34px,4.4vw,72px)] font-light leading-[1.28] [&_em]:text-blue">
              <Emphasis text={data.quote} />
            </p>
          </MaskLines>
        </blockquote>

        {data.author && (
          <Reveal delay={0.3}>
            <figcaption className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-ivory/55">
              {data.author}
            </figcaption>
          </Reveal>
        )}
      </figure>
    </div>
  )
}

export const temoignageGrandBlock: BlockDefinition<
  typeof temoignageGrandSchema
> = {
  label: 'Témoignage — La nuit',
  description:
    'Fond nuit, halo qui respire, une seule parole en très grande serif.',
  group: 'Sections',
  schema: temoignageGrandSchema,
  suggestedAnchor: 'temoignages',
  bleed: true,
  fields: [
    field.textarea('quote', 'Citation', {
      help: 'Astérisques pour le mot en bleu : *de l’aide*.',
    }),
    field.text('author', 'Auteur'),
  ],
  defaults: {
    quote: 'Le courage, c’est de demander *de l’aide*.',
    author: 'Une patiente, accompagnée deux ans',
  },
  Component: TemoignageGrand,
}

/* ════════════════════════════════════════════════════════════════════
   Témoignages — Trois voix (proposition J de la planche)
   Trois paroles sur un fil : les voix latérales nues, la voix
   centrale posée sur une carte bleu brume légèrement remontée.
   ════════════════════════════════════════════════════════════════════ */

export const temoignagesMultiplesSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  items: z
    .array(
      z.object({ quote: z.string(), name: z.string(), role: z.string() }),
    )
    .default([]),
})

function TemoignagesMultiples({
  data,
  ctx,
}: BlockProps<z.output<typeof temoignagesMultiplesSchema>>) {
  return (
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="ils en parlent" />

      {(data.eyebrow || data.title) && (
        <div className="mx-auto max-w-[44rem] text-center">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow className="justify-center">{data.eyebrow}</Eyebrow>
            </Reveal>
          )}
          {data.title && (
            <Reveal delay={0.08}>
              <h2 className="mt-5 text-[length:var(--text-h2)]">
                <Emphasis text={data.title} />
              </h2>
            </Reveal>
          )}
        </div>
      )}

      {data.items.length > 0 && (
        <div className="mt-10 grid grid-cols-1 items-start gap-10 md:mt-12 md:gap-12 lg:grid-cols-12 lg:gap-5">
          {data.items.map((item, i) => {
            const position = i % 3
            const central = position === 1

            if (central) {
              return (
                <Reveal key={i} delay={0.12} className="lg:col-span-4 lg:col-start-5">
                  <figure className="rounded-[28px] bg-blue-mist px-6 py-8 text-center sm:px-8 md:py-10 lg:mt-[-14px]">
                    <span
                      aria-hidden="true"
                      className="block font-serif text-[54px] font-light leading-[0.4] text-blue-deep opacity-40"
                    >
                      “
                    </span>
                    <blockquote>
                      <p className="mt-4 font-serif text-[clamp(20px,1.9vw,27px)] font-light italic leading-[1.5] text-night">
                        « {item.quote} »
                      </p>
                    </blockquote>
                    <figcaption className="mt-5">
                      <span
                        aria-hidden="true"
                        className="mx-auto mb-3 block h-[34px] w-px bg-blue-deep/35"
                      />
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-deep">
                        {[item.name, item.role].filter(Boolean).join(' — ')}
                      </span>
                    </figcaption>
                  </figure>
                </Reveal>
              )
            }

            return (
              <Reveal
                key={i}
                delay={position === 0 ? 0 : 0.24}
                className={
                  position === 0
                    ? 'lg:col-span-3 lg:col-start-2'
                    : 'lg:col-span-3 lg:col-start-9'
                }
              >
                <figure className="px-2 text-center">
                  <blockquote>
                    <p className="font-serif text-[clamp(18px,1.7vw,24px)] font-light italic leading-[1.55] text-ink">
                      « {item.quote} »
                    </p>
                  </blockquote>
                  <figcaption className="mt-5">
                    <span
                      aria-hidden="true"
                      className="mx-auto mb-3 block h-[34px] w-px bg-line-strong"
                    />
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
                      {[item.name, item.role].filter(Boolean).join(' — ')}
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const temoignagesMultiplesBlock: BlockDefinition<
  typeof temoignagesMultiplesSchema
> = {
  label: 'Témoignages — Trois voix',
  description:
    'Trois paroles sur un fil, la voix centrale sur une carte bleu brume.',
  group: 'Sections',
  schema: temoignagesMultiplesSchema,
  suggestedAnchor: 'temoignages',
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.list(
      'items',
      'Témoignages',
      [
        field.textarea('quote', 'Témoignage'),
        field.text('name', 'Nom'),
        field.text('role', 'Précision'),
      ],
      { addLabel: 'Ajouter un témoignage' },
    ),
  ],
  defaults: {
    eyebrow: 'Ils en parlent',
    title: 'Des mots qui *restent*.',
    items: [
      {
        quote: 'J’ai retrouvé un sol sous mes pieds.',
        name: 'M.',
        role: 'accompagnée deux ans',
      },
      {
        quote: 'Une écoute qui ne juge jamais, qui n’attend rien.',
        name: 'S.',
        role: '41 ans',
      },
      {
        quote: 'Mon fils a recommencé à parler.',
        name: 'Une maman',
        role: 'suivi d’un adolescent',
      },
    ],
  },
  Component: TemoignagesMultiples,
}
