import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { ActionLink } from '@/components/site/ActionLink'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { ImageReveal } from '@/components/motion/ImageReveal'
import { Prose } from '@/components/site/Prose'
import { Reveal } from '@/components/motion/Reveal'

/*
 * Les trois blocs de ce fichier sont connectés à `ctx.services` : la liste
 * vient de la table `services` (déjà filtrée sur les actifs par la requête
 * `getActiveServices`). Le payload ne porte que la présentation.
 */

/* ════════════════════════════════════════════════════════════════════
   Accompagnements — Liste éditoriale
   Une rangée par accompagnement : index serif italique, grand titre
   qui glisse au survol, extrait, durée et flèche fine. Que des filets.
   ════════════════════════════════════════════════════════════════════ */

export const servicesListeSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  intro: z.string().default(''),
})

function ServicesListe({
  data,
  ctx,
}: BlockProps<z.output<typeof servicesListeSchema>>) {
  const items = ctx.services

  return (
    <div className="container-editorial">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
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

        {data.intro && (
          <div className="lg:col-span-5 lg:col-start-8 lg:pt-4">
            <Reveal delay={0.12}>
              <Prose text={data.intro} size="lead" />
            </Reveal>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-20 border-t border-line-strong">
          {items.map((service, i) => {
            const number = String(i + 1).padStart(2, '0')

            return (
              <Reveal key={service.id} delay={Math.min(i * 0.06, 0.3)}>
                <article className="group grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-4 border-b border-line py-12 lg:grid-cols-12 lg:gap-x-10">
                  <span className="font-serif text-[1rem] italic text-blue-deep lg:col-span-1">
                    {number}
                  </span>

                  <div className="lg:col-span-5">
                    <h3 className="font-serif text-[clamp(1.5rem,2.4vw,2.2rem)] leading-[1.12] transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:translate-x-2">
                      {service.title}
                    </h3>
                  </div>

                  <div className="col-span-2 lg:col-span-4 lg:col-start-7">
                    <p className="max-w-[48ch] text-[0.94rem] leading-[1.75] text-ink-soft">
                      {service.excerpt}
                    </p>
                  </div>

                  <div className="col-span-2 flex items-baseline justify-between gap-6 lg:col-span-2 lg:col-start-11 lg:justify-end">
                    {service.duration && (
                      <span className="text-[0.78rem] uppercase tracking-[0.14em] text-stone">
                        {service.duration}
                      </span>
                    )}
                    <span
                      aria-hidden="true"
                      className="text-ink-soft transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </div>
                </article>
              </Reveal>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const servicesListeBlock: BlockDefinition<typeof servicesListeSchema> =
  {
    label: 'Accompagnements — Liste éditoriale',
    description:
      'Une rangée par accompagnement : index, grand titre, extrait, durée.',
    group: 'Sections',
    schema: servicesListeSchema,
    suggestedAnchor: 'accompagnements',
    navigable: true,
    fields: [
      field.text('eyebrow', 'Label supérieur'),
      field.text('title', 'Titre', { full: true }),
      field.textarea('intro', 'Introduction'),
    ],
    defaults: {
      eyebrow: 'ACCOMPAGNEMENTS',
      title: 'Ce que je peux vous *proposer*.',
      intro:
        'Chaque accompagnement s’ajuste à votre situation. La première séance sert à poser le cadre, et à vérifier que vous vous y sentez à votre place.',
    },
    Component: ServicesListe,
  }

/* ════════════════════════════════════════════════════════════════════
   Accompagnements — Numérotés
   Trois colonnes séparées par des filets verticaux, chacune dominée
   par un numéro serif fantôme derrière le titre.
   ════════════════════════════════════════════════════════════════════ */

export const servicesNumerotesSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  intro: z.string().default(''),
  linkLabel: z.string().default('En savoir plus'),
})

function ServicesNumerotes({
  data,
  ctx,
}: BlockProps<z.output<typeof servicesNumerotesSchema>>) {
  const items = ctx.services

  return (
    <div className="container-editorial">
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
        {data.intro && (
          <Reveal delay={0.12}>
            <Prose text={data.intro} className="mt-7" />
          </Reveal>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-20 grid grid-cols-1 gap-y-14 lg:grid-cols-3 lg:gap-y-0">
          {items.map((service, i) => {
            const number = String(i + 1).padStart(2, '0')

            return (
              <Reveal key={service.id} delay={Math.min(0.05 + i * 0.08, 0.4)}>
                <article
                  className={`h-full ${
                    i > 0
                      ? 'border-t border-line pt-12 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0'
                      : ''
                  }`}
                >
                  {/* Numéro fantôme — presque un motif, pas une donnée. */}
                  <span
                    aria-hidden="true"
                    className="block font-serif text-[5rem] leading-none text-ink/10"
                  >
                    {number}
                  </span>

                  <h3 className="relative -mt-7 text-[length:var(--text-h3)]">
                    {service.title}
                  </h3>

                  <p className="mt-4 max-w-[42ch] text-[0.94rem] leading-[1.75] text-ink-soft">
                    {service.excerpt}
                  </p>

                  {data.linkLabel && (
                    <ActionLink
                      href="#contact"
                      variant="ghost"
                      className="mt-7 px-0"
                    >
                      {data.linkLabel}
                    </ActionLink>
                  )}
                </article>
              </Reveal>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const servicesNumerotesBlock: BlockDefinition<
  typeof servicesNumerotesSchema
> = {
  label: 'Accompagnements — Numérotés',
  description: 'Trois colonnes à numéros fantômes, séparées de filets.',
  group: 'Sections',
  schema: servicesNumerotesSchema,
  suggestedAnchor: 'accompagnements',
  navigable: true,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.textarea('intro', 'Introduction'),
    field.text('linkLabel', 'Libellé du lien'),
  ],
  defaults: {
    eyebrow: 'ACCOMPAGNEMENTS',
    title: 'Trois manières de *cheminer*.',
    intro: '',
    linkLabel: 'En savoir plus',
  },
  Component: ServicesNumerotes,
}

/* ════════════════════════════════════════════════════════════════════
   Accompagnements — Immersifs
   Une rangée pleine largeur par accompagnement : grande image d'un
   côté, texte en face, côtés alternés. Beaucoup d'air entre les
   rangées — la page respire comme un portfolio.
   ════════════════════════════════════════════════════════════════════ */

export const servicesImmersifsSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  linkLabel: z.string().default('Échanger à ce sujet'),
})

function ServicesImmersifs({
  data,
  ctx,
}: BlockProps<z.output<typeof servicesImmersifsSchema>>) {
  const items = ctx.services

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

      {items.length > 0 && (
        <div className="mt-24 space-y-24 lg:space-y-32">
          {items.map((service, i) => {
            const even = i % 2 === 0
            const number = String(i + 1).padStart(2, '0')

            return (
              <article
                key={service.id}
                className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-x-12"
              >
                <div
                  className={
                    even
                      ? 'lg:col-span-7'
                      : 'lg:order-2 lg:col-span-7 lg:col-start-6'
                  }
                >
                  <ImageReveal
                    media={service.media}
                    sizes="(max-width: 1024px) 100vw, 55vw"
                    className="aspect-16/10 w-full"
                  />
                </div>

                <div
                  className={
                    even
                      ? 'lg:col-span-4 lg:col-start-9'
                      : 'lg:order-1 lg:col-span-4'
                  }
                >
                  <Reveal delay={0.1}>
                    <span className="font-serif text-[0.95rem] italic text-blue-deep">
                      {number}
                    </span>
                    <h3 className="mt-4 text-[length:var(--text-h3)]">
                      {service.title}
                    </h3>
                    <p className="mt-4 max-w-[44ch] text-[0.94rem] leading-[1.78] text-ink-soft">
                      {service.excerpt}
                    </p>
                    {service.duration && (
                      <p className="mt-5 text-[0.78rem] uppercase tracking-[0.14em] text-stone">
                        {service.duration}
                      </p>
                    )}
                    {data.linkLabel && (
                      <ActionLink
                        href="#contact"
                        variant="ghost"
                        className="mt-7 px-0"
                      >
                        {data.linkLabel}
                      </ActionLink>
                    )}
                  </Reveal>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const servicesImmersifsBlock: BlockDefinition<
  typeof servicesImmersifsSchema
> = {
  label: 'Accompagnements — Immersifs',
  description:
    'Grandes images alternées gauche/droite, un accompagnement par rangée.',
  group: 'Sections',
  schema: servicesImmersifsSchema,
  suggestedAnchor: 'accompagnements',
  navigable: true,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.text('linkLabel', 'Libellé du lien'),
  ],
  defaults: {
    eyebrow: 'ACCOMPAGNEMENTS',
    title: 'Un cadre pour chaque *besoin*.',
    linkLabel: 'Échanger à ce sujet',
  },
  Component: ServicesImmersifs,
}
