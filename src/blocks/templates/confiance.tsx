import Image from 'next/image'
import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { Counter, Reveal } from '@/components/site/anim'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { Aster, SectionIndex } from '@/components/site/ornaments'

/*
 * Inspirer confiance — chiffres, engagements, reconnaissances.
 */

/* ════════════════════════════════════════════════════════════════════
   Chiffres — La rangée
   Une rangée de chiffres serif italiques qui se comptent à l'entrée
   dans l'écran, séparés de fins filets verticaux.
   ════════════════════════════════════════════════════════════════════ */

export const chiffresClefsSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  items: z
    .array(
      z.object({
        value: z.number().default(0),
        suffix: z.string().default(''),
        label: z.string().default(''),
      }),
    )
    .default([]),
})

function ChiffresClefs({
  data,
  ctx,
}: BlockProps<z.output<typeof chiffresClefsSchema>>) {
  return (
    <div className="container-editorial relative text-center">
      <SectionIndex index={ctx.index} label="en chiffres" className="-top-14" />

      {data.eyebrow && (
        <Reveal>
          <Eyebrow className="justify-center">{data.eyebrow}</Eyebrow>
        </Reveal>
      )}
      {data.title && (
        <Reveal delay={0.08}>
          <h2 className="mx-auto mt-7 max-w-[26ch] text-[length:var(--text-h2)]">
            <Emphasis text={data.title} />
          </h2>
        </Reveal>
      )}

      {data.items.length > 0 && (
        <div className="mx-auto mt-14 flex max-w-[64rem] flex-col items-stretch justify-center gap-y-10 sm:flex-row">
          {data.items.map((item, i) => (
            <Reveal
              key={i}
              delay={Math.min(0.1 + i * 0.08, 0.4)}
              className={`flex-1 px-6 ${
                i > 0
                  ? 'border-t border-line pt-10 sm:border-l sm:border-t-0 sm:pt-0'
                  : ''
              }`}
            >
              <p className="font-serif text-[clamp(2.6rem,4.5vw,4.25rem)] font-light italic leading-none text-blue-deep">
                <Counter value={item.value} />
                {item.suffix}
              </p>
              {item.label && (
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
                  {item.label}
                </p>
              )}
            </Reveal>
          ))}
        </div>
      )}
    </div>
  )
}

export const chiffresClefsBlock: BlockDefinition<typeof chiffresClefsSchema> = {
  label: 'Chiffres — La rangée',
  description:
    'Des chiffres serif italiques qui se comptent, séparés de filets fins.',
  group: 'Sections',
  schema: chiffresClefsSchema,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.list(
      'items',
      'Chiffres',
      [
        field.number('value', 'Nombre'),
        field.text('suffix', 'Après le nombre', { placeholder: '+, h, %…' }),
        field.text('label', 'Légende'),
      ],
      { addLabel: 'Ajouter un chiffre' },
    ),
  ],
  defaults: {
    eyebrow: 'En quelques chiffres',
    title: '',
    items: [
      { value: 15, suffix: '', label: 'ans de pratique' },
      { value: 400, suffix: '+', label: 'personnes accompagnées' },
      { value: 48, suffix: ' h', label: 'de délai de réponse' },
    ],
  },
  Component: ChiffresClefs,
}

/* ════════════════════════════════════════════════════════════════════
   Engagements — La liste
   Les promesses du cadre, une par rangée, chacune ouverte par
   l'astérisque signature. Solennel et simple.
   ════════════════════════════════════════════════════════════════════ */

export const engagementsSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  items: z
    .array(z.object({ title: z.string(), text: z.string() }))
    .default([]),
})

function Engagements({
  data,
  ctx,
}: BlockProps<z.output<typeof engagementsSchema>>) {
  return (
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="engagements" className="-top-14" />

      <div className="mx-auto max-w-[44rem]">
        <div className="text-center">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow className="justify-center">{data.eyebrow}</Eyebrow>
            </Reveal>
          )}
          {data.title && (
            <Reveal delay={0.08}>
              <h2 className="mt-7 text-[length:var(--text-h2)]">
                <Emphasis text={data.title} />
              </h2>
            </Reveal>
          )}
        </div>

        {data.items.length > 0 && (
          <ul className="mt-14 border-t border-line-strong">
            {data.items.map((item, i) => (
              <Reveal key={i} delay={Math.min(0.08 + i * 0.06, 0.35)}>
                <li className="flex items-start gap-6 border-b border-line py-8">
                  <Aster className="mt-1 shrink-0 text-[18px] text-blue-deep" />
                  <div>
                    {item.title && (
                      <h3 className="font-serif text-[clamp(1.15rem,1.7vw,1.45rem)] font-light text-ink">
                        {item.title}
                      </h3>
                    )}
                    {item.text && (
                      <p className="mt-2 max-w-[56ch] text-[0.92rem] leading-[1.8] text-ink-soft">
                        {item.text}
                      </p>
                    )}
                  </div>
                </li>
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export const engagementsBlock: BlockDefinition<typeof engagementsSchema> = {
  label: 'Engagements — La liste',
  description:
    'Les promesses du cadre, une par rangée, ouvertes par l’astérisque ✳.',
  group: 'Sections',
  schema: engagementsSchema,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.list(
      'items',
      'Engagements',
      [field.text('title', 'Intitulé'), field.textarea('text', 'Description')],
      { addLabel: 'Ajouter un engagement' },
    ),
  ],
  defaults: {
    eyebrow: 'Mes engagements',
    title: 'Ce que je vous *garantis*.',
    items: [
      {
        title: 'La confidentialité, sans exception',
        text: 'Ce qui se dit en séance reste en séance. C’est le socle de tout travail thérapeutique.',
      },
      {
        title: 'Une réponse sous 48 heures',
        text: 'Écrire est souvent un pas difficile — vous ne resterez jamais longtemps sans réponse.',
      },
      {
        title: 'Un cadre révisable',
        text: 'Rythme, format, objectifs : tout se décide ensemble, et se réajuste dès que nécessaire.',
      },
    ],
  },
  Component: Engagements,
}

/* ════════════════════════════════════════════════════════════════════
   Reconnaissances — Les logos
   Une rangée discrète de logos (presse, formations, fédérations),
   adoucis pour ne pas crier.
   ════════════════════════════════════════════════════════════════════ */

export const logosPresseSchema = z.object({
  eyebrow: z.string().default(''),
  mediaIds: z.array(z.string().uuid()).default([]),
})

function LogosPresse({
  data,
  ctx,
}: BlockProps<z.output<typeof logosPresseSchema>>) {
  const logos = data.mediaIds
    .map((id) => ctx.resolveMedia(id))
    .filter((m): m is NonNullable<typeof m> => m !== null)

  if (logos.length === 0 && !data.eyebrow) return null

  return (
    <div className="container-editorial text-center">
      {data.eyebrow && (
        <Reveal>
          <Eyebrow className="justify-center" tone="muted">
            {data.eyebrow}
          </Eyebrow>
        </Reveal>
      )}

      {logos.length > 0 && (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-14 gap-y-8">
          {logos.map((logo, i) => (
            <Reveal key={`${logo.id}-${i}`} delay={Math.min(i * 0.06, 0.3)}>
              <Image
                src={logo.url}
                alt={logo.alt}
                width={logo.width || 160}
                height={logo.height || 60}
                className="h-9 w-auto opacity-55 grayscale transition-opacity duration-500 hover:opacity-90 sm:h-11"
              />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  )
}

export const logosPresseBlock: BlockDefinition<typeof logosPresseSchema> = {
  label: 'Reconnaissances — Logos',
  description:
    'Une rangée discrète de logos : formations, fédérations, presse.',
  group: 'Sections',
  schema: logosPresseSchema,
  fields: [
    field.text('eyebrow', 'Label supérieur', {
      placeholder: 'Formations & affiliations',
    }),
    field.mediaList('mediaIds', 'Logos'),
  ],
  defaults: { eyebrow: 'Formations & affiliations', mediaIds: [] },
  Component: LogosPresse,
}
