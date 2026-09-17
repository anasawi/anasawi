import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { MaskLines, Reveal } from '@/components/site/anim'
import { ActionLink } from '@/components/site/ActionLink'
import { Emphasis } from '@/components/site/Emphasis'
import { Aster } from '@/components/site/ornaments'

export const ctaSchema = z.object({
  lines: z.array(z.object({ text: z.string() })).default([]),
  text: z.string().default(''),
  label: z.string().default(''),
  href: z.string().default('#contact'),
  tone: z.enum(['mist', 'ink']).default('mist'),
})

export type CtaPayload = z.output<typeof ctaSchema>

/**
 * Bandeau d'invitation aux coins doux : bleu brume ou nuit, ✳, une ou
 * deux lignes serif, un bouton sobre.
 */
function Cta({ data }: BlockProps<CtaPayload>) {
  const lines = data.lines.map((l) => l.text).filter(Boolean)
  const dark = data.tone === 'ink'

  return (
    <div className="container-editorial">
      {/* Bandeau : padding interne = section-tight, gouttière interne
          24/32/48px — la section elle-même est en `section-tight`. */}
      <div
        className={
          dark
            ? 'rounded-[28px] bg-night px-6 py-[var(--spacing-section-tight)] text-center text-ivory sm:px-8 md:px-12'
            : 'rounded-[28px] bg-blue-mist px-6 py-[var(--spacing-section-tight)] text-center text-blue-ink sm:px-8 md:px-12'
        }
      >
        <div className="mx-auto max-w-[38rem]">
          <Reveal>
            <Aster
              className={dark ? 'text-[22px] text-blue' : 'text-[22px] text-blue-deep'}
            />
          </Reveal>

          {/* Pas de <h2> vide si l'admin n'a pas encore saisi de titre. */}
          {lines.length > 0 && (
            <h2
              className={
                dark
                  ? 'mt-5 font-serif text-[clamp(1.9rem,3.6vw,3.2rem)] font-light leading-[1.14] [&_em]:text-blue'
                  : 'mt-5 font-serif text-[clamp(1.9rem,3.6vw,3.2rem)] font-light leading-[1.14] [&_em]:text-blue-deep'
              }
            >
              <MaskLines delay={0.1}>
                {lines.map((line, i) => (
                  <span key={i}>
                    <Emphasis text={line} />
                  </span>
                ))}
              </MaskLines>
            </h2>
          )}

          {data.text && (
            <Reveal delay={0.2}>
              <p
                className={
                  dark
                    ? 'mx-auto mt-6 max-w-[44ch] text-[15px] leading-[1.85] text-ivory/75'
                    : 'mx-auto mt-6 max-w-[44ch] text-[15px] leading-[1.85] text-blue-ink/80'
                }
              >
                {data.text}
              </p>
            </Reveal>
          )}

          {data.label && (
            <Reveal delay={0.28}>
              <div className="mt-8 flex justify-center">
                <ActionLink
                  href={data.href}
                  variant="primary"
                  className={
                    dark ? 'bg-ivory text-night hover:bg-cream' : undefined
                  }
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

export const ctaBlock: BlockDefinition<typeof ctaSchema> = {
  label: 'Appel à l’action — Bandeau',
  description: 'Bandeau d’invitation aux coins doux, bleu brume ou nuit.',
  group: 'Sections',
  schema: ctaSchema,
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
    field.textarea('text', 'Texte'),
    field.text('label', 'Bouton — libellé'),
    field.text('href', 'Bouton — lien'),
    field.select('tone', 'Fond', [
      { value: 'mist', label: 'Bleu brume' },
      { value: 'ink', label: 'Nuit' },
    ]),
  ],
  defaults: {
    lines: [{ text: 'Retrouver' }, { text: 'son *souffle*.' }],
    text: 'Le premier pas est souvent le plus difficile. Un appel ou un message suffit : je vous réponds sous 48 h et nous convenons ensemble d’un premier rendez-vous.',
    label: 'Prendre rendez-vous',
    href: '#contact',
    tone: 'mist',
  },
  Component: Cta,
}
