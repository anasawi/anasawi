import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { MaskLines, Reveal } from '@/components/site/anim'
import { ActionLink } from '@/components/site/ActionLink'
import { BlockImage } from '@/components/site/BlockImage'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { Prose } from '@/components/site/Prose'
import { SectionIndex } from '@/components/site/ornaments'

/*
 * Présenter son offre. Les blocs connectés lisent `ctx.services` (table
 * « Accompagnements » du CMS, déjà filtrée sur les actifs) : le payload ne
 * porte que la présentation, jamais le contenu.
 */

const NUMBER_WORDS = [
  'un',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
] as const

function numberWord(i: number): string {
  return NUMBER_WORDS[i] ?? String(i + 1)
}

/* ════════════════════════════════════════════════════════════════════
   Accompagnements — Liste (proposition F de la planche)
   Une rangée par accompagnement : index en toutes lettres, grand titre
   serif qui glisse au survol pendant que la rangée s'inverse vers le
   fond nuit et que la description se révèle.
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
    <div className="relative">
      <SectionIndex index={ctx.index} label="accompagnements" />

      <div className="container-editorial text-center">
        {data.eyebrow && (
          <Reveal>
            <Eyebrow className="justify-center">{data.eyebrow}</Eyebrow>
          </Reveal>
        )}
        {data.title && (
          <h2 className="mx-auto mt-5 max-w-[26ch] text-[length:var(--text-h2)]">
            <MaskLines delay={0.08}>
              <span>
                <Emphasis text={data.title} />
              </span>
            </MaskLines>
          </h2>
        )}
        {data.intro && (
          <Reveal delay={0.14}>
            <p className="mx-auto mt-6 max-w-[52ch] text-[16px] leading-[1.85] text-ink-soft">
              {data.intro}
            </p>
          </Reveal>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-10 md:mt-12">
          {items.map((service, i) => (
            <Reveal key={service.id} delay={Math.min(i * 0.07, 0.35)}>
              {/* Mobile : empilement numéro / titre / description / flèche,
                  description toujours visible (le survol n'existe pas au
                  doigt — Tailwind v4 réserve `hover:` aux pointeurs qui
                  survolent). */}
              <article
                className={`group grid grid-cols-1 gap-y-2 border-t border-line px-[var(--spacing-gutter)] py-7 transition-[background-color,color,border-radius] duration-[450ms] ease-[var(--ease)] hover:rounded-[28px] hover:bg-night hover:text-ivory md:py-9 lg:grid-cols-12 lg:items-baseline lg:gap-x-5 ${
                  i === items.length - 1 ? 'border-b' : ''
                }`}
              >
                <span className="font-serif text-[16px] font-light italic text-blue-deep transition-colors duration-[450ms] group-hover:text-blue lg:col-span-1">
                  {numberWord(i)}
                </span>

                <h3 className="font-serif text-[clamp(28px,3.8vw,62px)] font-light leading-none transition-transform duration-[450ms] ease-[var(--ease)] group-hover:translate-x-4 group-hover:italic lg:col-span-7">
                  {service.title}
                </h3>

                <p className="mt-1 max-w-[40ch] text-[14.5px] leading-[1.75] text-stone transition-[opacity,transform,color] duration-[450ms] group-hover:text-ivory/75 lg:mt-0 lg:col-span-3 lg:translate-y-1.5 lg:text-[14px] lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
                  {service.excerpt}
                  {service.duration ? (
                    <span className="mt-2 block text-[10.5px] font-semibold uppercase tracking-[0.2em] opacity-80">
                      {service.duration}
                    </span>
                  ) : null}
                </p>

                <span
                  aria-hidden="true"
                  className="mt-1 block text-left font-serif text-[22px] opacity-35 transition-[opacity,transform,color] duration-[450ms] ease-[var(--ease)] group-hover:translate-x-[5px] group-hover:text-blue group-hover:opacity-100 lg:mt-0 lg:col-span-1 lg:text-right"
                >
                  →
                </span>
              </article>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  )
}

export const servicesListeBlock: BlockDefinition<typeof servicesListeSchema> =
  {
    label: 'Accompagnements — Liste',
    description:
      'Une rangée par accompagnement : grand titre serif, inversion vers le fond nuit au survol. Le contenu se gère dans l’écran « Accompagnements ».',
    group: 'Sections',
    schema: servicesListeSchema,
    suggestedAnchor: 'accompagnements',
    navigable: true,
    /* Section standard : le wrapper porte le padding. Seules les rangées
       débordent horizontalement (elles posent leur propre gouttière). */
    fields: [
      field.text('eyebrow', 'Label supérieur'),
      field.text('title', 'Titre', { full: true }),
      field.textarea('intro', 'Introduction'),
    ],
    defaults: {
      eyebrow: 'Accompagnements',
      title: 'Trois manières de *commencer*.',
      intro:
        'Thérapie individuelle, accompagnement des adolescents, soutien à la parentalité : chaque cadre a son rythme et sa durée. Au cabinet de Cesson-Sévigné ou en visio, le premier pas est toujours le même — un échange, sans engagement.',
    },
    Component: ServicesListe,
  }

/* ════════════════════════════════════════════════════════════════════
   Accompagnements — Numérotés
   Trois colonnes séparées de filets, ouvertes chacune par un index
   serif italique bleu en toutes lettres.
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
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="accompagnements" />

      <div className="max-w-[46rem]">
        {data.eyebrow && (
          <Reveal>
            <Eyebrow>{data.eyebrow}</Eyebrow>
          </Reveal>
        )}
        {data.title && (
          <h2 className="mt-5 text-[length:var(--text-h2)]">
            <MaskLines delay={0.08}>
              <span>
                <Emphasis text={data.title} />
              </span>
            </MaskLines>
          </h2>
        )}
        {data.intro && (
          <Reveal delay={0.14}>
            <Prose text={data.intro} className="mt-6" />
          </Reveal>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-10 grid grid-cols-1 gap-4 md:mt-12 md:gap-5 lg:grid-cols-3 lg:gap-y-0">
          {items.map((service, i) => (
            <Reveal key={service.id} delay={Math.min(0.05 + i * 0.09, 0.4)}>
              <article
                className={`h-full ${
                  i > 0
                    ? 'border-t border-line pt-7 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0'
                    : ''
                }`}
              >
                <span className="font-serif text-[1.35rem] font-light italic text-blue-deep">
                  {numberWord(i)}
                </span>

                <h3 className="mt-4 text-[length:var(--text-h3)]">
                  {service.title}
                </h3>

                <p className="mt-4 max-w-[42ch] text-[0.94rem] leading-[1.8] text-ink-soft">
                  {service.excerpt}
                </p>

                {service.duration && (
                  <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
                    {service.duration}
                  </p>
                )}

                {data.linkLabel && (
                  <ActionLink
                    href="#contact"
                    variant="ghost"
                    className="mt-8 border-0 px-0 py-0"
                    ink="bg-transparent"
                  >
                    {data.linkLabel}
                  </ActionLink>
                )}
              </article>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  )
}

export const servicesNumerotesBlock: BlockDefinition<
  typeof servicesNumerotesSchema
> = {
  label: 'Accompagnements — Numérotés',
  description:
    'Trois colonnes séparées de filets, index serif en toutes lettres.',
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
    eyebrow: 'Accompagnements',
    title: 'Trois manières de *cheminer*.',
    intro:
      'Selon ce que vous traversez — une anxiété qui s’installe, un deuil, un épuisement, une adolescence qui bouscule toute la famille — le cadre s’adapte. Les séances durent 50 minutes pour les adultes, 45 minutes pour les adolescents, et se tiennent au cabinet ou en visio.',
    linkLabel: 'En savoir plus',
  },
  Component: ServicesNumerotes,
}

/* ════════════════════════════════════════════════════════════════════
   Accompagnements — Immersifs
   Une rangée pleine largeur par accompagnement : grande arche d'un
   côté, texte en face, côtés alternés. Beaucoup d'air.
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
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="accompagnements" />

      {(data.eyebrow || data.title) && (
        <div className="mx-auto max-w-[46rem] text-center">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow className="justify-center">{data.eyebrow}</Eyebrow>
            </Reveal>
          )}
          {data.title && (
            <h2 className="mt-5 text-[length:var(--text-h2)]">
              <MaskLines delay={0.08}>
                <span>
                  <Emphasis text={data.title} />
                </span>
              </MaskLines>
            </h2>
          )}
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-10 space-y-10 md:mt-12 md:space-y-12">
          {items.map((service, i) => {
            const even = i % 2 === 0

            return (
              <article
                key={service.id}
                className="grid grid-cols-1 items-center gap-10 md:gap-12 lg:grid-cols-12 lg:gap-x-12"
              >
                <div
                  className={
                    even
                      ? 'lg:col-span-5 lg:col-start-2'
                      : 'lg:order-2 lg:col-span-5 lg:col-start-7'
                  }
                >
                  <BlockImage
                    media={service.media}
                    sizes="(max-width: 1024px) 88vw, 38vw"
                    className="mx-auto aspect-[3/4] w-full max-w-[26rem] rounded-arch"
                    placeholder={i % 3}
                  />
                </div>

                <div
                  className={
                    even
                      ? 'lg:col-span-4 lg:col-start-8'
                      : 'lg:order-1 lg:col-span-4 lg:col-start-2'
                  }
                >
                  <Reveal delay={0.1}>
                    <span className="font-serif text-[1.2rem] font-light italic text-blue-deep">
                      {numberWord(i)}
                    </span>
                    <h3 className="mt-3 text-[length:var(--text-h3)]">
                      {service.title}
                    </h3>
                    <p className="mt-4 max-w-[44ch] text-[0.94rem] leading-[1.8] text-ink-soft">
                      {service.excerpt}
                    </p>
                    {service.duration && (
                      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
                        {service.duration}
                      </p>
                    )}
                    {data.linkLabel && (
                      <ActionLink
                        href="#contact"
                        variant="ghost"
                        className="mt-8 border-0 px-0 py-0"
                        ink="bg-transparent"
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
    'Grandes arches alternées gauche/droite, un accompagnement par rangée.',
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
    eyebrow: 'Accompagnements',
    title: 'Un cadre pour chaque *besoin*.',
    linkLabel: 'Échanger à ce sujet',
  },
  Component: ServicesImmersifs,
}

/* ════════════════════════════════════════════════════════════════════
   Accompagnements — Arches
   Une arche par accompagnement, en rangée respirante : image dévoilée,
   titre serif, extrait, durée en méta. L'arche centrale est abaissée.
   ════════════════════════════════════════════════════════════════════ */

export const servicesArchesSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  linkLabel: z.string().default(''),
})

function ServicesArches({
  data,
  ctx,
}: BlockProps<z.output<typeof servicesArchesSchema>>) {
  const items = ctx.services

  return (
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="accompagnements" />

      {(data.eyebrow || data.title) && (
        <div className="mx-auto max-w-[46rem] text-center">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow className="justify-center">{data.eyebrow}</Eyebrow>
            </Reveal>
          )}
          {data.title && (
            <h2 className="mt-5 text-[length:var(--text-h2)]">
              <MaskLines delay={0.08}>
                <span>
                  <Emphasis text={data.title} />
                </span>
              </MaskLines>
            </h2>
          )}
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-12 md:gap-5 lg:grid-cols-3">
          {items.map((service, i) => (
            <Reveal
              key={service.id}
              delay={Math.min(0.05 + i * 0.1, 0.45)}
              className={i % 3 === 1 ? 'lg:mt-14' : undefined}
            >
              <article className="text-center">
                <BlockImage
                  media={service.media}
                  sizes="(max-width: 640px) 88vw, (max-width: 1024px) 44vw, 30vw"
                  className="mx-auto aspect-[3/4] w-full max-w-[22rem] rounded-arch"
                  placeholder={i % 3}
                  delay={0.1}
                />
                <h3 className="mt-6 text-[length:var(--text-h3)]">
                  {service.title}
                </h3>
                <p className="mx-auto mt-3 max-w-[40ch] text-[0.9rem] leading-[1.78] text-ink-soft">
                  {service.excerpt}
                </p>
                {service.duration && (
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
                    {service.duration}
                  </p>
                )}
              </article>
            </Reveal>
          ))}
        </div>
      )}

      {data.linkLabel && (
        <Reveal delay={0.3}>
          <div className="mt-10 flex justify-center md:mt-12">
            <ActionLink href="#contact" variant="primary">
              {data.linkLabel}
            </ActionLink>
          </div>
        </Reveal>
      )}
    </div>
  )
}

export const servicesArchesBlock: BlockDefinition<typeof servicesArchesSchema> =
  {
    label: 'Accompagnements — Arches',
    description:
      'Une arche par accompagnement, l’arche centrale abaissée — comme des sœurs.',
    group: 'Sections',
    schema: servicesArchesSchema,
    suggestedAnchor: 'accompagnements',
    navigable: true,
    fields: [
      field.text('eyebrow', 'Label supérieur'),
      field.text('title', 'Titre', { full: true }),
      field.text('linkLabel', 'Bouton sous la rangée — libellé'),
    ],
    defaults: {
      eyebrow: 'Accompagnements',
      title: 'Trois portes pour *entrer*.',
      linkLabel: 'Prendre rendez-vous',
    },
    Component: ServicesArches,
  }

/* ════════════════════════════════════════════════════════════════════
   Accompagnement — À la une
   Un seul accompagnement mis en avant : grande arche, titre serif,
   texte long, durée et invitation. Le contenu vient de l'écran
   « Accompagnements » — on choisit lequel par son numéro.
   ════════════════════════════════════════════════════════════════════ */

export const servicesDetailSchema = z.object({
  eyebrow: z.string().default(''),
  position: z.number().default(1),
  extra: z.string().default(''),
  linkLabel: z.string().default(''),
  linkHref: z.string().default('#contact'),
})

function ServicesDetail({
  data,
  ctx,
}: BlockProps<z.output<typeof servicesDetailSchema>>) {
  const index = Math.max(1, Math.round(data.position)) - 1
  const service = ctx.services[index] ?? ctx.services[0]
  if (!service) return null

  return (
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="à la une" />

      <div className="grid grid-cols-1 items-center gap-10 md:gap-12 lg:grid-cols-12 lg:gap-x-16">
        <div className="lg:col-span-5 lg:col-start-2">
          <BlockImage
            media={service.media}
            sizes="(max-width: 1024px) 88vw, 38vw"
            className="mx-auto aspect-[3/4.2] w-full max-w-[26rem] rounded-arch"
          />
        </div>

        <div className="lg:col-span-5 lg:col-start-8">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow>{data.eyebrow}</Eyebrow>
            </Reveal>
          )}

          <h2 className="mt-5 text-[length:var(--text-h2)]">
            <MaskLines delay={0.08}>
              <span>{service.title}</span>
            </MaskLines>
          </h2>

          {service.excerpt && (
            <Reveal delay={0.14}>
              <p className="mt-6 max-w-[46ch] text-[length:var(--text-lead)] leading-[1.7] text-ink">
                {service.excerpt}
              </p>
            </Reveal>
          )}

          {(service.body || data.extra) && (
            <Reveal delay={0.2}>
              <Prose
                text={service.body || data.extra}
                className="mt-6 max-w-[52ch]"
              />
            </Reveal>
          )}

          {service.duration && (
            <Reveal delay={0.26}>
              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
                {service.duration}
              </p>
            </Reveal>
          )}

          {data.linkLabel && (
            <Reveal delay={0.32}>
              <div className="mt-8">
                <ActionLink href={data.linkHref} variant="primary">
                  {data.linkLabel}
                </ActionLink>
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </div>
  )
}

export const servicesDetailBlock: BlockDefinition<typeof servicesDetailSchema> =
  {
    label: 'Accompagnement — À la une',
    description:
      'Un seul accompagnement mis en avant, grande arche et texte long.',
    group: 'Sections',
    schema: servicesDetailSchema,
    suggestedAnchor: 'accompagnement',
    fields: [
      field.text('eyebrow', 'Label supérieur'),
      field.number('position', 'Numéro de l’accompagnement', {
        help: '1 pour le premier de l’écran « Accompagnements », 2 pour le deuxième…',
      }),
      field.richtext('extra', 'Texte de remplacement', {
        help: 'Affiché seulement si l’accompagnement n’a pas de description longue.',
      }),
      field.text('linkLabel', 'Bouton — libellé'),
      field.text('linkHref', 'Bouton — lien'),
    ],
    defaults: {
      eyebrow: 'À la une',
      position: 1,
      extra:
        'Un espace pour vous, à votre rythme. On y dépose ce qui pèse — l’anxiété, la fatigue, un deuil, une séparation, ou simplement le sentiment de ne plus se reconnaître — et on cherche ensemble ce qui peut se remettre en mouvement.\n\nLes séances durent 50 minutes, au cabinet de Cesson-Sévigné ou en visio. La fréquence se décide ensemble, souvent une fois par semaine ou tous les quinze jours, et se réajuste à mesure que les choses évoluent.',
      linkLabel: 'Prendre rendez-vous',
      linkHref: '#contact',
    },
    Component: ServicesDetail,
  }

/* ════════════════════════════════════════════════════════════════════
   Tarifs — Sobres
   Des rangées serif sur filets fins : l'intitulé, une précision douce,
   le montant en italique bleu. Une note de bas de section pour les
   modalités (remboursements, annulation…).
   ════════════════════════════════════════════════════════════════════ */

export const tarifsSobreSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  items: z
    .array(
      z.object({
        label: z.string().default(''),
        detail: z.string().default(''),
        price: z.string().default(''),
      }),
    )
    .default([]),
  note: z.string().default(''),
})

function TarifsSobre({
  data,
  ctx,
}: BlockProps<z.output<typeof tarifsSobreSchema>>) {
  return (
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="tarifs" />

      <div className="mx-auto max-w-[44rem]">
        <div className="text-center">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow className="justify-center">{data.eyebrow}</Eyebrow>
            </Reveal>
          )}
          {data.title && (
            <h2 className="mt-5 text-[length:var(--text-h2)]">
              <MaskLines delay={0.08}>
                <span>
                  <Emphasis text={data.title} />
                </span>
              </MaskLines>
            </h2>
          )}
        </div>

        {data.items.length > 0 && (
          <div className="mt-10 border-t border-line-strong md:mt-12">
            {data.items.map((item, i) => (
              <Reveal key={i} delay={Math.min(0.08 + i * 0.06, 0.35)}>
                <div className="flex items-baseline justify-between gap-5 border-b border-line py-6 sm:gap-8 md:py-7">
                  <div className="min-w-0">
                    <p className="font-serif text-[clamp(1.15rem,1.7vw,1.5rem)] font-light text-ink">
                      {item.label}
                    </p>
                    {item.detail && (
                      <p className="mt-1.5 text-[0.84rem] leading-[1.7] text-stone">
                        {item.detail}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 font-serif text-[clamp(1.3rem,2vw,1.8rem)] font-light italic text-blue-deep">
                    {item.price}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        )}

        {data.note && (
          <Reveal delay={0.3}>
            <p className="mt-8 text-center text-[0.84rem] leading-[1.8] text-stone">
              {data.note}
            </p>
          </Reveal>
        )}
      </div>
    </div>
  )
}

export const tarifsSobreBlock: BlockDefinition<typeof tarifsSobreSchema> = {
  label: 'Tarifs — Sobres',
  description: 'Des rangées serif sur filets fins, montants en italique bleu.',
  group: 'Sections',
  schema: tarifsSobreSchema,
  suggestedAnchor: 'tarifs',
  navigable: true,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.list(
      'items',
      'Tarifs',
      [
        field.text('label', 'Intitulé'),
        field.text('detail', 'Précision', {
          placeholder: 'Au cabinet ou en visio · 1 h',
        }),
        field.text('price', 'Montant', { placeholder: '60 €' }),
      ],
      { addLabel: 'Ajouter un tarif' },
    ),
    field.textarea('note', 'Note de bas de section', {
      help: 'Modalités, remboursements, annulation…',
    }),
  ],
  defaults: {
    eyebrow: 'Tarifs',
    title: 'Des séances au *juste* prix.',
    items: [
      {
        label: 'Séance individuelle adulte',
        detail: 'Au cabinet ou en visio · 50 min',
        price: '60 €',
      },
      {
        label: 'Séance adolescent',
        detail: 'Un cadre adapté, avec ou sans les parents · 45 min',
        price: '50 €',
      },
      {
        label: 'Tarif étudiant et réduit',
        detail: 'Sur simple demande, sans justificatif · 50 min',
        price: '50 €',
      },
      {
        label: 'Premier échange',
        detail: 'Par téléphone, pour faire connaissance · 20 min',
        price: 'Offert',
      },
    ],
    note: 'Règlement par chèque, espèces ou virement à la fin de chaque séance. Toute séance annulée moins de 48 h à l’avance est due. Certaines mutuelles prennent en charge une partie des séances — n’hésitez pas à leur poser la question.',
  },
  Component: TarifsSobre,
}

/* ════════════════════════════════════════════════════════════════════
   Une séance — Le déroulé
   Le fil d'une séance, étape par étape, le long d'un filet central :
   index serif en toutes lettres, intitulé, description courte.
   ════════════════════════════════════════════════════════════════════ */

export const seanceDerouleSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  steps: z
    .array(z.object({ title: z.string(), text: z.string() }))
    .default([]),
})

function SeanceDeroule({
  data,
  ctx,
}: BlockProps<z.output<typeof seanceDerouleSchema>>) {
  return (
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="le déroulé" />

      <div className="mx-auto max-w-[40rem]">
        <div className="text-center">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow className="justify-center">{data.eyebrow}</Eyebrow>
            </Reveal>
          )}
          {data.title && (
            <h2 className="mt-5 text-[length:var(--text-h2)]">
              <MaskLines delay={0.08}>
                <span>
                  <Emphasis text={data.title} />
                </span>
              </MaskLines>
            </h2>
          )}
        </div>

        {data.steps.length > 0 && (
          <ol className="mt-10 md:mt-12">
            {data.steps.map((step, i) => {
              const last = i === data.steps.length - 1
              return (
                <Reveal key={i} delay={Math.min(0.08 + i * 0.07, 0.4)}>
                  <li
                    className={`relative border-l border-line pl-7 md:pl-10 ${
                      last ? 'pb-0' : 'pb-10 md:pb-12'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute -left-1 top-1 block h-[7px] w-[7px] rounded-full bg-blue-deep"
                    />
                    <span className="font-serif text-[1.1rem] font-light italic text-blue-deep">
                      {numberWord(i)}
                    </span>
                    {step.title && (
                      <h3 className="mt-2 text-[length:var(--text-h3)]">
                        {step.title}
                      </h3>
                    )}
                    {step.text && (
                      <p className="mt-2.5 max-w-[52ch] text-[0.94rem] leading-[1.8] text-ink-soft">
                        {step.text}
                      </p>
                    )}
                  </li>
                </Reveal>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}

export const seanceDerouleBlock: BlockDefinition<typeof seanceDerouleSchema> = {
  label: 'Une séance — Le déroulé',
  description: 'Le fil d’une séance, étape par étape, le long d’un filet.',
  group: 'Sections',
  schema: seanceDerouleSchema,
  suggestedAnchor: 'une-seance',
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.list(
      'steps',
      'Étapes',
      [field.text('title', 'Intitulé'), field.textarea('text', 'Description')],
      { addLabel: 'Ajouter une étape' },
    ),
  ],
  defaults: {
    eyebrow: 'Comment ça se passe',
    title: 'Une séance, *simplement*.',
    steps: [
      {
        title: 'On s’installe',
        text: 'Un fauteuil, du thé si vous voulez. Les premières minutes servent à arriver — vraiment.',
      },
      {
        title: 'Vous déposez',
        text: 'Ce qui est là, ce qui pèse, ce qui déborde. Il n’y a pas de bonne manière de le dire.',
      },
      {
        title: 'On chemine',
        text: 'J’écoute, je questionne parfois, jamais je ne juge. Le silence a droit de cité.',
      },
      {
        title: 'On referme',
        text: 'Quelques minutes pour atterrir, et repartir avec ce qui s’est ouvert — à votre rythme.',
      },
    ],
  },
  Component: SeanceDeroule,
}
