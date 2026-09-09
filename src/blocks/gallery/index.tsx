import Image from 'next/image'
import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { Eyebrow } from '@/components/site/Eyebrow'
import { Reveal } from '@/components/motion/Reveal'
import { cn } from '@/lib/utils'

export const gallerySchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  mediaIds: z.array(z.string().uuid()).default([]),
})

export type GalleryPayload = z.output<typeof gallerySchema>

/**
 * Grille décalée : une image sur trois est abaissée. La régularité d'une
 * grille stricte tue l'impression éditoriale ; le décalage la restaure sans
 * désordre.
 */
function Gallery({ data, ctx }: BlockProps<GalleryPayload>) {
  const images = data.mediaIds
    .map((id) => ctx.resolveMedia(id))
    .filter((m): m is NonNullable<typeof m> => m !== null)

  if (images.length === 0) return null

  return (
    <div className="container-editorial">
      {(data.eyebrow || data.title) && (
        <div className="mb-20 max-w-[34rem]">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow>{data.eyebrow}</Eyebrow>
            </Reveal>
          )}
          {data.title && (
            <Reveal delay={0.06}>
              <h2 className="mt-7 text-[length:var(--text-h2)]">{data.title}</h2>
            </Reveal>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image, i) => (
          <Reveal key={`${image.id}-${i}`} delay={(i % 3) * 0.08}>
            <figure
              className={cn(
                'group',
                i % 3 === 1 && 'lg:mt-20',
                i % 3 === 2 && 'lg:mt-8',
              )}
            >
              <div className="relative aspect-4/5 overflow-hidden">
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 32vw"
                  className="object-cover transition-transform duration-[1.3s] ease-[var(--ease-out-soft)] group-hover:scale-[1.045]"
                  {...(image.blurDataUrl
                    ? {
                        placeholder: 'blur' as const,
                        blurDataURL: image.blurDataUrl,
                      }
                    : {})}
                />
              </div>
              {image.caption && (
                <figcaption className="mt-4 text-[0.8rem] text-stone">
                  {image.caption}
                </figcaption>
              )}
            </figure>
          </Reveal>
        ))}
      </div>
    </div>
  )
}

export const galleryBlock: BlockDefinition<typeof gallerySchema> = {
  label: 'Éditorial — Galerie',
  description: 'Grille d’images décalée.',
  group: 'Sections',
  schema: gallerySchema,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.mediaList('mediaIds', 'Images'),
  ],
  defaults: { eyebrow: '', title: '', mediaIds: [] },
  Component: Gallery,
}
