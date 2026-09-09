import Image from 'next/image'
import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { Prose } from '@/components/site/Prose'
import { Reveal } from '@/components/motion/Reveal'

export const servicesSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  intro: z.string().default(''),
  layout: z.enum(['rows', 'grid']).default('rows'),
})

export type ServicesPayload = z.output<typeof servicesSchema>

/**
 * Les accompagnements ne sont pas dans le payload : ils viennent de la table
 * `services`, gérée dans son propre écran du CMS. Le bloc ne porte que sa
 * présentation. Une même liste peut ainsi apparaître sur plusieurs pages sans
 * duplication de contenu.
 */
function Services({ data, ctx }: BlockProps<ServicesPayload>) {
  const items = ctx.services

  return (
    <div className="container-editorial">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
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
        </div>

        {data.intro && (
          <div className="lg:col-span-5 lg:col-start-8 lg:pt-4">
            <Reveal delay={0.12}>
              <Prose text={data.intro} size="lead" />
            </Reveal>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div
          className={
            data.layout === 'grid'
              ? 'mt-24 grid grid-cols-1 gap-x-12 gap-y-20 sm:grid-cols-2 lg:grid-cols-3'
              : 'mt-24 border-t border-line-strong'
          }
        >
          {items.map((service, i) => {
            const image = service.media
            const number = String(i + 1).padStart(2, '0')

            if (data.layout === 'grid') {
              return (
                <Reveal key={service.id} delay={i * 0.07}>
                  <article className="group">
                    {image && (
                      <div className="relative mb-7 aspect-4/3 overflow-hidden">
                        <Image
                          src={image.url}
                          alt={image.alt}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 32vw"
                          className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
                          {...(image.blurDataUrl
                            ? {
                                placeholder: 'blur' as const,
                                blurDataURL: image.blurDataUrl,
                              }
                            : {})}
                        />
                      </div>
                    )}
                    <span className="font-serif text-[0.9rem] italic text-stone">
                      {number}
                    </span>
                    <h3 className="mt-3 text-[length:var(--text-h3)]">
                      {service.title}
                    </h3>
                    <p className="mt-3 text-[0.94rem] leading-[1.75] text-ink-soft">
                      {service.excerpt}
                    </p>
                  </article>
                </Reveal>
              )
            }

            /* Disposition en lignes : filets fins, pas de cartes à ombre. */
            return (
              <Reveal key={service.id} delay={i * 0.06}>
                <article className="group grid grid-cols-1 items-start gap-6 border-b border-line py-14 transition-colors duration-700 hover:bg-ivory-warm/60 lg:grid-cols-12 lg:gap-12 lg:px-8">
                  <span className="font-serif text-[0.95rem] italic text-stone lg:col-span-1">
                    {number}
                  </span>

                  <div className="lg:col-span-4">
                    <h3 className="text-[length:var(--text-h3)]">
                      {service.title}
                    </h3>
                    {service.duration && (
                      <p className="mt-2 text-[0.78rem] uppercase tracking-[0.14em] text-stone">
                        {service.duration}
                      </p>
                    )}
                  </div>

                  <div className="lg:col-span-5">
                    <p className="max-w-[52ch] text-[0.94rem] leading-[1.78] text-ink-soft">
                      {service.excerpt}
                    </p>
                  </div>

                  {image && (
                    <div className="relative aspect-3/2 overflow-hidden lg:col-span-2">
                      <Image
                        src={image.url}
                        alt={image.alt}
                        fill
                        sizes="(max-width: 1024px) 100vw, 16vw"
                        className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-soft)] group-hover:scale-[1.05]"
                        {...(image.blurDataUrl
                          ? {
                              placeholder: 'blur' as const,
                              blurDataURL: image.blurDataUrl,
                            }
                          : {})}
                      />
                    </div>
                  )}
                </article>
              </Reveal>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const servicesBlock: BlockDefinition<typeof servicesSchema> = {
  label: 'Accompagnements — Cartes',
  description:
    'Liste des accompagnements. Le contenu se gère dans l’écran « Accompagnements ».',
  group: 'Sections',
  schema: servicesSchema,
  suggestedAnchor: 'accompagnements',
  navigable: true,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.textarea('intro', 'Introduction'),
    field.select('layout', 'Disposition', [
      { value: 'rows', label: 'Lignes (éditorial)' },
      { value: 'grid', label: 'Grille (cartes)' },
    ]),
  ],
  defaults: {
    eyebrow: 'ACCOMPAGNEMENTS',
    title: '',
    intro: '',
    layout: 'rows',
  },
  Component: Services,
}
