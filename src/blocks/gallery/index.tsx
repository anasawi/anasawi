import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { MaskLines, Reveal } from '@/components/site/anim'
import { BlockImage } from '@/components/site/BlockImage'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { SectionIndex } from '@/components/site/ornaments'
import { cn } from '@/lib/utils'

export const gallerySchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  mediaIds: z.array(z.string().uuid()).default([]),
})

export type GalleryPayload = z.output<typeof gallerySchema>

/* Arches et coins doux alternés, une image sur trois abaissée : la
   régularité d'une grille stricte tuerait l'impression éditoriale. */
const SHAPES = [
  { ratio: 'aspect-[3/4]', round: 'rounded-arch', offset: '' },
  { ratio: 'aspect-[4/4.4]', round: 'rounded-[28px]', offset: 'lg:mt-20' },
  { ratio: 'aspect-[3/4.2]', round: 'rounded-arch', offset: 'lg:mt-8' },
] as const

function Gallery({ data, ctx }: BlockProps<GalleryPayload>) {
  const images = data.mediaIds
    .map((id) => ctx.resolveMedia(id))
    .filter((m): m is NonNullable<typeof m> => m !== null)

  return (
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="en images" />

      {(data.eyebrow || data.title) && (
        <div className="mb-10 max-w-[34rem] md:mb-12">
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
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
        {(images.length > 0 ? images : [null, null, null]).map((image, i) => {
          const shape = SHAPES[i % SHAPES.length] ?? SHAPES[0]

          return (
            <Reveal key={image ? `${image.id}-${i}` : i} delay={(i % 3) * 0.09}>
              <figure className={cn(shape.offset)}>
                <BlockImage
                  media={image}
                  sizes="(max-width: 640px) 88vw, (max-width: 1024px) 44vw, 30vw"
                  className={cn('w-full', shape.ratio, shape.round)}
                  placeholder={i % 3}
                />
                {image?.caption && (
                  <figcaption className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
                    {image.caption}
                  </figcaption>
                )}
              </figure>
            </Reveal>
          )
        })}
      </div>
    </div>
  )
}

export const galleryBlock: BlockDefinition<typeof gallerySchema> = {
  label: 'Éditorial — Galerie',
  description: 'Grille d’arches décalées, légendes en méta.',
  group: 'Sections',
  schema: gallerySchema,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.mediaList('mediaIds', 'Images', {
      help: 'La légende de chaque image vient de la bibliothèque de médias.',
    }),
  ],
  defaults: {
    eyebrow: 'En images',
    title: 'Un lieu pour *respirer*.',
    mediaIds: [],
  },
  Component: Gallery,
}
