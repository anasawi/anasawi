import { z } from 'zod'

import { field } from '../field'
import { toParagraphs, type BlockDefinition, type BlockProps } from '../types'
import { ActionLink } from '@/components/site/ActionLink'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { ImageReveal } from '@/components/motion/ImageReveal'
import { Reveal } from '@/components/motion/Reveal'

/* ════════════════════════════════════════════════════════════════════
   Éditorial — Texte centré
   Une grande déclaration serif au centre de la page, un paragraphe
   d'appui, un lien discret. Respiration entre deux sections denses.
   ════════════════════════════════════════════════════════════════════ */

export const texteCentreSchema = z.object({
  eyebrow: z.string().default(''),
  statement: z.string().default(''),
  text: z.string().default(''),
  label: z.string().default(''),
  href: z.string().default('#contact'),
})

function TexteCentre({ data }: BlockProps<z.output<typeof texteCentreSchema>>) {
  return (
    <div className="container-editorial">
      <div className="mx-auto max-w-[44rem] text-center">
        {data.eyebrow && (
          <Reveal delay={0.05}>
            <Eyebrow className="justify-center">{data.eyebrow}</Eyebrow>
          </Reveal>
        )}

        {data.statement && (
          <Reveal delay={0.12}>
            <p className="mt-10 font-serif text-[clamp(1.6rem,3vw,2.6rem)] leading-[1.3] text-ink">
              <Emphasis text={data.statement} />
            </p>
          </Reveal>
        )}

        {data.text && (
          <Reveal delay={0.2}>
            <p className="mx-auto mt-8 max-w-[38rem] text-[0.975rem] leading-[1.78] text-ink-soft">
              {data.text}
            </p>
          </Reveal>
        )}

        {data.label && (
          <Reveal delay={0.3}>
            <div className="mt-10 flex justify-center">
              <ActionLink href={data.href} variant="ghost">
                {data.label}
              </ActionLink>
            </div>
          </Reveal>
        )}
      </div>
    </div>
  )
}

export const texteCentreBlock: BlockDefinition<typeof texteCentreSchema> = {
  label: 'Éditorial — Texte centré',
  description: 'Grande déclaration serif centrée, paragraphe d’appui, lien.',
  group: 'Sections',
  schema: texteCentreSchema,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.textarea('statement', 'Déclaration', {
      help: 'Astérisques pour l’italique : *mot*.',
    }),
    field.textarea('text', 'Paragraphe d’appui'),
    field.text('label', 'Lien — libellé'),
    field.text('href', 'Lien — destination'),
  ],
  defaults: {
    eyebrow: 'L’ESSENTIEL',
    statement:
      'On ne guérit pas en allant plus vite. On guérit en s’accordant enfin le *temps*.',
    text: 'C’est souvent la première chose que l’on redécouvre ici : le droit de ralentir, d’écouter ce qui se passe en soi, sans obligation de résultat.',
    label: '',
    href: '#contact',
  },
  Component: TexteCentre,
}

/* ════════════════════════════════════════════════════════════════════
   Éditorial — Manifeste
   Titre à gauche, texte composé en deux colonnes typographiques à
   droite, ouvert par une lettrine serif — la page d'une revue.
   ════════════════════════════════════════════════════════════════════ */

export const manifesteSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  body: z.string().default(''),
})

function Manifeste({ data }: BlockProps<z.output<typeof manifesteSchema>>) {
  const paragraphs = toParagraphs(data.body)

  return (
    <div className="container-editorial">
      <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-x-24">
        <div className="lg:col-span-4">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow>{data.eyebrow}</Eyebrow>
            </Reveal>
          )}
          {data.title && (
            <Reveal delay={0.08}>
              <h2 className="mt-8 max-w-[14ch] text-[length:var(--text-h2)]">
                <Emphasis text={data.title} />
              </h2>
            </Reveal>
          )}
        </div>

        {paragraphs.length > 0 && (
          <div className="lg:col-span-7 lg:col-start-6">
            <Reveal delay={0.15}>
              <div className="text-[0.975rem] leading-[1.85] text-ink-soft lg:columns-2 lg:gap-12">
                {paragraphs.map((p, i) => (
                  <p
                    key={i}
                    className={
                      i === 0
                        ? 'break-inside-avoid first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-serif first-letter:text-[3.2em] first-letter:leading-[0.8] first-letter:text-ink'
                        : 'mt-[1.1em] break-inside-avoid'
                    }
                  >
                    {p}
                  </p>
                ))}
              </div>
            </Reveal>
          </div>
        )}
      </div>
    </div>
  )
}

export const manifesteBlock: BlockDefinition<typeof manifesteSchema> = {
  label: 'Éditorial — Manifeste',
  description: 'Texte en deux colonnes typographiques, ouvert par une lettrine.',
  group: 'Sections',
  schema: manifesteSchema,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.richtext('body', 'Texte du manifeste'),
  ],
  defaults: {
    eyebrow: 'MANIFESTE',
    title: 'Ce en quoi je *crois*.',
    body: 'Il n’existe pas de méthode universelle pour aller mieux. Il existe des personnes, des histoires, des rythmes — et un cadre suffisamment sûr pour que chacun puisse déposer ce qu’il porte.\n\nJe crois que la thérapie n’est pas un lieu où l’on vient être réparé, mais un espace où l’on réapprend à s’écouter. Le silence y a autant de valeur que la parole, et la lenteur n’y est jamais un échec.\n\nJe crois enfin que demander de l’aide est un geste de courage, pas de faiblesse. C’est souvent le premier pas du chemin — et il compte double.',
  },
  Component: Manifeste,
}

/* ════════════════════════════════════════════════════════════════════
   Éditorial — Image pleine largeur
   Une très grande image panoramique, un titre en surimpression sur
   voile discret, une légende alignée à droite. Le reste est du vide.
   ════════════════════════════════════════════════════════════════════ */

export const imagePleineSchema = z.object({
  title: z.string().default(''),
  caption: z.string().default(''),
  mediaId: z.string().uuid().nullable().default(null),
})

function ImagePleine({
  data,
  ctx,
}: BlockProps<z.output<typeof imagePleineSchema>>) {
  const image = ctx.resolveMedia(data.mediaId)

  return (
    <div className="container-editorial">
      <div className="relative">
        <ImageReveal
          media={image}
          sizes="100vw"
          className="aspect-3/2 w-full md:aspect-21/9"
        />

        {data.title && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent px-8 pb-8 pt-24 md:px-12">
            <p className="font-serif text-[clamp(1.3rem,2.2vw,1.9rem)] leading-[1.2] text-white/95">
              <Emphasis text={data.title} />
            </p>
          </div>
        )}
      </div>

      {data.caption && (
        <Reveal delay={0.1}>
          <p className="mt-5 text-right text-[0.8rem] tracking-[0.02em] text-stone">
            {data.caption}
          </p>
        </Reveal>
      )}
    </div>
  )
}

export const imagePleineBlock: BlockDefinition<typeof imagePleineSchema> = {
  label: 'Éditorial — Image pleine largeur',
  description: 'Image panoramique, titre en surimpression, légende discrète.',
  group: 'Sections',
  schema: imagePleineSchema,
  fields: [
    field.text('title', 'Titre superposé', {
      full: true,
      help: 'Optionnel — affiché en bas à gauche de l’image.',
    }),
    field.text('caption', 'Légende', { full: true }),
    field.media('mediaId', 'Image'),
  ],
  defaults: {
    title: 'Le cabinet, un lieu pensé pour le *calme*.',
    caption: 'Le cabinet — lumière du matin',
    mediaId: null,
  },
  Component: ImagePleine,
}
