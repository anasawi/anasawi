import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { Reveal } from '@/components/site/anim'
import { ActionLink } from '@/components/site/ActionLink'
import { BlockImage } from '@/components/site/BlockImage'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { Prose } from '@/components/site/Prose'
import { cn } from '@/lib/utils'

/**
 * Section vierge — le point de départ neutre.
 *
 * Pas de composition imposée : un label, un titre, un texte, une image et
 * un bouton, tous optionnels, dans une mise en page sobre qui reste dans
 * la charte. C'est la section « je pars de zéro » de la bibliothèque —
 * sans jamais tomber dans un constructeur libre.
 */

export const viergeSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  body: z.string().default(''),
  mediaId: z.string().uuid().nullable().default(null),
  imageSide: z.enum(['aucune', 'gauche', 'droite']).default('aucune'),
  align: z.enum(['left', 'center']).default('left'),
  buttonLabel: z.string().default(''),
  buttonHref: z.string().default('#contact'),
})

function Vierge({ data, ctx }: BlockProps<z.output<typeof viergeSchema>>) {
  const media =
    data.imageSide === 'aucune' ? null : ctx.resolveMedia(data.mediaId)
  const withImage = data.imageSide !== 'aucune'
  const centered = data.align === 'center' && !withImage

  const content = (
    <div
      className={cn(
        'flex min-w-0 flex-col',
        centered && 'items-center text-center',
      )}
    >
      {data.eyebrow && (
        <Reveal delay={0.05}>
          <Eyebrow className={cn(centered && 'justify-center')}>
            {data.eyebrow}
          </Eyebrow>
        </Reveal>
      )}
      {data.title && (
        <Reveal delay={0.12}>
          <h2 className="mt-6 max-w-[30ch] text-[length:var(--text-h2)] leading-[1.15]">
            <Emphasis text={data.title} />
          </h2>
        </Reveal>
      )}
      {data.body && (
        <Reveal delay={0.2}>
          <div className={cn('mt-7 max-w-[38rem]', centered && 'mx-auto')}>
            <Prose text={data.body} size="base" />
          </div>
        </Reveal>
      )}
      {data.buttonLabel && (
        <Reveal delay={0.3}>
          <div className="mt-10">
            <ActionLink href={data.buttonHref} variant="primary">
              {data.buttonLabel}
            </ActionLink>
          </div>
        </Reveal>
      )}
    </div>
  )

  if (!withImage) {
    return (
      <div className="container-editorial">
        <div
          className={cn(centered ? 'mx-auto max-w-[44rem]' : 'max-w-[52rem]')}
        >
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="container-editorial">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div className={cn(data.imageSide === 'droite' && 'lg:order-2')}>
          <BlockImage
            media={media}
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="aspect-[4/3] w-full rounded-[28px]"
          />
        </div>
        <div className={cn(data.imageSide === 'droite' && 'lg:order-1')}>
          {content}
        </div>
      </div>
    </div>
  )
}

export const viergeBlock: BlockDefinition<typeof viergeSchema> = {
  label: 'Section vierge',
  description:
    'Le point de départ neutre : label, titre, texte, image et bouton — tous optionnels.',
  group: 'Sections',
  schema: viergeSchema,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', {
      full: true,
      help: 'Astérisques pour l’italique : *mot*.',
    }),
    field.richtext('body', 'Texte'),
    field.select('imageSide', 'Image', [
      { value: 'aucune', label: 'Sans image' },
      { value: 'gauche', label: 'À gauche' },
      { value: 'droite', label: 'À droite' },
    ]),
    field.media('mediaId', 'Image'),
    field.select('align', 'Alignement (sans image)', [
      { value: 'left', label: 'Gauche' },
      { value: 'center', label: 'Centré' },
    ]),
    field.text('buttonLabel', 'Bouton — libellé'),
    field.text('buttonHref', 'Bouton — lien'),
  ],
  defaults: {
    eyebrow: '',
    title: 'Un titre à écrire',
    body: 'Le texte de cette section, à remplacer par le vôtre.',
    mediaId: null,
    imageSide: 'aucune',
    align: 'left',
    buttonLabel: '',
    buttonHref: '#contact',
  },
  Component: Vierge,
}
