import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { ActionLink } from '@/components/site/ActionLink'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { ImageReveal } from '@/components/motion/ImageReveal'
import { Parallax } from '@/components/motion/Parallax'
import { Prose } from '@/components/site/Prose'
import { Reveal } from '@/components/motion/Reveal'
import { cn } from '@/lib/utils'

export const imageTextSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  body: z.string().default(''),
  mediaId: z.string().uuid().nullable().default(null),
  imageSide: z.enum(['left', 'right']).default('left'),
  ratio: z.enum(['portrait', 'square', 'landscape']).default('portrait'),
  ctaLabel: z.string().default(''),
  ctaHref: z.string().default(''),
})

export type ImageTextPayload = z.output<typeof imageTextSchema>

const ratios = {
  portrait: 'aspect-3/4',
  square: 'aspect-square',
  landscape: 'aspect-4/3',
} as const

/** Bloc générique : le seul qui serve à créer des sections non prévues. */
function ImageText({ data, ctx }: BlockProps<ImageTextPayload>) {
  const image = ctx.resolveMedia(data.mediaId)
  const imageFirst = data.imageSide === 'left'

  return (
    <div className="container-editorial">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-x-16">
        <div
          className={cn(
            'lg:col-span-5',
            imageFirst ? 'lg:order-1' : 'lg:order-2 lg:col-start-8',
          )}
        >
          <Parallax amount={5}>
            <ImageReveal
              media={image}
              sizes="(max-width: 1024px) 100vw, 40vw"
              className={cn('w-full', ratios[data.ratio])}
            />
          </Parallax>
        </div>

        <div
          className={cn(
            'lg:col-span-5',
            imageFirst ? 'lg:order-2 lg:col-start-8' : 'lg:order-1 lg:col-start-2',
          )}
        >
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
          {data.body && (
            <Reveal delay={0.12}>
              <Prose text={data.body} className="mt-8 max-w-[52ch]" />
            </Reveal>
          )}
          {data.ctaLabel && data.ctaHref && (
            <Reveal delay={0.18}>
              <div className="mt-10">
                <ActionLink href={data.ctaHref} variant="outline">
                  {data.ctaLabel}
                </ActionLink>
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </div>
  )
}

export const imageTextBlock: BlockDefinition<typeof imageTextSchema> = {
  label: 'Éditorial — Image + texte',
  description: 'Bloc polyvalent, image à gauche ou à droite.',
  group: 'Sections',
  schema: imageTextSchema,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.richtext('body', 'Texte'),
    field.media('mediaId', 'Image'),
    field.select('imageSide', 'Côté de l’image', [
      { value: 'left', label: 'Gauche' },
      { value: 'right', label: 'Droite' },
    ]),
    field.select('ratio', 'Format de l’image', [
      { value: 'portrait', label: 'Portrait 3:4' },
      { value: 'square', label: 'Carré' },
      { value: 'landscape', label: 'Paysage 4:3' },
    ]),
    field.text('ctaLabel', 'CTA — libellé'),
    field.text('ctaHref', 'CTA — lien'),
  ],
  defaults: {
    eyebrow: '',
    title: '',
    body: '',
    mediaId: null,
    imageSide: 'left',
    ratio: 'portrait',
    ctaLabel: '',
    ctaHref: '',
  },
  Component: ImageText,
}
