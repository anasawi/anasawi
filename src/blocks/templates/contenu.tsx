import { Fragment } from 'react'
import { z } from 'zod'

import { field } from '../field'
import { toParagraphs, type BlockDefinition, type BlockProps } from '../types'
import { Marquee, Reveal } from '@/components/site/anim'
import { BlockImage } from '@/components/site/BlockImage'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { GalleryRail } from '@/components/site/GalleryRail'
import { Aster, Dots, SectionIndex } from '@/components/site/ornaments'
import { cn } from '@/lib/utils'

/*
 * Sections de contenu — les briques libres de la bibliothèque :
 * bandeau qui défile, galeries d'arches, colonnes typographiques,
 * séparateurs, citations. Tout le vocabulaire de la planche V8.
 */

/** `*mot*` → italique bleue soulignée — l'accent de la maquette. */
function Underlined({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          return (
            <em
              key={i}
              className="border-b-2 border-blue pb-0.5 italic text-blue-deep"
            >
              {part.slice(1, -1)}
            </em>
          )
        }
        return <Fragment key={i}>{part}</Fragment>
      })}
    </>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Bandeau — Respirer (proposition B de la planche)
   Les mots-souffle en serif italique qui défilent à tempo constant,
   séparés d'astérisques.
   ════════════════════════════════════════════════════════════════════ */

const BANDEAU_TONES = {
  ivoire: { wrap: 'bg-ivory text-ink-soft', aster: 'text-blue-deep' },
  sable: { wrap: 'bg-sand text-ink-soft', aster: 'text-blue-deep' },
  creme: { wrap: 'bg-cream text-ink-soft', aster: 'text-blue-deep' },
  brume: { wrap: 'bg-blue-mist text-blue-ink', aster: 'text-blue-deep' },
  nuit: { wrap: 'bg-night text-ivory/85', aster: 'text-blue' },
} as const

export const bandeauRespirerSchema = z.object({
  words: z.string().default(''),
  tone: z.enum(['ivoire', 'sable', 'creme', 'brume', 'nuit']).default('sable'),
  speed: z.enum(['lent', 'normal']).default('normal'),
})

function BandeauRespirer({
  data,
}: BlockProps<z.output<typeof bandeauRespirerSchema>>) {
  const words = data.words
    .split(/[,;·]/)
    .map((w) => w.trim())
    .filter(Boolean)
  if (words.length === 0) return null

  const tone = BANDEAU_TONES[data.tone]

  return (
    <div className={cn('py-[var(--spacing-band)]', tone.wrap)}>
      <Marquee duration={data.speed === 'lent' ? 56 : 38}>
        {words.map((word, i) => (
          <span
            key={i}
            className="flex items-center font-serif text-[clamp(22px,3vw,46px)] font-light italic leading-none"
          >
            <span className="px-[max(10px,1.25vw)]">{word}</span>
            <Aster className={cn('text-[20px] not-italic', tone.aster)} />
          </span>
        ))}
      </Marquee>
    </div>
  )
}

export const bandeauRespirerBlock: BlockDefinition<
  typeof bandeauRespirerSchema
> = {
  label: 'Bandeau — Mots qui défilent',
  description:
    'Les mots-souffle en serif italique, séparés d’astérisques, à tempo constant.',
  group: 'Sections',
  schema: bandeauRespirerSchema,
  bleed: true,
  fields: [
    field.text('words', 'Les mots', {
      full: true,
      help: 'Séparés par des virgules — ils défilent en boucle.',
    }),
    field.select('tone', 'Fond', [
      { value: 'ivoire', label: 'Ivoire' },
      { value: 'sable', label: 'Sable' },
      { value: 'creme', label: 'Crème' },
      { value: 'brume', label: 'Bleu brume' },
      { value: 'nuit', label: 'Nuit' },
    ]),
    field.select('speed', 'Tempo', [
      { value: 'normal', label: 'Normal' },
      { value: 'lent', label: 'Lent' },
    ]),
  ],
  defaults: {
    words: 'respirer, déposer, traverser, s’apaiser, retrouver son souffle',
    tone: 'sable',
    speed: 'normal',
  },
  Component: BandeauRespirer,
}

/* ════════════════════════════════════════════════════════════════════
   Galerie — Le travelling d'arches (proposition G de la planche)
   Un rail horizontal d'arches sœurs, hauteurs et formats alternés,
   légendes en méta. Il se parcourt du doigt ou à la molette.
   ════════════════════════════════════════════════════════════════════ */

const RAIL = [
  {
    basis: 'w-[64vw] sm:w-[34vw] lg:w-[24vw]',
    ratio: 'aspect-[3/4]',
    round: 'rounded-arch',
  },
  {
    basis: 'w-[74vw] sm:w-[42vw] lg:w-[30vw]',
    ratio: 'aspect-[4/3.4]',
    round: 'rounded-[28px]',
  },
  {
    basis: 'w-[56vw] sm:w-[30vw] lg:w-[20vw]',
    ratio: 'aspect-[3/4.4]',
    round: 'rounded-arch',
  },
  {
    basis: 'w-[64vw] sm:w-[36vw] lg:w-[26vw]',
    ratio: 'aspect-square',
    round: 'rounded-[28px]',
  },
] as const

export const galerieArchesSchema = z.object({
  eyebrow: z.string().default(''),
  mediaIds: z.array(z.string().uuid()).default([]),
})

function GalerieArches({
  data,
  ctx,
}: BlockProps<z.output<typeof galerieArchesSchema>>) {
  const images = data.mediaIds
    .map((id) => ctx.resolveMedia(id))
    .filter((m): m is NonNullable<typeof m> => m !== null)

  return (
    <div className="relative">
      <SectionIndex index={ctx.index} label="en images" />

      {data.eyebrow && (
        <Reveal className="container-editorial">
          <Eyebrow>{data.eyebrow}</Eyebrow>
        </Reveal>
      )}

      <GalleryRail className="mt-10 pb-4 md:mt-12">
        {(images.length > 0 ? images : [null, null, null, null]).map(
          (image, i) => {
            const shape = RAIL[i % RAIL.length] ?? RAIL[0]
            return (
              <figure key={image ? `${image.id}-${i}` : i} className="shrink-0">
                <BlockImage
                  media={image}
                  sizes="(max-width: 640px) 74vw, (max-width: 1024px) 42vw, 30vw"
                  className={cn(shape.basis, shape.ratio, shape.round)}
                  placeholder={i % 3}
                  delay={Math.min(i * 0.08, 0.3)}
                />
                {image?.caption && (
                  <figcaption className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
                    {image.caption}
                  </figcaption>
                )}
              </figure>
            )
          },
        )}
      </GalleryRail>
    </div>
  )
}

export const galerieArchesBlock: BlockDefinition<typeof galerieArchesSchema> =
  {
    label: 'Galerie — Travelling d’arches',
    description:
      'Un rail horizontal d’arches sœurs, formats alternés, légendes en méta.',
    group: 'Sections',
    schema: galerieArchesSchema,
    /* Section standard : seul le rail déborde horizontalement. */
    suggestedAnchor: 'le-cabinet',
    fields: [
      field.text('eyebrow', 'Label supérieur'),
      field.mediaList('mediaIds', 'Images', {
        help: 'La légende de chaque image vient de la bibliothèque de médias.',
      }),
    ],
    defaults: { eyebrow: 'Le cabinet, en images', mediaIds: [] },
    Component: GalerieArches,
  }

/* ════════════════════════════════════════════════════════════════════
   Image — Avec légende
   Une seule arche, contenue et centrée, sa légende en méta dessous.
   ════════════════════════════════════════════════════════════════════ */

export const imageLegendeSchema = z.object({
  caption: z.string().default(''),
  format: z.enum(['arche', 'douce']).default('arche'),
  mediaId: z.string().uuid().nullable().default(null),
})

function ImageLegende({
  data,
  ctx,
}: BlockProps<z.output<typeof imageLegendeSchema>>) {
  const image = ctx.resolveMedia(data.mediaId)

  return (
    <div className="container-editorial">
      <figure className="mx-auto max-w-[26rem]">
        <BlockImage
          media={image}
          sizes="(max-width: 640px) 88vw, 26rem"
          className={cn(
            'w-full',
            data.format === 'arche'
              ? 'aspect-[3/4.2] rounded-arch'
              : 'aspect-[4/3.4] rounded-[28px]',
          )}
        />
        {data.caption && (
          <Reveal delay={0.15}>
            <figcaption className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
              {data.caption}
            </figcaption>
          </Reveal>
        )}
      </figure>
    </div>
  )
}

export const imageLegendeBlock: BlockDefinition<typeof imageLegendeSchema> = {
  label: 'Image — Avec légende',
  description: 'Une seule arche centrée, sa légende en méta dessous.',
  group: 'Sections',
  schema: imageLegendeSchema,
  fields: [
    field.media('mediaId', 'Image'),
    field.select('format', 'Forme', [
      { value: 'arche', label: 'Arche' },
      { value: 'douce', label: 'Coins doux' },
    ]),
    field.text('caption', 'Légende', { full: true }),
  ],
  defaults: { caption: 'Le fauteuil — côté fenêtre', format: 'arche', mediaId: null },
  Component: ImageLegende,
}

/* ════════════════════════════════════════════════════════════════════
   Texte — Deux colonnes
   La page d'une revue : titre à gauche, texte composé en deux
   colonnes typographiques ouvertes par une lettrine serif.
   ════════════════════════════════════════════════════════════════════ */

export const texteDeuxColonnesSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  body: z.string().default(''),
})

function TexteDeuxColonnes({
  data,
  ctx,
}: BlockProps<z.output<typeof texteDeuxColonnesSchema>>) {
  const paragraphs = toParagraphs(data.body)

  return (
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="pour aller plus loin" />

      <div className="grid grid-cols-1 gap-10 md:gap-12 lg:grid-cols-12 lg:gap-x-24">
        <div className="lg:col-span-4">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow>{data.eyebrow}</Eyebrow>
            </Reveal>
          )}
          {data.title && (
            <Reveal delay={0.08}>
              <h2 className="mt-5 max-w-[14ch] text-[length:var(--text-h2)]">
                <Emphasis text={data.title} />
              </h2>
            </Reveal>
          )}
        </div>

        {paragraphs.length > 0 && (
          <div className="lg:col-span-7 lg:col-start-6">
            <Reveal delay={0.15}>
              <div className="text-[0.975rem] leading-[1.9] text-ink-soft lg:columns-2 lg:gap-12">
                {paragraphs.map((p, i) => (
                  <p
                    key={i}
                    className={
                      i === 0
                        ? 'break-inside-avoid first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-serif first-letter:text-[3.2em] first-letter:font-light first-letter:leading-[0.8] first-letter:text-blue-deep'
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

export const texteDeuxColonnesBlock: BlockDefinition<
  typeof texteDeuxColonnesSchema
> = {
  label: 'Texte — Deux colonnes',
  description:
    'Texte composé en deux colonnes typographiques, ouvert par une lettrine.',
  group: 'Sections',
  schema: texteDeuxColonnesSchema,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.richtext('body', 'Texte'),
  ],
  defaults: {
    eyebrow: 'Pour aller plus loin',
    title: 'Ce que la thérapie *n’est pas*.',
    body: 'La thérapie n’est pas un lieu où l’on vient être réparé. Personne n’est cassé — il y a seulement des histoires qui pèsent, des nœuds qui se sont formés, des mots restés en travers.\n\nCe n’est pas non plus une course. Certaines choses demandent trois séances, d’autres deux ans. La lenteur n’y est jamais un échec : c’est souvent elle qui permet au travail de tenir.\n\nEt ce n’est pas réservé aux grandes crises. On peut venir parce que quelque chose cloche sans savoir quoi — c’est même l’une des meilleures raisons de pousser la porte.',
  },
  Component: TexteDeuxColonnes,
}

/* ════════════════════════════════════════════════════════════════════
   Liste — Les atouts
   Une grille d'atouts ponctués de l'astérisque signature.
   ════════════════════════════════════════════════════════════════════ */

export const listeAtoutsSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  items: z
    .array(z.object({ title: z.string(), text: z.string() }))
    .default([]),
})

function ListeAtouts({
  data,
  ctx,
}: BlockProps<z.output<typeof listeAtoutsSchema>>) {
  return (
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="ce qui compte" />

      {(data.eyebrow || data.title) && (
        <div className="mx-auto max-w-[42rem] text-center">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow className="justify-center">{data.eyebrow}</Eyebrow>
            </Reveal>
          )}
          {data.title && (
            <Reveal delay={0.08}>
              <h2 className="mt-5 text-[length:var(--text-h2)]">
                <Emphasis text={data.title} />
              </h2>
            </Reveal>
          )}
        </div>
      )}

      {data.items.length > 0 && (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-12 md:gap-5">
          {data.items.map((item, i) => (
            <Reveal key={i} delay={Math.min(0.08 + i * 0.06, 0.4)}>
              <div className="flex items-start gap-5 border-t border-line pt-7">
                <Aster className="mt-0.5 text-[18px] text-blue-deep" />
                <div>
                  {item.title && (
                    <h3 className="font-serif text-[1.15rem] font-light text-ink">
                      {item.title}
                    </h3>
                  )}
                  {item.text && (
                    <p className="mt-2 max-w-[46ch] text-[0.92rem] leading-[1.78] text-ink-soft">
                      {item.text}
                    </p>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  )
}

export const listeAtoutsBlock: BlockDefinition<typeof listeAtoutsSchema> = {
  label: 'Liste — Les atouts',
  description: 'Une grille d’atouts ponctués de l’astérisque signature.',
  group: 'Sections',
  schema: listeAtoutsSchema,
  fields: [
    field.text('eyebrow', 'Label supérieur'),
    field.text('title', 'Titre', { full: true }),
    field.list(
      'items',
      'Atouts',
      [field.text('title', 'Intitulé'), field.textarea('text', 'Description')],
      { addLabel: 'Ajouter un atout' },
    ),
  ],
  defaults: {
    eyebrow: 'Ce qui compte ici',
    title: 'Un cadre qui *tient*.',
    items: [
      {
        title: 'Confidentialité absolue',
        text: 'Rien de ce qui se dit ici n’en sort. C’est la condition de tout le reste.',
      },
      {
        title: 'Sans jugement',
        text: 'Tout peut se dire, dans l’ordre ou le désordre. Il n’y a pas de bonne manière d’aller mal.',
      },
      {
        title: 'À votre rythme',
        text: 'La fréquence des séances se décide ensemble — et se révise dès que nécessaire.',
      },
      {
        title: 'Au cabinet ou en visio',
        text: 'À Cesson-Sévigné, près de Rennes, ou à distance quand c’est plus simple pour vous.',
      },
    ],
  },
  Component: ListeAtouts,
}

/* ════════════════════════════════════════════════════════════════════
   Vidéo — Encadrée
   Une vidéo YouTube ou Vimeo dans un cadre aux coins doux.
   ════════════════════════════════════════════════════════════════════ */

export const videoArcheSchema = z.object({
  url: z.string().default(''),
  title: z.string().default(''),
  caption: z.string().default(''),
})

function embedUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  const yt =
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/.exec(
      trimmed,
    )
  if (yt?.[1]) return `https://www.youtube-nocookie.com/embed/${yt[1]}`
  const vimeo = /vimeo\.com\/(\d+)/.exec(trimmed)
  if (vimeo?.[1]) return `https://player.vimeo.com/video/${vimeo[1]}`
  return trimmed
}

function VideoArche({ data }: BlockProps<z.output<typeof videoArcheSchema>>) {
  const src = embedUrl(data.url)

  return (
    <div className="container-editorial">
      <figure className="mx-auto max-w-[56rem]">
        <Reveal>
          <div className="relative aspect-video w-full overflow-hidden rounded-[28px] bg-night">
            {src ? (
              <iframe
                src={src}
                title={data.title || 'Vidéo'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center">
                <Aster className="text-[28px] text-blue" />
              </div>
            )}
          </div>
        </Reveal>
        {data.caption && (
          <Reveal delay={0.12}>
            <figcaption className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
              {data.caption}
            </figcaption>
          </Reveal>
        )}
      </figure>
    </div>
  )
}

export const videoArcheBlock: BlockDefinition<typeof videoArcheSchema> = {
  label: 'Vidéo — Encadrée',
  description: 'Une vidéo YouTube ou Vimeo dans un cadre aux coins doux.',
  group: 'Sections',
  schema: videoArcheSchema,
  fields: [
    field.text('url', 'Lien de la vidéo', {
      full: true,
      placeholder: 'https://www.youtube.com/watch?v=…',
    }),
    field.text('title', 'Titre (accessibilité)'),
    field.text('caption', 'Légende', { full: true }),
  ],
  defaults: {
    url: 'https://vimeo.com/76979871',
    title: 'Le cabinet, en mouvement — quelques instants filmés',
    caption: 'Le cabinet, en mouvement',
  },
  Component: VideoArche,
}

/* ════════════════════════════════════════════════════════════════════
   Séparateur — L'astérisque
   La ponctuation entre deux sections : trois points bleus, un ✳ seul,
   ou un fin filet vertical.
   ════════════════════════════════════════════════════════════════════ */

export const separateurAsterisqueSchema = z.object({
  variant: z.enum(['points', 'asterisque', 'filet']).default('points'),
})

function SeparateurAsterisque({
  data,
}: BlockProps<z.output<typeof separateurAsterisqueSchema>>) {
  return (
    <div className="flex justify-center py-[var(--spacing-band)]">
      <Reveal>
        {data.variant === 'points' && <Dots />}
        {data.variant === 'asterisque' && (
          <Aster className="text-[22px] text-blue-deep" />
        )}
        {data.variant === 'filet' && (
          <span aria-hidden="true" className="block h-16 w-px bg-line-strong" />
        )}
      </Reveal>
    </div>
  )
}

export const separateurAsterisqueBlock: BlockDefinition<
  typeof separateurAsterisqueSchema
> = {
  label: 'Séparateur — Ponctuation',
  description: 'Trois points bleus, un ✳ seul, ou un fin filet vertical.',
  group: 'Sections',
  schema: separateurAsterisqueSchema,
  bleed: true,
  fields: [
    field.select('variant', 'Forme', [
      { value: 'points', label: 'Trois points' },
      { value: 'asterisque', label: 'Astérisque ✳' },
      { value: 'filet', label: 'Filet vertical' },
    ]),
  ],
  defaults: { variant: 'points' },
  Component: SeparateurAsterisque,
}

/* ════════════════════════════════════════════════════════════════════
   Citation — Soulignée
   Une phrase en grande serif, le mot-pivot en italique bleue
   soulignée, l'attribution en méta.
   ════════════════════════════════════════════════════════════════════ */

export const citationSouligneeSchema = z.object({
  quote: z.string().default(''),
  attribution: z.string().default(''),
})

function CitationSoulignee({
  data,
  ctx,
}: BlockProps<z.output<typeof citationSouligneeSchema>>) {
  if (!data.quote) return null

  return (
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="parole" />

      <figure className="mx-auto max-w-[54rem] text-center">
        <Reveal>
          <Aster className="text-[24px] text-blue-deep" />
        </Reveal>

        <blockquote className="mt-5">
          <Reveal delay={0.1}>
            <p className="font-serif text-[clamp(1.8rem,3.4vw,3.2rem)] font-light leading-[1.35] text-ink">
              <Underlined text={data.quote} />
            </p>
          </Reveal>
        </blockquote>

        {data.attribution && (
          <Reveal delay={0.22}>
            <figcaption className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
              {data.attribution}
            </figcaption>
          </Reveal>
        )}
      </figure>
    </div>
  )
}

export const citationSouligneeBlock: BlockDefinition<
  typeof citationSouligneeSchema
> = {
  label: 'Citation — Soulignée',
  description:
    'Une phrase en grande serif, le mot-pivot en italique bleue soulignée.',
  group: 'Sections',
  schema: citationSouligneeSchema,
  fields: [
    field.textarea('quote', 'Citation', {
      help: 'Astérisques pour le mot souligné : *de l’aide*.',
    }),
    field.text('attribution', 'Attribution', { full: true }),
  ],
  defaults: {
    quote: 'Le courage, c’est de demander *de l’aide*.',
    attribution: 'Anne Winzenried — Carnet du cabinet',
  },
  Component: CitationSoulignee,
}
