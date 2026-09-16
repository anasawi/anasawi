import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { MaskLines, Reveal } from '@/components/site/anim'
import { ActionLink } from '@/components/site/ActionLink'
import { BlockImage } from '@/components/site/BlockImage'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { Prose } from '@/components/site/Prose'
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

/* Le portrait prend l'arche signature ; les autres formats gardent des
   coins doux. */
const ratios = {
  portrait: 'aspect-[3/4] rounded-arch',
  square: 'aspect-square rounded-[28px]',
  landscape: 'aspect-[4/3] rounded-[28px]',
} as const

/** Bloc générique : le seul qui serve à créer des sections non prévues. */
function ImageText({ data, ctx }: BlockProps<ImageTextPayload>) {
  const image = ctx.resolveMedia(data.mediaId)
  const imageFirst = data.imageSide === 'left'

  return (
    <div className="container-editorial">
      <div className="grid grid-cols-1 items-center gap-10 md:gap-12 lg:grid-cols-12 lg:gap-x-16">
        <div
          className={cn(
            'lg:col-span-5',
            imageFirst ? 'lg:order-1' : 'lg:order-2 lg:col-start-8',
          )}
        >
          <BlockImage
            media={image}
            sizes="(max-width: 1024px) 88vw, 38vw"
            className={cn(
              'mx-auto w-full max-w-[26rem] lg:mx-0',
              ratios[data.ratio],
            )}
          />
        </div>

        <div
          className={cn(
            'lg:col-span-5',
            imageFirst
              ? 'lg:order-2 lg:col-start-8'
              : 'lg:order-1 lg:col-start-2',
          )}
        >
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
          {data.body && (
            <Reveal delay={0.14}>
              <Prose text={data.body} className="mt-6 max-w-[52ch]" />
            </Reveal>
          )}
          {data.ctaLabel && data.ctaHref && (
            <Reveal delay={0.2}>
              <div className="mt-8">
                <ActionLink href={data.ctaHref} variant="ghost">
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
  description: 'Bloc polyvalent, arche à gauche ou à droite.',
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
      { value: 'portrait', label: 'Arche (portrait)' },
      { value: 'square', label: 'Carré' },
      { value: 'landscape', label: 'Paysage 4:3' },
    ]),
    field.text('ctaLabel', 'CTA — libellé'),
    field.text('ctaHref', 'CTA — lien'),
  ],
  defaults: {
    eyebrow: 'Le cabinet',
    title: 'Un cabinet qui ressemble à une *maison*.',
    body:
      'Le cabinet se trouve au 6 rue Saint-Martin, dans une maison calme du centre de Cesson-Sévigné, à quelques minutes de Rennes. Une pièce lumineuse, deux fauteuils, une fenêtre sur le jardin : rien qui intimide, tout qui apaise.\n\nOn y vient à pied, à vélo ou en voiture, le stationnement est facile. Et si le déplacement est compliqué, les séances peuvent aussi se faire en visio, avec la même attention.',
    mediaId: null,
    imageSide: 'left',
    ratio: 'portrait',
    ctaLabel: 'Découvrir le cabinet',
    ctaHref: '#cabinet',
  },
  Component: ImageText,
}
