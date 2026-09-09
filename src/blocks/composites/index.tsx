'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { ActionLink } from '@/components/site/ActionLink'
import { Reveal } from '@/components/site/anim'
import { cn } from '@/lib/utils'

/**
 * Composants composés — l'équivalent shadcn, traduit dans la charte AMASWI.
 *
 * Accordéon, onglets, tableau, avatar, encart, carte tarif, galerie, barre
 * de progression : tout ce qui fait un site complet, posable sur la grille
 * et personnalisable (contenu ici, apparence dans l'onglet Style).
 *
 * Fichier client : l'accordéon repose sur `<details>` natif, mais les
 * onglets ont besoin d'un état local.
 */

/* ── Accordéon ─────────────────────────────────────────────────────── */

export const accordeonSchema = z.object({
  items: z
    .array(z.object({ title: z.string(), text: z.string() }))
    .default([]),
  firstOpen: z.boolean().default(true),
})

function Accordeon({ data }: BlockProps<z.output<typeof accordeonSchema>>) {
  if (data.items.length === 0) return null
  return (
    <Reveal>
      <div className="border-t border-line">
        {data.items.map((item, i) => (
          <details
            key={i}
            open={data.firstOpen && i === 0}
            className="group border-b border-line"
          >
            <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden">
              <span className="font-serif text-[1.02rem] text-ink">
                {item.title}
              </span>
              <ChevronDown
                className="h-4 w-4 shrink-0 translate-y-0.5 text-stone transition-transform duration-300 group-open:rotate-180"
                strokeWidth={1.5}
              />
            </summary>
            <p className="pb-5 pr-8 text-[0.88rem] leading-[1.75] text-ink-soft">
              {item.text}
            </p>
          </details>
        ))}
      </div>
    </Reveal>
  )
}

export const accordeonBlock: BlockDefinition<typeof accordeonSchema> = {
  label: 'Accordéon',
  description: 'Questions dépliables — fonctionne sans JavaScript.',
  group: 'Contenu',
  inline: true,
  schema: accordeonSchema,
  fields: [
    field.list(
      'items',
      'Éléments',
      [field.text('title', 'Titre'), field.textarea('text', 'Contenu')],
      { addLabel: 'Ajouter un élément' },
    ),
    field.boolean('firstOpen', 'Premier élément ouvert'),
  ],
  defaults: {
    items: [
      { title: 'Une première question', text: 'Sa réponse, à rédiger.' },
      { title: 'Une seconde question', text: 'Sa réponse, à rédiger.' },
    ],
    firstOpen: true,
  },
  Component: Accordeon,
}

/* ── Onglets ───────────────────────────────────────────────────────── */

export const ongletsSchema = z.object({
  tabs: z
    .array(z.object({ label: z.string(), text: z.string() }))
    .default([]),
})

function Onglets({ data }: BlockProps<z.output<typeof ongletsSchema>>) {
  const [active, setActive] = useState(0)
  if (data.tabs.length === 0) return null
  const current = data.tabs[Math.min(active, data.tabs.length - 1)]

  return (
    <Reveal>
      <div role="tablist" className="flex flex-wrap gap-x-6 border-b border-line">
        {data.tabs.map((tab, i) => (
          <button
            key={i}
            role="tab"
            type="button"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={cn(
              'relative -mb-px pb-3 text-[0.8rem] uppercase tracking-[0.1em] transition-colors',
              i === active
                ? 'border-b border-ink text-ink'
                : 'text-stone hover:text-ink-soft',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {current && (
        <p className="pt-5 text-[0.9rem] leading-[1.75] text-ink-soft">
          {current.text}
        </p>
      )}
    </Reveal>
  )
}

export const ongletsBlock: BlockDefinition<typeof ongletsSchema> = {
  label: 'Onglets',
  description: 'Plusieurs contenus dans le même espace, un onglet par volet.',
  group: 'Contenu',
  inline: true,
  schema: ongletsSchema,
  fields: [
    field.list(
      'tabs',
      'Onglets',
      [field.text('label', 'Libellé'), field.textarea('text', 'Contenu')],
      { addLabel: 'Ajouter un onglet' },
    ),
  ],
  defaults: {
    tabs: [
      { label: 'Adultes', text: 'Le contenu du premier volet.' },
      { label: 'Adolescents', text: 'Le contenu du second volet.' },
    ],
  },
  Component: Onglets,
}

/* ── Avatar ────────────────────────────────────────────────────────── */

export const avatarSchema = z.object({
  mediaId: z.string().uuid().nullable().default(null),
  name: z.string().default(''),
  role: z.string().default(''),
  size: z.enum(['petit', 'moyen', 'grand']).default('moyen'),
})

const AVATAR_SIZES = {
  petit: 'h-10 w-10',
  moyen: 'h-14 w-14',
  grand: 'h-20 w-20',
} as const

function Avatar({ data, ctx }: BlockProps<z.output<typeof avatarSchema>>) {
  const media = ctx.resolveMedia(data.mediaId)
  if (!media && !data.name) return null

  return (
    <Reveal>
      <div className="flex items-center gap-3.5">
        {media ? (
          <Image
            src={media.url}
            alt={media.alt}
            width={160}
            height={160}
            className={cn('rounded-full object-cover', AVATAR_SIZES[data.size])}
          />
        ) : (
          <span
            aria-hidden="true"
            className={cn(
              'flex items-center justify-center rounded-full bg-blue-mist font-serif text-blue-deep',
              AVATAR_SIZES[data.size],
            )}
          >
            {data.name.charAt(0).toUpperCase()}
          </span>
        )}
        <span>
          {data.name && (
            <span
              data-edit-field={ctx.editable ? 'name' : undefined}
              className="block font-serif text-[0.98rem] text-ink"
            >
              {data.name}
            </span>
          )}
          {data.role && (
            <span className="block text-[0.76rem] text-stone">{data.role}</span>
          )}
        </span>
      </div>
    </Reveal>
  )
}

export const avatarBlock: BlockDefinition<typeof avatarSchema> = {
  label: 'Avatar',
  description: 'Photo ronde, nom et rôle — pour signer une section.',
  group: 'Contenu',
  inline: true,
  schema: avatarSchema,
  fields: [
    field.media('mediaId', 'Photo'),
    field.text('name', 'Nom'),
    field.text('role', 'Rôle'),
    field.select('size', 'Taille', [
      { value: 'petit', label: 'Petite' },
      { value: 'moyen', label: 'Moyenne' },
      { value: 'grand', label: 'Grande' },
    ]),
  ],
  defaults: { mediaId: null, name: 'Anne Winzeried', role: 'Thérapeute', size: 'moyen' },
  Component: Avatar,
}

/* ── Encart ────────────────────────────────────────────────────────── */

export const encartSchema = z.object({
  tone: z.enum(['bleu', 'sable', 'ambre']).default('bleu'),
  title: z.string().default(''),
  text: z.string().default(''),
})

const ENCART_TONES = {
  bleu: { bg: '#e3ecf1', title: '#2f4c5e', text: '#3d5768' },
  sable: { bg: '#f6f2ec', title: '#4a4239', text: '#615850' },
  ambre: { bg: '#f4ead7', title: '#6d5426', text: '#77613a' },
} as const

function Encart({ data, ctx }: BlockProps<z.output<typeof encartSchema>>) {
  if (!data.title && !data.text) return null
  const tone = ENCART_TONES[data.tone]

  return (
    <Reveal>
      <div className="rounded-[4px] p-5" style={{ backgroundColor: tone.bg }}>
        {data.title && (
          <p
            data-edit-field={ctx.editable ? 'title' : undefined}
            className="font-serif text-[0.98rem]"
            style={{ color: tone.title }}
          >
            {data.title}
          </p>
        )}
        {data.text && (
          <p
            className={cn('text-[0.85rem] leading-[1.7]', data.title && 'mt-1.5')}
            style={{ color: tone.text }}
          >
            {data.text}
          </p>
        )}
      </div>
    </Reveal>
  )
}

export const encartBlock: BlockDefinition<typeof encartSchema> = {
  label: 'Encart',
  description: 'Un pavé d’information mis en couleur — à savoir, précision, note.',
  group: 'Contenu',
  inline: true,
  schema: encartSchema,
  fields: [
    field.select('tone', 'Teinte', [
      { value: 'bleu', label: 'Bleu brume' },
      { value: 'sable', label: 'Sable' },
      { value: 'ambre', label: 'Ambre' },
    ]),
    field.text('title', 'Titre', { full: true }),
    field.textarea('text', 'Texte'),
  ],
  defaults: {
    tone: 'bleu',
    title: 'Bon à savoir',
    text: 'Une précision utile pour vos visiteurs.',
  },
  Component: Encart,
}

/* ── Carte tarif ───────────────────────────────────────────────────── */

export const tarifSchema = z.object({
  title: z.string().default(''),
  price: z.string().default(''),
  period: z.string().default(''),
  features: z.array(z.object({ text: z.string() })).default([]),
  ctaLabel: z.string().default(''),
  ctaHref: z.string().default('#contact'),
  highlight: z.boolean().default(false),
})

function Tarif({ data, ctx }: BlockProps<z.output<typeof tarifSchema>>) {
  if (!data.title && !data.price) return null

  return (
    <Reveal className="h-full">
      <div
        className={cn(
          'flex h-full flex-col rounded-[4px] border p-6',
          data.highlight
            ? 'border-blue-deep/40 bg-blue-mist/40'
            : 'border-line-strong',
        )}
      >
        {data.title && (
          <p
            data-edit-field={ctx.editable ? 'title' : undefined}
            className="text-[0.72rem] uppercase tracking-[0.14em] text-stone"
          >
            {data.title}
          </p>
        )}
        <p className="mt-3 font-serif text-[2rem] leading-none text-ink">
          {data.price}
          {data.period && (
            <span className="ml-1.5 font-sans text-[0.78rem] text-stone">
              {data.period}
            </span>
          )}
        </p>
        {data.features.length > 0 && (
          <ul className="mt-5 space-y-2">
            {data.features.map((f, i) => (
              <li
                key={i}
                className="grid grid-cols-[auto_1fr] gap-2.5 text-[0.85rem] leading-[1.6] text-ink-soft"
              >
                <span className="font-serif italic text-blue-deep">—</span>
                {f.text}
              </li>
            ))}
          </ul>
        )}
        {data.ctaLabel && (
          <div className="mt-auto pt-6">
            <ActionLink
              href={data.ctaHref}
              variant={data.highlight ? 'primary' : 'outline'}
            >
              {data.ctaLabel}
            </ActionLink>
          </div>
        )}
      </div>
    </Reveal>
  )
}

export const tarifBlock: BlockDefinition<typeof tarifSchema> = {
  label: 'Tarif',
  description: 'Une carte de prix : intitulé, montant, détails, bouton.',
  group: 'Contenu',
  inline: true,
  schema: tarifSchema,
  fields: [
    field.text('title', 'Intitulé'),
    field.text('price', 'Prix', { help: 'Ex. « 60 € »' }),
    field.text('period', 'Précision', { help: 'Ex. « / séance »' }),
    field.list('features', 'Détails', [field.text('text', 'Ligne')], {
      addLabel: 'Ajouter une ligne',
    }),
    field.text('ctaLabel', 'Libellé du bouton'),
    field.text('ctaHref', 'Lien du bouton'),
    field.boolean('highlight', 'Mise en avant'),
  ],
  defaults: {
    title: 'Séance individuelle',
    price: '60 €',
    period: '/ séance',
    features: [{ text: 'Durée : 1 heure' }, { text: 'Au cabinet ou en visio' }],
    ctaLabel: 'Prendre rendez-vous',
    ctaHref: '#contact',
    highlight: false,
  },
  Component: Tarif,
}

/* ── Galerie ───────────────────────────────────────────────────────── */

export const galerieSchema = z.object({
  mediaIds: z.array(z.string().uuid()).default([]),
  cols: z.coerce.number().int().min(2).max(4).default(3),
  ratio: z.enum(['carre', 'paysage', 'portrait']).default('carre'),
})

const GALERIE_RATIOS = {
  carre: 'aspect-square',
  paysage: 'aspect-4/3',
  portrait: 'aspect-3/4',
} as const

function Galerie({ data, ctx }: BlockProps<z.output<typeof galerieSchema>>) {
  const medias = data.mediaIds
    .map((id) => ctx.resolveMedia(id))
    .filter((m): m is NonNullable<typeof m> => m !== null)
  if (medias.length === 0) return null

  return (
    <Reveal>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${data.cols},minmax(0,1fr))` }}
      >
        {medias.map((media) => (
          <div
            key={media.id}
            className={cn('overflow-hidden rounded-[3px]', GALERIE_RATIOS[data.ratio])}
          >
            <Image
              src={media.url}
              alt={media.alt}
              width={media.width || 600}
              height={media.height || 600}
              sizes="(max-width: 1024px) 50vw, 25vw"
              className="h-full w-full object-cover"
              {...(media.blurDataUrl
                ? { placeholder: 'blur' as const, blurDataURL: media.blurDataUrl }
                : {})}
            />
          </div>
        ))}
      </div>
    </Reveal>
  )
}

export const galerieBlock: BlockDefinition<typeof galerieSchema> = {
  label: 'Galerie',
  description: 'Une grille d’images, de deux à quatre colonnes.',
  group: 'Contenu',
  inline: true,
  schema: galerieSchema,
  fields: [
    field.mediaList('mediaIds', 'Images'),
    field.select('cols', 'Colonnes', [
      { value: '2', label: 'Deux' },
      { value: '3', label: 'Trois' },
      { value: '4', label: 'Quatre' },
    ]),
    field.select('ratio', 'Format', [
      { value: 'carre', label: 'Carré' },
      { value: 'paysage', label: 'Paysage 4:3' },
      { value: 'portrait', label: 'Portrait 3:4' },
    ]),
  ],
  defaults: { mediaIds: [], cols: 3, ratio: 'carre' },
  Component: Galerie,
}

/* ── Barre ─────────────────────────────────────────────────────────── */

export const barreSchema = z.object({
  label: z.string().default(''),
  percent: z.coerce.number().int().min(0).max(100).default(70),
})

function Barre({ data, ctx }: BlockProps<z.output<typeof barreSchema>>) {
  return (
    <Reveal>
      {data.label && (
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <span
            data-edit-field={ctx.editable ? 'label' : undefined}
            className="text-[0.8rem] text-ink"
          >
            {data.label}
          </span>
          <span className="text-[0.72rem] text-stone">{data.percent} %</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={data.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-[3px] w-full overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-blue-deep transition-[width] duration-700 ease-out"
          style={{ width: `${data.percent}%` }}
        />
      </div>
    </Reveal>
  )
}

export const barreBlock: BlockDefinition<typeof barreSchema> = {
  label: 'Barre',
  description: 'Une jauge fine — progression, répartition, intensité.',
  group: 'Contenu',
  inline: true,
  schema: barreSchema,
  fields: [
    field.text('label', 'Libellé'),
    field.number('percent', 'Pourcentage'),
  ],
  defaults: { label: 'Accompagnement individuel', percent: 70 },
  Component: Barre,
}

/* ── Tableau ───────────────────────────────────────────────────────── */

export const tableauSchema = z.object({
  headers: z.string().default(''),
  rows: z.string().default(''),
})

/** « a | b | c » par ligne — un tableau sans en apprendre la syntaxe. */
function parseRows(input: string): string[][] {
  return input
    .split('\n')
    .map((line) => line.split('|').map((cell) => cell.trim()))
    .filter((cells) => cells.some(Boolean))
}

function Tableau({ data }: BlockProps<z.output<typeof tableauSchema>>) {
  const headers = data.headers
    .split(/[|,]/)
    .map((h) => h.trim())
    .filter(Boolean)
  const rows = parseRows(data.rows)
  if (headers.length === 0 && rows.length === 0) return null

  return (
    <Reveal>
      <table className="w-full border-collapse text-left">
        {headers.length > 0 && (
          <thead>
            <tr className="border-b border-line-strong">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="py-2.5 pr-4 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-stone"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((cells, r) => (
            <tr key={r} className="border-b border-line">
              {cells.map((cell, c) => (
                <td
                  key={c}
                  className={cn(
                    'py-3 pr-4 text-[0.86rem] leading-[1.6]',
                    c === 0 ? 'text-ink' : 'text-ink-soft',
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Reveal>
  )
}

export const tableauBlock: BlockDefinition<typeof tableauSchema> = {
  label: 'Tableau',
  description: 'Lignes et colonnes — tarifs, comparatifs, horaires détaillés.',
  group: 'Contenu',
  inline: true,
  schema: tableauSchema,
  fields: [
    field.text('headers', 'En-têtes', {
      full: true,
      help: 'Séparées par | — ex. « Prestation | Durée | Tarif »',
    }),
    field.textarea('rows', 'Lignes', {
      help: 'Une ligne par rangée, cellules séparées par | .',
    }),
  ],
  defaults: {
    headers: 'Prestation | Durée | Tarif',
    rows: 'Séance individuelle | 1 h | 60 €\nSéance couple | 1 h 30 | 90 €',
  },
  Component: Tableau,
}
