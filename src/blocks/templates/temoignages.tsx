import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { Reveal } from '@/components/motion/Reveal'

/* ════════════════════════════════════════════════════════════════════
   Témoignage — Simple
   Une seule parole, centrée et sobre : filet court, serif italique,
   nom en dessous. Rien qui cherche à convaincre — juste une voix.
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
        <span
          aria-hidden="true"
          className="mx-auto mb-10 block h-px w-12 bg-line-strong"
        />

        <blockquote>
          <Reveal delay={0.08}>
            <p className="font-serif text-[1.3rem] italic leading-[1.6] text-ink">
              {data.quote}
            </p>
          </Reveal>
        </blockquote>

        {(data.name || data.role) && (
          <Reveal delay={0.2}>
            <figcaption className="mt-8">
              {data.name && (
                <span className="block text-[0.9rem] text-ink">
                  {data.name}
                </span>
              )}
              {data.role && (
                <span className="mt-1 block text-[0.78rem] uppercase tracking-[0.14em] text-stone">
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
   Témoignage — Grande citation
   Un guillemet décoratif géant, une citation en très grande serif,
   un auteur en eyebrow. La typographie est le seul décor.
   ════════════════════════════════════════════════════════════════════ */

export const temoignageGrandSchema = z.object({
  quote: z.string().default(''),
  author: z.string().default(''),
})

function TemoignageGrand({
  data,
}: BlockProps<z.output<typeof temoignageGrandSchema>>) {
  if (!data.quote) return null

  return (
    <div className="container-editorial">
      <figure className="mx-auto max-w-[54rem] text-center">
        <span
          aria-hidden="true"
          className="block font-serif text-[7rem] leading-none text-ink/10"
        >
          «
        </span>

        <blockquote className="-mt-10">
          <Reveal delay={0.1}>
            <p className="font-serif text-[clamp(1.8rem,3.2vw,2.6rem)] leading-[1.35] text-ink">
              <Emphasis text={data.quote} />
            </p>
          </Reveal>
        </blockquote>

        {data.author && (
          <Reveal delay={0.25}>
            <figcaption className="label-eyebrow mt-10">
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
  label: 'Témoignage — Grande citation',
  description: 'Guillemet géant, citation en très grande serif.',
  group: 'Sections',
  schema: temoignageGrandSchema,
  suggestedAnchor: 'temoignages',
  fields: [
    field.textarea('quote', 'Citation', {
      help: 'Astérisques pour l’italique : *mot*.',
    }),
    field.text('author', 'Auteur'),
  ],
  defaults: {
    quote:
      'Pour la première fois, quelqu’un m’écoutait *vraiment* — sans chercher à me réparer.',
    author: 'THOMAS · ACCOMPAGNÉ DEPUIS 2023',
  },
  Component: TemoignageGrand,
}

/* ════════════════════════════════════════════════════════════════════
   Témoignages — Multiples
   Trois voix côte à côte, séparées par de fins filets verticaux,
   révélées en léger décalé.
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
}: BlockProps<z.output<typeof temoignagesMultiplesSchema>>) {
  return (
    <div className="container-editorial">
      {(data.eyebrow || data.title) && (
        <div className="max-w-[46rem]">
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
      )}

      {data.items.length > 0 && (
        <div className="mt-20 grid grid-cols-1 gap-y-14 lg:grid-cols-3 lg:gap-y-0">
          {data.items.map((item, i) => (
            <Reveal key={i} delay={Math.min(0.05 + i * 0.08, 0.45)}>
              <figure className="h-full border-l border-line pl-8 lg:pr-8">
                <blockquote>
                  <p className="font-serif text-[1.1rem] italic leading-[1.65] text-ink">
                    {item.quote}
                  </p>
                </blockquote>
                {(item.name || item.role) && (
                  <figcaption className="mt-7">
                    {item.name && (
                      <span className="block text-[0.9rem] text-ink">
                        {item.name}
                      </span>
                    )}
                    {item.role && (
                      <span className="mt-1 block text-[0.75rem] uppercase tracking-[0.14em] text-stone">
                        {item.role}
                      </span>
                    )}
                  </figcaption>
                )}
              </figure>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  )
}

export const temoignagesMultiplesBlock: BlockDefinition<
  typeof temoignagesMultiplesSchema
> = {
  label: 'Témoignages — Multiples',
  description: 'Trois voix côte à côte, séparées de filets fins.',
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
    eyebrow: 'TÉMOIGNAGES',
    title: 'Ce qu’ils en *retiennent*.',
    items: [
      {
        quote:
          'Un espace où j’ai pu déposer ce que je n’avais jamais dit à personne.',
        name: 'Claire',
        role: 'Accompagnée un an',
      },
      {
        quote:
          'J’ai retrouvé un sommeil que je croyais perdu, et surtout une forme de paix.',
        name: 'Malik',
        role: 'Accompagné huit mois',
      },
      {
        quote:
          'On avance à son rythme, sans jamais se sentir jugé. C’est ce qui change tout.',
        name: 'Élise',
        role: 'Accompagnée six mois',
      },
    ],
  },
  Component: TemoignagesMultiples,
}
