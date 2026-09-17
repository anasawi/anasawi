import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { MaskLines, Reveal } from '@/components/site/anim'
import { ActionLink } from '@/components/site/ActionLink'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { Aster, SectionIndex } from '@/components/site/ornaments'
import {
  addressLines,
  bookingHref as sharedBookingHref,
  directContactHref,
} from '@/lib/settings-helpers'
import { toE164 } from '@/lib/utils'
import type { OpeningHour, Settings } from '@/server/db/schema'

/*
 * Être contactée. Toutes les coordonnées viennent des Réglages
 * (`ctx.settings`) : les modifier là les met à jour partout.
 */

/** URL de rendez-vous, sinon téléphone, sinon e-mail — jamais une ancre :
    dans un bloc Contact, le bouton doit mener à un contact direct. */
function bookingHref(s: Settings): string {
  return sharedBookingHref(s, directContactHref(s))
}

/* ════════════════════════════════════════════════════════════════════
   Contact — La grande arche (proposition K de la planche)
   Une immense arche bleu profond : « On commence quand vous voulez »,
   le bouton clair, puis les coordonnées en colonnes sur un filet.
   ════════════════════════════════════════════════════════════════════ */

export const contactMinimalSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  text: z.string().default(''),
  showAddress: z.boolean().default(true),
  showHours: z.boolean().default(true),
  showBooking: z.boolean().default(true),
  bookingLabel: z.string().default('Prendre rendez-vous'),
})

function ContactMinimal({
  data,
  ctx,
}: BlockProps<z.output<typeof contactMinimalSchema>>) {
  const s = ctx.settings
  const address = addressLines(s)
  const hours = (s.openingHours ?? []) as OpeningHour[]

  const columns = [
    s.contactEmail
      ? {
          label: 'Écrire',
          content: (
            <a
              href={`mailto:${s.contactEmail}`}
              className="font-serif text-[18px] font-light transition-colors duration-300 hover:text-ivory/80"
            >
              {s.contactEmail}
            </a>
          ),
        }
      : null,
    s.contactPhone
      ? {
          label: 'Appeler',
          content: (
            <a
              href={`tel:${toE164(s.contactPhone)}`}
              className="font-serif text-[18px] font-light transition-colors duration-300 hover:text-ivory/80"
            >
              {s.contactPhone}
            </a>
          ),
        }
      : null,
    data.showAddress && address.length > 0
      ? {
          label: 'Le cabinet',
          content: (
            <address className="text-[14.5px] not-italic leading-[1.7] text-ivory/85">
              {address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          ),
        }
      : null,
    data.showHours && hours.length > 0
      ? {
          label: 'Horaires',
          content: (
            <div className="text-[14.5px] leading-[1.7] text-ivory/85">
              {hours.map((h, i) => (
                <span key={i} className="block">
                  {h.day} — {h.hours}
                </span>
              ))}
            </div>
          ),
        }
      : null,
    data.text
      ? {
          label: 'Réponse',
          content: (
            <p className="max-w-[24ch] text-[14.5px] leading-[1.7] text-ivory/85">
              {data.text}
            </p>
          ),
        }
      : null,
  ].filter((c): c is NonNullable<typeof c> => c !== null)

  return (
    /* `bleed` — la proposition K compose avec le token de section :
       marge externe ½ section haut/bas, arche pleine largeur (gouttière),
       padding interne 1 section en haut, ½ section en bas. */
    <div className="relative py-[calc(var(--spacing-section)*0.5)]">
      <SectionIndex index={ctx.index} label="contact" />

      {/* La grande arche — `margin: 0 var(--gutter)`, pleine largeur (K).
          Mobile : rayon d'arche réduit (min(120px,22vw)). */}
      <div className="relative mx-[var(--spacing-gutter)] overflow-clip rounded-t-[min(120px,22vw)] rounded-b-[28px] bg-blue-deep px-6 pb-[calc(var(--spacing-section)*0.5)] pt-[var(--spacing-section)] text-center text-ivory sm:px-8 md:rounded-t-[min(240px,19vw)] md:px-12">
        {/* Halo clair qui descend du sommet de l'arche. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 aspect-square w-[min(620px,74vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(251,248,242,0.1),transparent_62%)]"
        />

        <div className="relative">
          <Reveal>
            <Aster className="text-[24px] text-blue" />
          </Reveal>

          {data.eyebrow && (
            <Reveal delay={0.08}>
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-ivory/55">
                {data.eyebrow}
              </p>
            </Reveal>
          )}

          {data.title && (
            <h2 className="mx-auto mt-5 max-w-[16ch] font-serif text-[clamp(38px,11vw,112px)] font-light leading-[1.06] md:text-[clamp(46px,7vw,112px)]">
              <MaskLines delay={0.12}>
                <span className="[&_em]:text-blue-mist">
                  <Emphasis text={data.title} />
                </span>
              </MaskLines>
            </h2>
          )}

          {data.showBooking && data.bookingLabel && (
            <Reveal delay={0.28}>
              <div className="mt-8 flex justify-center">
                <ActionLink
                  href={bookingHref(s)}
                  variant="primary"
                  external={Boolean(s.bookingUrl?.trim())}
                  className="bg-ivory text-night"
                  ink="bg-blue-mist"
                >
                  {data.bookingLabel}
                </ActionLink>
              </div>
            </Reveal>
          )}

          {columns.length > 0 && (
            <Reveal delay={0.38}>
              <div className="mt-10 flex flex-col gap-4 border-t border-[rgba(251,248,242,0.22)] pt-7 text-left md:mx-[var(--spacing-gutter)] md:mt-12 md:flex-row md:flex-wrap md:justify-between md:gap-5">
                {columns.map((col) => (
                  <div key={col.label} className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ivory/55">
                      {col.label}
                    </p>
                    <div className="mt-1.5 break-words">{col.content}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </div>
  )
}

export const contactMinimalBlock: BlockDefinition<typeof contactMinimalSchema> =
  {
    label: 'Contact — La grande arche',
    description:
      'L’immense arche bleue : invitation, bouton clair, coordonnées en colonnes. Les coordonnées proviennent des Réglages.',
    group: 'Sections',
    schema: contactMinimalSchema,
    suggestedAnchor: 'contact',
    navigable: true,
    /* La proposition K impose son propre rythme vertical (sp × .5). */
    bleed: true,
    fields: [
      field.text('eyebrow', 'Petit label au-dessus du titre'),
      field.text('title', 'Titre', {
        full: true,
        help: 'Astérisques pour l’italique : On *commence* quand vous voulez.',
      }),
      field.textarea('text', 'Colonne « Réponse »', {
        help: 'Une promesse courte — délai de réponse, confidentialité…',
      }),
      field.boolean('showAddress', 'Afficher l’adresse'),
      field.boolean('showHours', 'Afficher les horaires'),
      field.boolean('showBooking', 'Afficher le bouton de rendez-vous'),
      field.text('bookingLabel', 'Libellé du bouton'),
    ],
    defaults: {
      eyebrow: 'Prendre contact',
      title: 'On *commence* quand vous voulez.',
      text: 'Je vous réponds sous 48 h, en toute confidentialité — puis nous convenons d’un premier rendez-vous, au cabinet ou en visio.',
      showAddress: true,
      showHours: true,
      showBooking: true,
      bookingLabel: 'Prendre rendez-vous',
    },
    Component: ContactMinimal,
  }

/* ════════════════════════════════════════════════════════════════════
   Contact — La carte pratique
   Tout le pratique sur une page claire : coordonnées en grands liens
   serif à gauche, carte crème à droite avec horaires, accès et
   rendez-vous. Connecté aux Réglages.
   ════════════════════════════════════════════════════════════════════ */

export const contactCarteSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  intro: z.string().default(''),
  bookingLabel: z.string().default('Prendre rendez-vous'),
})

const bigLink =
  'inline-block break-all font-serif font-light text-[clamp(1.3rem,2.4vw,2rem)] leading-[1.3] ' +
  'text-ink underline decoration-line-strong decoration-1 underline-offset-[10px] ' +
  'transition-colors duration-500 ease-[var(--ease)] hover:text-blue-deep hover:decoration-blue-deep'

function ContactCarte({
  data,
  ctx,
}: BlockProps<z.output<typeof contactCarteSchema>>) {
  const s = ctx.settings
  const address = addressLines(s)
  const hours = (s.openingHours ?? []) as OpeningHour[]
  const mapsHref =
    address.length > 0
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          address.join(', '),
        )}`
      : null

  return (
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="contact" />

      <div className="grid grid-cols-1 gap-10 md:gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-24">
        <div className="min-w-0">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow>{data.eyebrow}</Eyebrow>
            </Reveal>
          )}

          {data.title && (
            <h2 className="mt-5 max-w-[20ch] text-[length:var(--text-h2)]">
              <MaskLines delay={0.08}>
                <span>
                  <Emphasis text={data.title} />
                </span>
              </MaskLines>
            </h2>
          )}

          {data.intro && (
            <Reveal delay={0.14}>
              <p className="mt-6 max-w-[44ch] text-[16px] leading-[1.85] text-ink-soft">
                {data.intro}
              </p>
            </Reveal>
          )}

          <div className="mt-10 space-y-8 md:mt-12">
            {s.contactEmail && (
              <Reveal delay={0.2}>
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
                    Par écrit
                  </p>
                  <a href={`mailto:${s.contactEmail}`} className={bigLink}>
                    {s.contactEmail}
                  </a>
                </div>
              </Reveal>
            )}

            {s.contactPhone && (
              <Reveal delay={0.28}>
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
                    De vive voix
                  </p>
                  <a href={`tel:${toE164(s.contactPhone)}`} className={bigLink}>
                    {s.contactPhone}
                  </a>
                </div>
              </Reveal>
            )}
          </div>

          <Reveal delay={0.34}>
            <span
              aria-hidden="true"
              className="mt-12 hidden h-14 w-px bg-line-strong lg:block"
            />
          </Reveal>
        </div>

        <Reveal delay={0.22} className="lg:pt-20">
          <aside className="rounded-[28px] bg-cream px-6 py-2 sm:px-8">
            {address.length > 0 && (
              <div className="border-b border-line py-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-deep">
                  Le cabinet
                </p>
                <address className="mt-2.5 text-[0.92rem] not-italic leading-[1.75] text-ink">
                  {address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
                {mapsHref && (
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-deep underline decoration-blue/50 underline-offset-4 transition-colors hover:text-night"
                  >
                    Voir l’itinéraire →
                  </a>
                )}
              </div>
            )}

            {hours.length > 0 && (
              <div className="border-b border-line py-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-deep">
                  Horaires
                </p>
                <dl className="mt-2.5">
                  {hours.map((row, i) => (
                    <div
                      key={i}
                      className="flex items-baseline justify-between gap-4 py-0.5"
                    >
                      <dt className="text-[0.88rem] text-ink">{row.day}</dt>
                      <dd className="text-[0.88rem] text-ink-soft">
                        {row.hours}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {s.practicalInfo && (
              <div className="border-b border-line py-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-deep">
                  Bon à savoir
                </p>
                <p className="mt-2.5 text-[0.88rem] leading-[1.75] text-ink-soft">
                  {s.practicalInfo}
                </p>
              </div>
            )}

            {data.bookingLabel && (
              <div className="py-6">
                <ActionLink
                  href={bookingHref(s)}
                  variant="primary"
                  external={Boolean(s.bookingUrl?.trim())}
                  className="max-sm:w-full"
                >
                  {data.bookingLabel}
                </ActionLink>
              </div>
            )}
          </aside>
        </Reveal>
      </div>
    </div>
  )
}

export const contactCarteBlock: BlockDefinition<typeof contactCarteSchema> = {
  label: 'Contact — La carte pratique',
  description:
    'Grands liens serif, carte crème avec horaires, accès et rendez-vous. Connecté aux Réglages.',
  group: 'Sections',
  schema: contactCarteSchema,
  suggestedAnchor: 'contact',
  navigable: true,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.textarea('intro', 'Texte d’accompagnement'),
    field.text('bookingLabel', 'Libellé du bouton'),
  ],
  defaults: {
    eyebrow: 'Contact',
    title: 'Un mot suffit pour *commencer*.',
    intro:
      'Écrivez-moi ou appelez-moi : je réponds sous 48 heures, en toute confidentialité.',
    bookingLabel: 'Prendre rendez-vous',
  },
  Component: ContactCarte,
}

/* ════════════════════════════════════════════════════════════════════
   Appel doux — Fin de page
   L'invitation la plus discrète : un filet, une phrase serif, un
   bouton. À poser juste avant le pied de page.
   ════════════════════════════════════════════════════════════════════ */

export const appelDouxSchema = z.object({
  title: z.string().default(''),
  text: z.string().default(''),
  label: z.string().default(''),
  href: z.string().default('#contact'),
})

function AppelDoux({ data }: BlockProps<z.output<typeof appelDouxSchema>>) {
  return (
    <div className="container-editorial">
      <div className="mx-auto max-w-[40rem] text-center">
        <Reveal>
          <span
            aria-hidden="true"
            className="mx-auto mb-8 block h-14 w-px bg-line-strong"
          />
        </Reveal>

        {data.title && (
          <Reveal delay={0.08}>
            <p className="font-serif text-[clamp(1.5rem,2.6vw,2.4rem)] font-light leading-[1.35] text-ink">
              <Emphasis text={data.title} />
            </p>
          </Reveal>
        )}

        {data.text && (
          <Reveal delay={0.16}>
            <p className="mx-auto mt-6 max-w-[46ch] text-[15px] leading-[1.85] text-ink-soft">
              {data.text}
            </p>
          </Reveal>
        )}

        {data.label && (
          <Reveal delay={0.24}>
            <div className="mt-8 flex justify-center">
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

export const appelDouxBlock: BlockDefinition<typeof appelDouxSchema> = {
  label: 'Appel doux — Fin de page',
  description: 'Un filet, une phrase serif, un bouton — l’invitation discrète.',
  group: 'Sections',
  schema: appelDouxSchema,
  suggestedAnchor: 'rendez-vous',
  fields: [
    field.textarea('title', 'La phrase', {
      help: 'Astérisques pour l’italique : *mot*.',
    }),
    field.textarea('text', 'Texte d’appui'),
    field.text('label', 'Bouton — libellé'),
    field.text('href', 'Bouton — lien'),
  ],
  defaults: {
    title: 'Quand vous serez *prêt·e*, je suis là.',
    text: 'Un premier échange, sans engagement, pour voir si le cadre vous convient.',
    label: 'Écrire un message',
    href: '#contact',
  },
  Component: AppelDoux,
}
