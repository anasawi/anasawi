import { z } from 'zod'

import { field } from '../field'
import { toParagraphs, type BlockDefinition, type BlockProps } from '../types'
import { MaskLines, Reveal, WordsIgnite } from '@/components/site/anim'
import { ActionLink } from '@/components/site/ActionLink'
import { BlockImage } from '@/components/site/BlockImage'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { Parallax } from '@/components/site/Parallax'
import { Aster, SectionIndex } from '@/components/site/ornaments'

/*
 * Sections éditoriales — les respirations typographiques du site.
 */

/**
 * Le manifeste de la maquette : les mots s'allument un à un, et les
 * passages entre astérisques deviennent l'italique bleue soulignée.
 * Les segments partagent une seule horloge — l'allumage reste continu.
 */
export function IgniteEmphasis({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const parts = text.split(/(\*[^*]+\*)/g).filter((part) => part.trim().length > 0)
  let words = 0

  return (
    <p className={className}>
      {parts.map((part, i) => {
        const em = part.startsWith('*') && part.endsWith('*') && part.length > 2
        const raw = (em ? part.slice(1, -1) : part).trim()
        const delay = 0.18 + words * 0.065
        words += raw.split(/\s+/).filter(Boolean).length

        return (
          <span key={i}>
            {i > 0 ? ' ' : null}
            <WordsIgnite
              as="span"
              text={raw}
              delay={delay}
              className={
                em
                  ? 'border-b-2 border-blue pb-0.5 italic text-blue-deep'
                  : undefined
              }
            />
          </span>
        )
      })}
    </p>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Éditorial — Texte centré
   Le manifeste doux : ✳, une déclaration serif centrée, un paragraphe
   d'appui, un lien discret. Respiration entre deux sections denses.
   ════════════════════════════════════════════════════════════════════ */

export const texteCentreSchema = z.object({
  eyebrow: z.string().default(''),
  statement: z.string().default(''),
  text: z.string().default(''),
  label: z.string().default(''),
  href: z.string().default('#contact'),
})

function TexteCentre({
  data,
  ctx,
}: BlockProps<z.output<typeof texteCentreSchema>>) {
  return (
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="respiration" />

      <div className="mx-auto max-w-[46rem] text-center">
        <Reveal>
          <Aster className="text-[24px] text-blue-deep" />
        </Reveal>

        {data.statement && (
          <Reveal delay={0.1}>
            <p className="mt-5 font-serif text-[clamp(1.6rem,3vw,2.7rem)] font-light leading-[1.42] text-ink">
              <Emphasis text={data.statement} />
            </p>
          </Reveal>
        )}

        {data.text && (
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-[52ch] text-[15px] leading-[1.9] text-ink-soft">
              {data.text}
            </p>
          </Reveal>
        )}

        {data.eyebrow && (
          <Reveal delay={0.28}>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
              {data.eyebrow}
            </p>
          </Reveal>
        )}

        {data.label && (
          <Reveal delay={0.34}>
            <div className="mt-8 flex justify-center">
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
  description:
    'Le manifeste doux : ✳, déclaration serif centrée, paragraphe d’appui.',
  group: 'Sections',
  schema: texteCentreSchema,
  fields: [
    field.textarea('statement', 'Déclaration', {
      help: 'Astérisques pour l’italique : *mot*.',
    }),
    field.textarea('text', 'Paragraphe d’appui'),
    field.text('eyebrow', 'Petit label sous le texte', {
      placeholder: 'L’essentiel',
    }),
    field.text('label', 'Lien — libellé'),
    field.text('href', 'Lien — destination'),
  ],
  defaults: {
    eyebrow: 'L’essentiel',
    statement:
      'On ne guérit pas en allant plus vite. On guérit en s’accordant enfin le *temps*.',
    text: 'C’est souvent la première chose que l’on redécouvre ici : le droit de ralentir, d’écouter ce qui se passe en soi, sans obligation de résultat. Les séances durent 50 minutes, au cabinet ou en visio, et l’on avance au rythme qui est le vôtre.',
    label: 'Découvrir l’approche',
    href: '/approche',
  },
  Component: TexteCentre,
}

/* ════════════════════════════════════════════════════════════════════
   Éditorial — Manifeste (proposition H de la planche)
   ✳, une conviction en très grande serif dont les mots s'allument un
   à un — le passage entre astérisques souligné de bleu — et un méta
   discret en dessous.
   ════════════════════════════════════════════════════════════════════ */

export const manifesteSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  body: z.string().default(''),
})

function Manifeste({ data, ctx }: BlockProps<z.output<typeof manifesteSchema>>) {
  /* `title` porte la conviction ; `body` (héritage) sert de repli. */
  const statement = data.title.trim() || toParagraphs(data.body)[0] || ''

  return (
    <div className="container-editorial relative text-center">
      <SectionIndex index={ctx.index} label="conviction" />

      <Reveal>
        <Aster className="text-[26px] text-blue-deep" />
      </Reveal>

      {statement && (
        <div className="mx-auto mt-5 max-w-[64rem]">
          <IgniteEmphasis
            text={statement}
            className="font-serif text-[clamp(30px,3.6vw,58px)] font-light leading-[1.42] text-ink"
          />
        </div>
      )}

      {data.eyebrow && (
        <Reveal delay={0.3}>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
            {data.eyebrow}
          </p>
        </Reveal>
      )}
    </div>
  )
}

export const manifesteBlock: BlockDefinition<typeof manifesteSchema> = {
  label: 'Éditorial — Manifeste',
  description:
    'Une conviction en très grande serif dont les mots s’allument un à un.',
  group: 'Sections',
  schema: manifesteSchema,
  fields: [
    field.textarea('title', 'La conviction', {
      help: 'Astérisques pour le mot-pivot souligné : *s’entendent*.',
    }),
    field.text('eyebrow', 'Petit label sous le texte', {
      placeholder: 'Ma conviction',
    }),
  ],
  defaults: {
    eyebrow: 'Ma conviction',
    title:
      'On ne répare pas les gens. On les écoute, jusqu’à ce qu’ils *s’entendent* à nouveau eux-mêmes.',
    body: 'On ne répare pas les gens. On les écoute, jusqu’à ce qu’ils *s’entendent* à nouveau eux-mêmes.\n\nÉcouter sans juger, laisser le temps faire son travail, garder pour soi ce qui a été confié : c’est toute la pratique, et c’est déjà beaucoup.',
  },
  Component: Manifeste,
}

/* ════════════════════════════════════════════════════════════════════
   Le lieu — Arches sœurs (proposition E de la planche)
   Deux arches côte à côte (1.2fr / 1fr, gap 18px), la seconde
   remontée de 12 %, légende méta dessous ; à droite, le titre serif
   en lignes masquées, le texte d'appui et le lien méta souligné.
   ════════════════════════════════════════════════════════════════════ */

export const lieuArchesSchema = z.object({
  eyebrow: z.string().default(''),
  titleLines: z.array(z.object({ text: z.string() })).default([]),
  text: z.string().default(''),
  caption: z.string().default(''),
  linkLabel: z.string().default(''),
  linkHref: z.string().default('#contact'),
  mediaId: z.string().uuid().nullable().default(null),
  secondMediaId: z.string().uuid().nullable().default(null),
})

function LieuArches({
  data,
  ctx,
}: BlockProps<z.output<typeof lieuArchesSchema>>) {
  const first = ctx.resolveMedia(data.mediaId)
  const second = ctx.resolveMedia(data.secondMediaId)
  const lines = data.titleLines.map((l) => l.text).filter(Boolean)

  return (
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="le lieu" />

      <div className="grid grid-cols-1 items-center gap-10 md:gap-12 lg:grid-cols-12 lg:gap-x-5">
        {/* Les deux arches sœurs — 1.2fr / 1fr, la seconde remontée.
            Mobile : les deux restent côte à côte (164/136px à 360px). */}
        <div className="grid grid-cols-[1.2fr_1fr] items-end gap-4 md:gap-5 lg:col-span-6">
          {/* Parallaxe croisée : la grande monte, la petite traîne. */}
          <Parallax speed={-0.07}>
            <BlockImage
              media={first}
              sizes="(max-width: 1024px) 50vw, 28vw"
              className="aspect-[3/4.4] w-full rounded-arch"
              placeholder={0}
            />
          </Parallax>
          <Parallax speed={0.06} className="mb-[12%]">
            <BlockImage
              media={second}
              sizes="(max-width: 1024px) 42vw, 22vw"
              className="aspect-[3/3.6] w-full rounded-arch"
              placeholder={2}
              delay={0.2}
            />
          </Parallax>
          {data.caption && (
            <Reveal delay={0.3} className="col-span-2">
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
                {data.caption}
              </p>
            </Reveal>
          )}
        </div>

        <div className="lg:col-span-5 lg:col-start-8">
          {data.eyebrow && (
            <Reveal>
              <Eyebrow>{data.eyebrow}</Eyebrow>
            </Reveal>
          )}

          {lines.length > 0 && (
            <h2 className="mt-5 font-serif text-[clamp(30px,3.2vw,52px)] font-light leading-[1.15] text-ink">
              <MaskLines delay={0.1}>
                {lines.map((line, i) => (
                  <span key={i}>
                    <Emphasis text={line} />
                  </span>
                ))}
              </MaskLines>
            </h2>
          )}

          {data.text && (
            <Reveal delay={0.2}>
              <p className="mt-6 max-w-[40ch] text-[15px] leading-[1.9] text-ink-soft">
                {data.text}
              </p>
            </Reveal>
          )}

          {data.linkLabel && (
            <Reveal delay={0.3}>
              <p className="mt-8">
                <a
                  href={data.linkHref}
                  className="inline-block border-b border-blue pb-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-deep transition-colors duration-300 hover:text-night"
                >
                  {data.linkLabel} →
                </a>
              </p>
            </Reveal>
          )}
        </div>
      </div>
    </div>
  )
}

export const lieuArchesBlock: BlockDefinition<typeof lieuArchesSchema> = {
  label: 'Le lieu — Arches sœurs',
  description:
    'Deux arches côte à côte, la seconde remontée, titre serif et lien méta — la section « cabinet » de la planche.',
  group: 'Sections',
  schema: lieuArchesSchema,
  suggestedAnchor: 'cabinet',
  navigable: true,
  fields: [
    field.text('eyebrow', 'Label supérieur', { placeholder: 'Le lieu' }),
    field.list(
      'titleLines',
      'Titre — une entrée par ligne',
      [field.text('text', 'Ligne', { full: true })],
      {
        addLabel: 'Ajouter une ligne',
        help: 'Astérisques pour l’italique : à une *maison*.',
      },
    ),
    field.textarea('text', 'Texte d’appui'),
    field.media('mediaId', 'Première arche'),
    field.media('secondMediaId', 'Seconde arche (remontée)'),
    field.text('caption', 'Légende sous les arches', { full: true }),
    field.text('linkLabel', 'Lien — libellé'),
    field.text('linkHref', 'Lien — destination'),
  ],
  defaults: {
    eyebrow: 'Le lieu',
    titleLines: [
      { text: 'Un cabinet' },
      { text: 'qui ressemble' },
      { text: 'à une *maison*.' },
    ],
    text: 'Pas de blouse blanche, pas de divan intimidant. Un fauteuil, du thé, la lumière du matin et le temps qu’il faut. Le cabinet se trouve 6 rue Saint-Martin à Cesson-Sévigné, à quelques minutes de Rennes, facile d’accès.',
    caption: 'Le cabinet — 6 rue Saint-Martin, Cesson-Sévigné',
    linkLabel: 'Découvrir le lieu',
    linkHref: '/le-cabinet',
    mediaId: null,
    secondMediaId: null,
  },
  Component: LieuArches,
}

/* ════════════════════════════════════════════════════════════════════
   Éditorial — La grande arche
   Une très grande image en arche, presque pleine page, dévoilée par
   le rideau. Titre en surimpression douce, légende en méta.
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
    <div className="container-editorial relative">
      <SectionIndex index={ctx.index} label="en images" />

      <div className="relative">
        <BlockImage
          media={image}
          sizes="(max-width: 768px) 92vw, 88vw"
          className="aspect-[3/3.4] w-full rounded-t-[min(240px,26vw)] rounded-b-[28px] sm:aspect-[16/9] md:aspect-[21/9] md:rounded-t-[min(240px,19vw)]"
        />

        {data.title && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-[28px] bg-gradient-to-t from-black/45 to-transparent px-5 pb-6 pt-20 text-center sm:px-8 sm:pb-8 sm:pt-24 md:px-12">
            <p className="font-serif text-[clamp(1.3rem,2.2vw,1.9rem)] font-light leading-[1.25] text-white/95">
              <Emphasis text={data.title} />
            </p>
          </div>
        )}
      </div>

      {data.caption && (
        <Reveal delay={0.1}>
          <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-stone">
            {data.caption}
          </p>
        </Reveal>
      )}
    </div>
  )
}

export const imagePleineBlock: BlockDefinition<typeof imagePleineSchema> = {
  label: 'Éditorial — La grande arche',
  description: 'Une immense image en arche, titre en surimpression douce.',
  group: 'Sections',
  schema: imagePleineSchema,
  fields: [
    field.text('title', 'Titre superposé', {
      full: true,
      help: 'Optionnel — affiché en bas de l’image.',
    }),
    field.text('caption', 'Légende', { full: true }),
    field.media('mediaId', 'Image'),
  ],
  defaults: {
    title: 'Le cabinet, un lieu pensé pour le *calme*.',
    caption: 'La salle d’attente — lumière du matin',
    mediaId: null,
  },
  Component: ImagePleine,
}
