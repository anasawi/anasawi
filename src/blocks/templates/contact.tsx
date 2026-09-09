import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { ActionLink } from '@/components/site/ActionLink'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { Reveal } from '@/components/motion/Reveal'
import { toE164 } from '@/lib/utils'

/* ════════════════════════════════════════════════════════════════════
   Contact — Sans formulaire

   Le contact comme une évidence typographique : l'e-mail et le téléphone
   en liens serif géants, et à côté un panneau doux avec l'adresse, les
   horaires et la prise de rendez-vous. Toutes les coordonnées viennent
   des Réglages (`ctx.settings`) — les modifier là les met à jour ici.
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

const bigLink =
  'inline-block break-all font-serif text-[clamp(1.3rem,2.6vw,2.1rem)] leading-[1.3] ' +
  'text-ink underline decoration-line-strong decoration-1 underline-offset-[10px] ' +
  'transition-colors duration-500 ease-[var(--ease-out-soft)] ' +
  'hover:text-blue-deep hover:decoration-blue-deep'

function PanelRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-black/[0.06] py-5 last:border-b-0">
      <p className="text-[0.68rem] uppercase tracking-[0.14em] text-blue-deep">
        {label}
      </p>
      <div className="mt-2.5">{children}</div>
    </div>
  )
}

function ContactMinimal({
  data,
  ctx,
}: BlockProps<z.output<typeof contactMinimalSchema>>) {
  const s = ctx.settings

  const addressLines = [
    s.addressStreet,
    [s.addressPostalCode, s.addressCity].filter(Boolean).join(' '),
  ].filter((line): line is string => Boolean(line && line.trim()))

  const hours = (s.openingHours ?? []) as { day: string; hours: string }[]

  const showAddress = data.showAddress && addressLines.length > 0
  const showHours = data.showHours && hours.length > 0
  const showBooking = data.showBooking && Boolean(data.bookingLabel.trim())
  const hasPanel = showAddress || showHours || showBooking

  return (
    <div className="container-editorial">
      <div
        className={
          hasPanel
            ? 'grid grid-cols-1 gap-16 lg:grid-cols-[1.5fr_1fr] lg:gap-24'
            : undefined
        }
      >
        {/* ── Colonne principale : l'invitation ──────────────────── */}
        <div className="min-w-0">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow>{data.eyebrow}</Eyebrow>
            </Reveal>
          )}

          {data.title && (
            <Reveal delay={0.08}>
              <h2 className="mt-8 max-w-[20ch] text-[length:var(--text-h2)]">
                <Emphasis text={data.title} />
              </h2>
            </Reveal>
          )}

          {data.text && (
            <Reveal delay={0.14}>
              <p className="mt-7 max-w-[44ch] text-[0.975rem] leading-[1.78] text-ink-soft">
                {data.text}
              </p>
            </Reveal>
          )}

          <div className="mt-14 space-y-7">
            {s.contactEmail && (
              <Reveal delay={0.2}>
                <div>
                  <p className="mb-2 text-[0.68rem] uppercase tracking-[0.14em] text-stone">
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
                  <p className="mb-2 text-[0.68rem] uppercase tracking-[0.14em] text-stone">
                    De vive voix
                  </p>
                  <a href={`tel:${toE164(s.contactPhone)}`} className={bigLink}>
                    {s.contactPhone}
                  </a>
                </div>
              </Reveal>
            )}
          </div>

          {/* Filet vertical — le rappel du trait du logo. */}
          <div
            aria-hidden="true"
            className="mt-16 hidden h-16 w-px bg-line lg:block"
          />
        </div>

        {/* ── Panneau pratique ───────────────────────────────────── */}
        {hasPanel && (
          <Reveal delay={0.24} className="lg:pt-24">
            <aside className="rounded-[4px] bg-blue-mist/60 px-7 py-3">
              {showAddress && (
                <PanelRow label="Le cabinet">
                  <address className="text-[0.9rem] not-italic leading-[1.75] text-ink">
                    {addressLines.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </address>
                </PanelRow>
              )}

              {showHours && (
                <PanelRow label="Horaires">
                  <dl>
                    {hours.map((row, i) => (
                      <div
                        key={i}
                        className="flex items-baseline justify-between gap-4 py-0.5"
                      >
                        <dt className="text-[0.85rem] text-ink">{row.day}</dt>
                        <dd className="text-[0.85rem] text-ink-soft">
                          {row.hours}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </PanelRow>
              )}

              {showBooking && (
                <PanelRow label="Rendez-vous">
                  <div className="pt-1">
                    <ActionLink
                      href={
                        s.bookingUrl?.trim() ||
                        (s.contactPhone
                          ? `tel:${toE164(s.contactPhone)}`
                          : `mailto:${s.contactEmail ?? ''}`)
                      }
                      variant="primary"
                      external={Boolean(s.bookingUrl?.trim())}
                    >
                      {data.bookingLabel}
                    </ActionLink>
                  </div>
                </PanelRow>
              )}
            </aside>
          </Reveal>
        )}
      </div>
    </div>
  )
}

export const contactMinimalBlock: BlockDefinition<typeof contactMinimalSchema> =
  {
    label: 'Contact — Sans formulaire',
    description:
      'E-mail et téléphone en liens serif géants, adresse, horaires et prise de rendez-vous. Les coordonnées proviennent des Réglages.',
    group: 'Sections',
    schema: contactMinimalSchema,
    suggestedAnchor: 'contact',
    navigable: true,
    fields: [
      field.text('eyebrow', 'Label supérieur'),
      field.text('title', 'Titre', { full: true }),
      field.textarea('text', 'Texte d’accompagnement'),
      field.boolean('showAddress', 'Afficher l’adresse'),
      field.boolean('showHours', 'Afficher les horaires'),
      field.boolean('showBooking', 'Afficher le bouton de rendez-vous'),
      field.text('bookingLabel', 'Libellé du bouton'),
    ],
    defaults: {
      eyebrow: 'CONTACT',
      title: 'Un mot suffit pour *commencer*.',
      text: 'Écrivez-moi ou appelez-moi : je réponds sous 48 heures, en toute confidentialité.',
      showAddress: true,
      showHours: true,
      showBooking: true,
      bookingLabel: 'Prendre rendez-vous',
    },
    Component: ContactMinimal,
  }
