import Image from 'next/image'
import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { ActionLink } from '@/components/site/ActionLink'
import { Emphasis } from '@/components/site/Emphasis'
import { Eyebrow } from '@/components/site/Eyebrow'
import { BlockImage } from '@/components/site/BlockImage'
import { Prose } from '@/components/site/Prose'
import { Reveal } from '@/components/site/anim'
import { cn } from '@/lib/utils'

/**
 * Blocs de contenu fins — ceux qu'on dépose dans une colonne.
 *
 * Ils se distinguent des blocs de section : pas de conteneur, pas de
 * respiration verticale propre, aucune hypothèse sur la largeur disponible.
 * C'est ce qui leur permet de tenir aussi bien en pleine page que dans un
 * tiers de colonne.
 */

const align = {
  left: 'text-left',
  center: 'text-center mx-auto',
  right: 'text-right ml-auto',
} as const

const alignField = field.select('align', 'Alignement', [
  { value: 'left', label: 'Gauche' },
  { value: 'center', label: 'Centré' },
  { value: 'right', label: 'Droite' },
])

/* ── Titre ─────────────────────────────────────────────────────────── */

export const headingSchema = z.object({
  eyebrow: z.string().default(''),
  text: z.string().default(''),
  level: z.enum(['h2', 'h3']).default('h2'),
  size: z.enum(['large', 'medium', 'small']).default('medium'),
  align: z.enum(['left', 'center', 'right']).default('left'),
})

function Heading({ data, ctx }: BlockProps<z.output<typeof headingSchema>>) {
  if (!data.text && !data.eyebrow) return null

  const Tag = data.level
  const sizes = {
    large: 'text-[length:var(--text-h2)]',
    medium: 'text-[clamp(1.5rem,2.4vw,2.1rem)]',
    small: 'text-[length:var(--text-h3)]',
  } as const

  return (
    <Reveal className={cn('max-w-[36rem]', align[data.align])}>
      {data.eyebrow && <Eyebrow className="mb-6">{data.eyebrow}</Eyebrow>}
      {data.text && (
        <Tag
          className={sizes[data.size]}
          /* Édition en direct au double-clic, dans l'aperçu seulement. */
          data-edit-field={ctx.editable ? 'text' : undefined}
        >
          <Emphasis text={data.text} />
        </Tag>
      )}
    </Reveal>
  )
}

export const headingBlock: BlockDefinition<typeof headingSchema> = {
  label: 'Titre',
  description: 'Un titre, avec label optionnel au-dessus.',
  group: 'Contenu',
  inline: true,
  schema: headingSchema,
  fields: [
    field.text('eyebrow', 'Label au-dessus'),
    field.text('text', 'Titre', {
      full: true,
      help: 'Astérisques pour l’italique : *mot*.',
    }),
    field.select('level', 'Niveau', [
      { value: 'h2', label: 'H2 — titre de section' },
      { value: 'h3', label: 'H3 — sous-titre' },
    ]),
    field.select('size', 'Taille', [
      { value: 'large', label: 'Grande' },
      { value: 'medium', label: 'Moyenne' },
      { value: 'small', label: 'Petite' },
    ]),
    alignField,
  ],
  defaults: {
    eyebrow: '',
    text: 'Un titre',
    level: 'h2',
    size: 'medium',
    align: 'left',
  },
  Component: Heading,
}

/* ── Zone de texte ─────────────────────────────────────────────────── */

export const textSchema = z.object({
  body: z.string().default(''),
  size: z.enum(['lead', 'base']).default('base'),
  align: z.enum(['left', 'center', 'right']).default('left'),
})

function TextBlock({ data, ctx }: BlockProps<z.output<typeof textSchema>>) {
  if (!data.body.trim()) return null

  return (
    <Reveal className={cn('max-w-[34rem]', align[data.align])}>
      <div
        data-edit-field={ctx.editable ? 'body' : undefined}
        data-edit-multiline={ctx.editable ? 'true' : undefined}
      >
        <Prose text={data.body} size={data.size} />
      </div>
    </Reveal>
  )
}

export const textBlock: BlockDefinition<typeof textSchema> = {
  label: 'Zone de texte',
  description: 'Un ou plusieurs paragraphes.',
  group: 'Contenu',
  inline: true,
  schema: textSchema,
  fields: [
    field.richtext('body', 'Texte'),
    field.select('size', 'Taille', [
      { value: 'base', label: 'Courante' },
      { value: 'lead', label: 'Accroche' },
    ]),
    alignField,
  ],
  defaults: { body: '', size: 'base', align: 'left' },
  Component: TextBlock,
}

/* ── Image ─────────────────────────────────────────────────────────── */

export const imageSchema = z.object({
  mediaId: z.string().uuid().nullable().default(null),
  ratio: z.enum(['auto', 'portrait', 'square', 'landscape', 'wide']).default('landscape'),
  caption: z.string().default(''),
  rounded: z.boolean().default(false),
})

const ratios = {
  auto: '',
  portrait: 'aspect-3/4',
  square: 'aspect-square',
  landscape: 'aspect-4/3',
  wide: 'aspect-16/9',
} as const

function ImageBlock({ data, ctx }: BlockProps<z.output<typeof imageSchema>>) {
  const media = ctx.resolveMedia(data.mediaId)
  if (!media) return null

  /* `auto` respecte les proportions natives — sans hauteur imposée,
     `fill` ne fonctionne pas, on passe donc en image dimensionnée. */
  if (data.ratio === 'auto') {
    return (
      <Reveal>
        <figure>
          <Image
            src={media.url}
            alt={media.alt}
            width={media.width || 1200}
            height={media.height || 900}
            sizes="(max-width: 1024px) 100vw, 50vw"
            className={cn('h-auto w-full', data.rounded && 'rounded-[3px]')}
            {...(media.blurDataUrl
              ? { placeholder: 'blur' as const, blurDataURL: media.blurDataUrl }
              : {})}
          />
          {data.caption && <Caption>{data.caption}</Caption>}
        </figure>
      </Reveal>
    )
  }

  return (
    <figure>
      <BlockImage
        media={media}
        sizes="(max-width: 1024px) 100vw, 50vw"
        className={cn('w-full', ratios[data.ratio], data.rounded && 'rounded-[18px]')}
      />
      {data.caption && <Caption>{data.caption}</Caption>}
    </figure>
  )
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <figcaption className="mt-3.5 text-[0.8rem] text-stone">{children}</figcaption>
  )
}

export const imageBlock: BlockDefinition<typeof imageSchema> = {
  label: 'Image',
  description: 'Une image, avec légende optionnelle.',
  group: 'Contenu',
  inline: true,
  schema: imageSchema,
  fields: [
    field.media('mediaId', 'Image'),
    field.select('ratio', 'Format', [
      { value: 'auto', label: 'Proportions d’origine' },
      { value: 'portrait', label: 'Portrait 3:4' },
      { value: 'square', label: 'Carré' },
      { value: 'landscape', label: 'Paysage 4:3' },
      { value: 'wide', label: 'Panoramique 16:9' },
    ]),
    field.text('caption', 'Légende', { full: true }),
    field.boolean('rounded', 'Coins arrondis'),
  ],
  defaults: {
    mediaId: null,
    ratio: 'landscape',
    caption: '',
    rounded: false,
  },
  Component: ImageBlock,
}

/* ── Bouton ────────────────────────────────────────────────────────── */

export const buttonSchema = z.object({
  label: z.string().default(''),
  href: z.string().default('#contact'),
  variant: z.enum(['primary', 'outline', 'ghost']).default('primary'),
  align: z.enum(['left', 'center', 'right']).default('left'),
  external: z.boolean().default(false),
})

function ButtonBlock({ data, ctx }: BlockProps<z.output<typeof buttonSchema>>) {
  if (!data.label.trim()) return null

  return (
    <Reveal
      className={cn(
        'flex',
        data.align === 'center' && 'justify-center',
        data.align === 'right' && 'justify-end',
      )}
    >
      <ActionLink
        href={data.href}
        variant={data.variant}
        external={data.external}
      >
        <span data-edit-field={ctx.editable ? 'label' : undefined}>
          {data.label}
        </span>
      </ActionLink>
    </Reveal>
  )
}

export const buttonBlock: BlockDefinition<typeof buttonSchema> = {
  label: 'Bouton',
  description: 'Un appel à l’action isolé.',
  group: 'Contenu',
  inline: true,
  schema: buttonSchema,
  fields: [
    field.text('label', 'Libellé'),
    field.text('href', 'Lien', {
      help: 'Ancre interne (#contact) ou URL complète.',
    }),
    field.select('variant', 'Style', [
      { value: 'primary', label: 'Aplat bleu' },
      { value: 'outline', label: 'Contour' },
      { value: 'ghost', label: 'Texte seul' },
    ]),
    alignField,
    field.boolean('external', 'Ouvrir dans un nouvel onglet'),
  ],
  defaults: {
    label: 'Prendre rendez-vous',
    href: '#contact',
    variant: 'primary',
    align: 'left',
    external: false,
  },
  Component: ButtonBlock,
}

/* ── Liste ─────────────────────────────────────────────────────────── */

export const listSchema = z.object({
  title: z.string().default(''),
  numbered: z.boolean().default(false),
  items: z
    .array(z.object({ label: z.string(), text: z.string() }))
    .default([]),
})

function ListBlock({ data }: BlockProps<z.output<typeof listSchema>>) {
  if (data.items.length === 0) return null

  const Tag = data.numbered ? 'ol' : 'ul'

  return (
    <div className="max-w-[34rem]">
      {data.title && (
        <Reveal>
          <h3 className="mb-6 text-[length:var(--text-h3)]">{data.title}</h3>
        </Reveal>
      )}

      <Tag className="border-t border-line">
        {data.items.map((item, i) => (
          <Reveal key={i} delay={i * 0.05}>
            <li className="grid grid-cols-[auto_1fr] gap-5 border-b border-line py-5">
              <span className="font-serif text-[0.88rem] italic text-blue-deep">
                {data.numbered ? String(i + 1).padStart(2, '0') : '—'}
              </span>
              <span>
                {item.label && (
                  <span className="block font-serif text-[1.05rem] text-ink">
                    {item.label}
                  </span>
                )}
                {item.text && (
                  <span className="mt-1.5 block text-[0.9rem] leading-[1.7] text-ink-soft">
                    {item.text}
                  </span>
                )}
              </span>
            </li>
          </Reveal>
        ))}
      </Tag>
    </div>
  )
}

export const listBlock: BlockDefinition<typeof listSchema> = {
  label: 'Liste',
  description: 'Liste à puces ou numérotée, avec intitulés.',
  group: 'Contenu',
  inline: true,
  schema: listSchema,
  fields: [
    field.text('title', 'Titre', { full: true }),
    field.boolean('numbered', 'Numérotée'),
    field.list(
      'items',
      'Éléments',
      [field.text('label', 'Intitulé'), field.textarea('text', 'Description')],
      { addLabel: 'Ajouter un élément' },
    ),
  ],
  defaults: { title: '', numbered: false, items: [] },
  Component: ListBlock,
}
