import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { MaskLines, Reveal } from '@/components/site/anim'
import { BlockImage } from '@/components/site/BlockImage'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { Prose } from '@/components/site/Prose'
import { SectionIndex } from '@/components/site/ornaments'

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
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="accompagnements" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
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

        {data.intro && (
          <div className="lg:col-span-5 lg:col-start-8 lg:pt-4">
            <Reveal delay={0.14}>
              <Prose text={data.intro} size="lead" />
            </Reveal>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div
          className={
            data.layout === 'grid'
              ? 'mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-12 md:gap-5 lg:grid-cols-3'
              : 'mt-10 border-t border-line-strong md:mt-12'
          }
        >
          {items.map((service, i) => {
            const image = service.media
            const number = String(i + 1).padStart(2, '0')

            if (data.layout === 'grid') {
              return (
                <Reveal key={service.id} delay={Math.min(i * 0.08, 0.35)}>
                  <article>
                    <BlockImage
                      media={image}
                      sizes="(max-width: 640px) 88vw, (max-width: 1024px) 44vw, 30vw"
                      className="mb-6 aspect-[4/3.4] w-full rounded-[28px]"
                      placeholder={i % 3}
                    />
                    <span className="font-serif text-[0.95rem] font-light italic text-blue-deep">
                      {number}
                    </span>
                    <h3 className="mt-2.5 text-[length:var(--text-h3)]">
                      {service.title}
                    </h3>
                    <p className="mt-3 text-[0.94rem] leading-[1.78] text-ink-soft">
                      {service.excerpt}
                    </p>
                  </article>
                </Reveal>
              )
            }

            /* Disposition en lignes : filets fins, pas de cartes. */
            return (
              <Reveal key={service.id} delay={Math.min(i * 0.06, 0.3)}>
                <article className="group grid grid-cols-1 items-start gap-4 border-b border-line py-7 md:gap-5 md:py-9 lg:grid-cols-12 lg:gap-12">
                  <span className="font-serif text-[0.95rem] font-light italic text-blue-deep lg:col-span-1">
                    {number}
                  </span>

                  <div className="lg:col-span-4">
                    <h3 className="text-[length:var(--text-h3)] transition-transform duration-700 ease-[var(--ease)] group-hover:translate-x-2">
                      {service.title}
                    </h3>
                    {service.duration && (
                      <p className="mt-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
                        {service.duration}
                      </p>
                    )}
                  </div>

                  <div className="lg:col-span-5">
                    <p className="max-w-[52ch] text-[0.94rem] leading-[1.8] text-ink-soft">
                      {service.excerpt}
                    </p>
                  </div>

                  {image && (
                    <div className="lg:col-span-2">
                      <BlockImage
                        media={image}
                        sizes="(max-width: 1024px) 60vw, 16vw"
                        className="aspect-[3/2.6] w-full max-w-[16rem] rounded-[18px]"
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
    'Liste des accompagnements, en lignes ou en cartes. Le contenu se gère dans l’écran « Accompagnements ».',
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
    eyebrow: 'Accompagnements',
    title: 'Des chemins *à votre* mesure.',
    intro:
      'Chaque parcours est différent. Selon ce que vous traversez, nous choisissons ensemble la forme d’accompagnement la plus juste : individuelle, en couple ou en famille, en séances de 50 minutes au cabinet. La première rencontre sert à faire connaissance et à poser le cadre, sans engagement.',
    layout: 'rows',
  },
  Component: Services,
}
