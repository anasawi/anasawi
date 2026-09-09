import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { MaskLines, Reveal } from '@/components/site/anim'
import { ActionLink } from '@/components/site/ActionLink'
import { ContactForm } from '@/components/site/ContactForm'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { Prose } from '@/components/site/Prose'
import { SectionIndex } from '@/components/site/ornaments'
import { toE164 } from '@/lib/utils'
import type { OpeningHour } from '@/server/db/schema'

export const contactSectionSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  intro: z.string().default(''),
  showForm: z.boolean().default(true),
  bookingLabel: z.string().default('Prendre rendez-vous'),
})

export type ContactSectionPayload = z.output<typeof contactSectionSchema>

/**
 * Les coordonnées ne sont pas dans le payload : elles viennent des Réglages,
 * ce qui garantit qu'une adresse ou un téléphone n'existe qu'à un seul endroit
 * — le même que celui utilisé par le JSON-LD.
 */
function Contact({ data, ctx }: BlockProps<ContactSectionPayload>) {
  const s = ctx.settings
  const hours = (s.openingHours as OpeningHour[]) ?? []

  const addressLines = [
    s.addressStreet,
    [s.addressPostalCode, s.addressCity].filter(Boolean).join(' '),
  ].filter((line): line is string => Boolean(line && line.trim()))

  return (
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="contact" className="-top-14" />

      <div className="grid grid-cols-1 gap-20 lg:grid-cols-12 lg:gap-x-24">
        {/* ── Coordonnées ─────────────────────────────────────── */}
        <div className="lg:col-span-5">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow>{data.eyebrow}</Eyebrow>
            </Reveal>
          )}

          {data.title && (
            <h2 className="mt-7 max-w-[14ch] text-[length:var(--text-h2)]">
              <MaskLines delay={0.08}>
                <span>
                  <Emphasis text={data.title} />
                </span>
              </MaskLines>
            </h2>
          )}

          {data.intro && (
            <Reveal delay={0.14}>
              <Prose text={data.intro} className="mt-7 max-w-[42ch]" />
            </Reveal>
          )}

          <Reveal delay={0.2}>
            <dl className="mt-12 border-t border-line-strong">
              {s.contactPhone && (
                <Row label="Téléphone">
                  <a
                    href={`tel:${toE164(s.contactPhone)}`}
                    className="font-serif text-[1.1rem] font-light transition-colors duration-400 hover:text-blue-deep"
                  >
                    {s.contactPhone}
                  </a>
                </Row>
              )}

              {s.contactEmail && (
                <Row label="E-mail">
                  <a
                    href={`mailto:${s.contactEmail}`}
                    className="break-all font-serif text-[1.1rem] font-light transition-colors duration-400 hover:text-blue-deep"
                  >
                    {s.contactEmail}
                  </a>
                </Row>
              )}

              {addressLines.length > 0 && (
                <Row label="Cabinet">
                  <address className="not-italic">
                    {addressLines.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </address>
                </Row>
              )}

              {hours.length > 0 && (
                <Row label="Horaires">
                  <ul>
                    {hours.map((h) => (
                      <li key={h.day} className="flex justify-between gap-6">
                        <span>{h.day}</span>
                        <span className="text-ink-soft">{h.hours}</span>
                      </li>
                    ))}
                  </ul>
                </Row>
              )}
            </dl>
          </Reveal>

          {s.practicalInfo && (
            <Reveal delay={0.26}>
              <Prose
                text={s.practicalInfo}
                className="mt-9 max-w-[44ch] text-[0.88rem]"
              />
            </Reveal>
          )}

          {s.bookingUrl && data.bookingLabel && (
            <Reveal delay={0.3}>
              <div className="mt-10">
                <ActionLink href={s.bookingUrl} variant="primary" external>
                  {data.bookingLabel}
                </ActionLink>
              </div>
            </Reveal>
          )}
        </div>

        {/* ── Formulaire ──────────────────────────────────────── */}
        {data.showForm && (
          <div className="lg:col-span-6 lg:col-start-7">
            <Reveal delay={0.16}>
              <ContactForm />
            </Reveal>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-4 border-b border-line py-6">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
        {label}
      </dt>
      <dd className="text-[0.95rem] leading-[1.65] text-ink">{children}</dd>
    </div>
  )
}

export const contactBlock: BlockDefinition<typeof contactSectionSchema> = {
  label: 'Contact — Complet',
  description:
    'Coordonnées et formulaire. Les coordonnées proviennent des Réglages.',
  group: 'Sections',
  schema: contactSectionSchema,
  suggestedAnchor: 'contact',
  navigable: true,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.textarea('intro', 'Introduction'),
    field.boolean('showForm', 'Afficher le formulaire'),
    field.text('bookingLabel', 'Bouton de prise de rendez-vous'),
  ],
  defaults: {
    eyebrow: 'Contact',
    title: '',
    intro: '',
    showForm: true,
    bookingLabel: 'Prendre rendez-vous',
  },
  Component: Contact,
}
