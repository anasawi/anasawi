import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { ActionLink } from '@/components/site/ActionLink'
import { Magnetic } from '@/components/motion/Magnetic'
import { Reveal } from '@/components/motion/Reveal'
import { SplitText } from '@/components/motion/SplitText'

export const ctaSchema = z.object({
  lines: z.array(z.object({ text: z.string() })).default([]),
  text: z.string().default(''),
  label: z.string().default(''),
  href: z.string().default('#contact'),
  tone: z.enum(['mist', 'ink']).default('mist'),
})

export type CtaPayload = z.output<typeof ctaSchema>

function Cta({ data }: BlockProps<CtaPayload>) {
  const lines = data.lines.map((l) => l.text).filter(Boolean)
  const dark = data.tone === 'ink'

  return (
    <div className="container-editorial">
      <div
        className={
          dark
            ? 'bg-ink px-8 py-24 text-ivory md:px-20 md:py-32'
            : 'bg-blue-mist px-8 py-24 md:px-20 md:py-32'
        }
      >
        <div className="mx-auto max-w-[36rem] text-center">
          {/* Pas de <h2> vide si l'admin n'a pas encore saisi de titre. */}
          {lines.length > 0 && (
            <SplitText
              as="h2"
              lines={lines}
              className="text-[clamp(1.9rem,3.6vw,3.2rem)] leading-[1.14]"
              emphasis
            />
          )}

          {data.text && (
            <Reveal delay={0.2}>
              <p
                className={
                  dark
                    ? 'mx-auto mt-7 max-w-[44ch] leading-[1.75] text-ivory/75'
                    : 'mx-auto mt-7 max-w-[44ch] leading-[1.75] text-ink-soft'
                }
              >
                {data.text}
              </p>
            </Reveal>
          )}

          {data.label && (
            <Reveal delay={0.28}>
              <div className="mt-11 flex justify-center">
                <Magnetic strength={0.15}>
                  <ActionLink
                    href={data.href}
                    variant={dark ? 'primary' : 'outline'}
                  >
                    {data.label}
                  </ActionLink>
                </Magnetic>
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </div>
  )
}

export const ctaBlock: BlockDefinition<typeof ctaSchema> = {
  label: 'Appel à l’action — Simple',
  description: 'Bandeau d’invitation à prendre rendez-vous.',
  group: 'Sections',
  schema: ctaSchema,
  fields: [
    field.list(
      'lines',
      'Titre — une entrée par ligne',
      [field.text('text', 'Ligne', { full: true })],
      { addLabel: 'Ajouter une ligne' },
    ),
    field.textarea('text', 'Texte'),
    field.text('label', 'Bouton — libellé'),
    field.text('href', 'Bouton — lien'),
    field.select('tone', 'Fond', [
      { value: 'mist', label: 'Bleu brume' },
      { value: 'ink', label: 'Anthracite' },
    ]),
  ],
  defaults: {
    lines: [],
    text: '',
    label: 'Prendre rendez-vous',
    href: '#contact',
    tone: 'mist',
  },
  Component: Cta,
}
