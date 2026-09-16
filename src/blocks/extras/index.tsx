import Image from 'next/image'
import {
  Anchor,
  Feather,
  Flower2,
  Heart,
  Leaf,
  Shield,
  Smile,
  Sparkles,
  Star,
  Sun,
  Waves,
} from 'lucide-react'
import { z } from 'zod'

import { field } from '../field'
import type { BlockDefinition, BlockProps } from '../types'
import { ActionLink } from '@/components/site/ActionLink'
import { Reveal } from '@/components/site/anim'
import { cn } from '@/lib/utils'

/**
 * Bibliothèque étendue de blocs de contenu.
 *
 * Tout ce dont un vrai site a besoin, dans le langage ANASAWI (serif
 * éditoriale, encres du thème de section, filets fins) — jamais des
 * composants « d'app ». Chaque bloc est `inline` : il se pose sur la
 * grille, se déplace, se redimensionne, se restyle.
 *
 * Les blocs CONNECTÉS (coordonnées, horaires, réseaux) lisent les
 * réglages du site : modifier le téléphone dans Paramètres met à jour
 * chaque exemplaire posé, partout.
 */

/* ── Badge ─────────────────────────────────────────────────────────── */

export const badgeSchema = z.object({
  label: z.string().default(''),
  tone: z.enum(['bleu', 'contour', 'encre']).default('bleu'),
})

function Badge({ data, ctx }: BlockProps<z.output<typeof badgeSchema>>) {
  if (!data.label.trim()) return null
  const tones = {
    bleu: 'bg-blue-mist text-blue-ink',
    contour: 'border border-line-strong text-ink-soft',
    encre: 'bg-ink text-background',
  } as const

  return (
    <Reveal>
      <span
        data-edit-field={ctx.editable ? 'label' : undefined}
        className={cn(
          'inline-block rounded-full px-3.5 py-1.5 text-[0.68rem] font-medium uppercase tracking-[0.14em]',
          tones[data.tone],
        )}
      >
        {data.label}
      </span>
    </Reveal>
  )
}

export const badgeBlock: BlockDefinition<typeof badgeSchema> = {
  label: 'Badge',
  description: 'Une petite étiquette — « Sur rendez-vous », « Nouveau »…',
  group: 'Contenu',
  inline: true,
  schema: badgeSchema,
  fields: [
    field.text('label', 'Texte'),
    field.select('tone', 'Style', [
      { value: 'bleu', label: 'Bleu brume' },
      { value: 'contour', label: 'Contour' },
      { value: 'encre', label: 'Encre pleine' },
    ]),
  ],
  defaults: { label: 'Sur rendez-vous', tone: 'bleu' },
  Component: Badge,
}

/* ── Citation ──────────────────────────────────────────────────────── */

export const citationSchema = z.object({
  text: z.string().default(''),
  author: z.string().default(''),
  align: z.enum(['left', 'center']).default('left'),
})

function Citation({ data, ctx }: BlockProps<z.output<typeof citationSchema>>) {
  if (!data.text.trim()) return null
  return (
    <Reveal className={cn(data.align === 'center' && 'text-center')}>
      <blockquote>
        <p
          data-edit-field={ctx.editable ? 'text' : undefined}
          className="font-serif text-[clamp(1.15rem,1.8vw,1.5rem)] italic leading-[1.5] text-ink"
        >
          « {data.text} »
        </p>
        {data.author && (
          <footer className="mt-3 text-[0.78rem] uppercase tracking-[0.12em] text-stone">
            — {data.author}
          </footer>
        )}
      </blockquote>
    </Reveal>
  )
}

export const citationBlock: BlockDefinition<typeof citationSchema> = {
  label: 'Citation',
  description: 'Une phrase en exergue, avec auteur optionnel.',
  group: 'Contenu',
  inline: true,
  schema: citationSchema,
  fields: [
    field.textarea('text', 'Citation'),
    field.text('author', 'Auteur'),
    field.select('align', 'Alignement', [
      { value: 'left', label: 'Gauche' },
      { value: 'center', label: 'Centré' },
    ]),
  ],
  defaults: {
    text: 'Ce qui ne peut se dire trouve parfois à se déposer.',
    author: '',
    align: 'left',
  },
  Component: Citation,
}

/* ── Chiffre clé ───────────────────────────────────────────────────── */

export const statSchema = z.object({
  value: z.string().default(''),
  label: z.string().default(''),
  align: z.enum(['left', 'center']).default('left'),
})

function Stat({ data }: BlockProps<z.output<typeof statSchema>>) {
  if (!data.value.trim()) return null
  return (
    <Reveal className={cn(data.align === 'center' && 'text-center')}>
      <p className="font-serif text-[clamp(2.2rem,4vw,3.4rem)] leading-none text-blue-deep">
        {data.value}
      </p>
      {data.label && (
        <p className="mt-2 text-[0.8rem] uppercase tracking-[0.12em] text-stone">
          {data.label}
        </p>
      )}
    </Reveal>
  )
}

export const statBlock: BlockDefinition<typeof statSchema> = {
  label: 'Chiffre clé',
  description: 'Un grand nombre et sa légende — « 15 ans d’expérience ».',
  group: 'Contenu',
  inline: true,
  schema: statSchema,
  fields: [
    field.text('value', 'Valeur', { help: 'Ex. « 15 ans », « + de 200 »' }),
    field.text('label', 'Légende'),
    field.select('align', 'Alignement', [
      { value: 'left', label: 'Gauche' },
      { value: 'center', label: 'Centré' },
    ]),
  ],
  defaults: { value: '15 ans', label: 'd’accompagnement', align: 'left' },
  Component: Stat,
}

/* ── Carte ─────────────────────────────────────────────────────────── */

export const carteSchema = z.object({
  mediaId: z.string().uuid().nullable().default(null),
  ratio: z.enum(['landscape', 'portrait', 'square']).default('landscape'),
  title: z.string().default(''),
  text: z.string().default(''),
  linkLabel: z.string().default(''),
  href: z.string().default('#contact'),
})

const carteRatios = {
  landscape: 'aspect-4/3',
  portrait: 'aspect-3/4',
  square: 'aspect-square',
} as const

function Carte({ data, ctx }: BlockProps<z.output<typeof carteSchema>>) {
  const media = ctx.resolveMedia(data.mediaId)
  if (!media && !data.title && !data.text) return null

  return (
    <Reveal>
      <div className="group">
        {media && (
          <div className={cn('overflow-hidden rounded-[3px]', carteRatios[data.ratio])}>
            <Image
              src={media.url}
              alt={media.alt}
              width={media.width || 900}
              height={media.height || 675}
              sizes="(max-width: 1024px) 100vw, 33vw"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              {...(media.blurDataUrl
                ? { placeholder: 'blur' as const, blurDataURL: media.blurDataUrl }
                : {})}
            />
          </div>
        )}
        {data.title && (
          <h3
            data-edit-field={ctx.editable ? 'title' : undefined}
            className="mt-4 font-serif text-[1.1rem] text-ink"
          >
            {data.title}
          </h3>
        )}
        {data.text && (
          <p className="mt-2 text-[0.88rem] leading-[1.7] text-ink-soft">
            {data.text}
          </p>
        )}
        {data.linkLabel && (
          <div className="mt-3.5">
            <ActionLink href={data.href} variant="ghost">
              {data.linkLabel}
            </ActionLink>
          </div>
        )}
      </div>
    </Reveal>
  )
}

export const carteBlock: BlockDefinition<typeof carteSchema> = {
  label: 'Carte',
  description: 'Image, titre, texte et lien — la brique des vitrines.',
  group: 'Contenu',
  inline: true,
  schema: carteSchema,
  fields: [
    field.media('mediaId', 'Image'),
    field.select('ratio', 'Format de l’image', [
      { value: 'landscape', label: 'Paysage 4:3' },
      { value: 'portrait', label: 'Portrait 3:4' },
      { value: 'square', label: 'Carré' },
    ]),
    field.text('title', 'Titre', { full: true }),
    field.textarea('text', 'Texte'),
    field.text('linkLabel', 'Libellé du lien'),
    field.text('href', 'Lien'),
  ],
  defaults: {
    mediaId: null,
    ratio: 'landscape',
    title: 'Un titre de carte',
    text: 'Deux ou trois phrases pour présenter ce contenu.',
    linkLabel: '',
    href: '#contact',
  },
  Component: Carte,
}

/* ── Atout (icône + texte) ─────────────────────────────────────────── */

const ICONS = {
  fleur: Flower2,
  feuille: Leaf,
  coeur: Heart,
  soleil: Sun,
  etoile: Star,
  etincelles: Sparkles,
  bouclier: Shield,
  sourire: Smile,
  plume: Feather,
  vagues: Waves,
  ancre: Anchor,
} as const

export const atoutSchema = z.object({
  icon: z
    .enum(['fleur', 'feuille', 'coeur', 'soleil', 'etoile', 'etincelles', 'bouclier', 'sourire', 'plume', 'vagues', 'ancre'])
    .default('feuille'),
  title: z.string().default(''),
  text: z.string().default(''),
})

function Atout({ data, ctx }: BlockProps<z.output<typeof atoutSchema>>) {
  const Icon = ICONS[data.icon]
  if (!data.title && !data.text) return null
  return (
    <Reveal>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-mist">
        <Icon className="h-4 w-4 text-blue-deep" strokeWidth={1.5} />
      </div>
      {data.title && (
        <h3
          data-edit-field={ctx.editable ? 'title' : undefined}
          className="mt-3.5 font-serif text-[1.02rem] text-ink"
        >
          {data.title}
        </h3>
      )}
      {data.text && (
        <p className="mt-1.5 text-[0.86rem] leading-[1.7] text-ink-soft">
          {data.text}
        </p>
      )}
    </Reveal>
  )
}

export const atoutBlock: BlockDefinition<typeof atoutSchema> = {
  label: 'Atout',
  description: 'Icône, titre et courte description — pour trois points côte à côte.',
  group: 'Contenu',
  inline: true,
  schema: atoutSchema,
  fields: [
    field.select(
      'icon',
      'Icône',
      Object.keys(ICONS).map((k) => ({
        value: k,
        label: k.charAt(0).toUpperCase() + k.slice(1),
      })),
    ),
    field.text('title', 'Titre', { full: true }),
    field.textarea('text', 'Texte'),
  ],
  defaults: {
    icon: 'feuille',
    title: 'Un cadre sûr',
    text: 'Une phrase pour développer ce point.',
  },
  Component: Atout,
}

/* ── Témoignage ────────────────────────────────────────────────────── */

export const temoignageSchema = z.object({
  quote: z.string().default(''),
  name: z.string().default(''),
  role: z.string().default(''),
  mediaId: z.string().uuid().nullable().default(null),
})

function Temoignage({ data, ctx }: BlockProps<z.output<typeof temoignageSchema>>) {
  if (!data.quote.trim()) return null
  const media = ctx.resolveMedia(data.mediaId)

  return (
    <Reveal>
      <figure className="border-l-2 border-blue-deep/30 pl-5">
        <blockquote
          data-edit-field={ctx.editable ? 'quote' : undefined}
          data-edit-multiline={ctx.editable ? 'true' : undefined}
          className="font-serif text-[1.02rem] italic leading-[1.65] text-ink"
        >
          « {data.quote} »
        </blockquote>
        {(data.name || media) && (
          <figcaption className="mt-4 flex items-center gap-3">
            {media && (
              <Image
                src={media.url}
                alt={media.alt}
                width={72}
                height={72}
                className="h-9 w-9 rounded-full object-cover"
              />
            )}
            <span>
              {data.name && (
                <span className="block text-[0.82rem] text-ink">{data.name}</span>
              )}
              {data.role && (
                <span className="block text-[0.72rem] text-stone">{data.role}</span>
              )}
            </span>
          </figcaption>
        )}
      </figure>
    </Reveal>
  )
}

export const temoignageBlock: BlockDefinition<typeof temoignageSchema> = {
  label: 'Témoignage',
  description: 'Une parole reçue, avec nom et visage optionnels.',
  group: 'Contenu',
  inline: true,
  schema: temoignageSchema,
  fields: [
    field.textarea('quote', 'Témoignage'),
    field.text('name', 'Nom'),
    field.text('role', 'Précision', { help: 'Ex. « Accompagnée depuis 2023 »' }),
    field.media('mediaId', 'Photo (optionnelle)'),
  ],
  defaults: { quote: 'Un témoignage à recueillir.', name: '', role: '', mediaId: null },
  Component: Temoignage,
}

/* ── Vidéo ─────────────────────────────────────────────────────────── */

export const videoSchema = z.object({
  url: z.string().default(''),
  title: z.string().default(''),
})

/** Extrait un lecteur embarquable d'une URL YouTube ou Vimeo — rien
    d'autre : pas d'iframe arbitraire, pas d'injection possible. */
function embedSrc(url: string): string | null {
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,20})/,
  )
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return null
}

function Video({ data, ctx }: BlockProps<z.output<typeof videoSchema>>) {
  const src = embedSrc(data.url.trim())

  if (!src) {
    if (!ctx.editable) return null
    return (
      <div className="flex h-full min-h-24 items-center justify-center rounded-[3px] border border-dashed border-line-strong p-4 text-center text-[0.78rem] text-stone">
        Collez un lien YouTube ou Vimeo dans le panneau de droite.
      </div>
    )
  }

  return (
    <iframe
      src={src}
      title={data.title || 'Vidéo'}
      loading="lazy"
      allow="accelerometer; encrypted-media; picture-in-picture"
      allowFullScreen
      className="h-full w-full rounded-[3px] border-0"
    />
  )
}

export const videoBlock: BlockDefinition<typeof videoSchema> = {
  label: 'Vidéo',
  description: 'Un lecteur YouTube ou Vimeo, à la taille de ses cellules.',
  group: 'Contenu',
  inline: true,
  schema: videoSchema,
  fields: [
    field.text('url', 'Lien de la vidéo', {
      full: true,
      help: 'YouTube ou Vimeo — l’URL de la page suffit.',
    }),
    field.text('title', 'Titre (accessibilité)'),
  ],
  defaults: { url: '', title: '' },
  Component: Video,
}

/* ── Plan d'accès ──────────────────────────────────────────────────── */

export const accesSchema = z.object({
  zoom: z.coerce.number().int().min(8).max(19).default(15),
})

function Acces({ data, ctx }: BlockProps<z.output<typeof accesSchema>>) {
  const s = ctx.settings
  const query =
    s.latitude && s.longitude
      ? `${s.latitude},${s.longitude}`
      : [s.addressStreet, s.addressPostalCode, s.addressCity]
          .filter(Boolean)
          .join(', ')

  if (!query) {
    if (!ctx.editable) return null
    return (
      <div className="flex h-full min-h-24 items-center justify-center rounded-[3px] border border-dashed border-line-strong p-4 text-center text-[0.78rem] text-stone">
        Renseignez l’adresse du cabinet dans Paramètres.
      </div>
    )
  }

  return (
    <iframe
      src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&z=${data.zoom}&output=embed`}
      title="Plan d’accès au cabinet"
      loading="lazy"
      className="h-full w-full rounded-[3px] border-0 grayscale-[0.3]"
    />
  )
}

export const accesBlock: BlockDefinition<typeof accesSchema> = {
  label: 'Plan d’accès',
  description: 'La carte du cabinet — adresse tirée des Paramètres.',
  group: 'Contenu',
  inline: true,
  schema: accesSchema,
  fields: [field.number('zoom', 'Niveau de zoom', { help: 'De 8 (ville) à 19 (rue).' })],
  defaults: { zoom: 15 },
  Component: Acces,
}

/* ── Coordonnées ───────────────────────────────────────────────────── */

export const coordonneesSchema = z.object({
  showPhone: z.boolean().default(true),
  showEmail: z.boolean().default(true),
  showAddress: z.boolean().default(true),
})

function Coordonnees({ data, ctx }: BlockProps<z.output<typeof coordonneesSchema>>) {
  const s = ctx.settings
  const rows: { label: string; value: React.ReactNode }[] = []

  if (data.showPhone && s.contactPhone) {
    rows.push({
      label: 'Téléphone',
      value: (
        <a href={`tel:${s.contactPhone.replace(/\s/g, '')}`} className="hover:text-blue-deep">
          {s.contactPhone}
        </a>
      ),
    })
  }
  if (data.showEmail && s.contactEmail) {
    rows.push({
      label: 'E-mail',
      value: (
        <a href={`mailto:${s.contactEmail}`} className="hover:text-blue-deep">
          {s.contactEmail}
        </a>
      ),
    })
  }
  if (data.showAddress && (s.addressStreet || s.addressCity)) {
    rows.push({
      label: 'Cabinet',
      value: [s.addressStreet, [s.addressPostalCode, s.addressCity].filter(Boolean).join(' ')]
        .filter(Boolean)
        .join(', '),
    })
  }

  if (rows.length === 0) return null

  return (
    <Reveal>
      <dl className="border-t border-line">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[6rem_1fr] gap-4 border-b border-line py-3"
          >
            <dt className="text-[0.7rem] uppercase tracking-[0.12em] text-stone">
              {row.label}
            </dt>
            <dd className="text-[0.88rem] text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Reveal>
  )
}

export const coordonneesBlock: BlockDefinition<typeof coordonneesSchema> = {
  label: 'Coordonnées',
  description: 'Téléphone, e-mail, adresse — tirés des Paramètres du site.',
  group: 'Contenu',
  inline: true,
  schema: coordonneesSchema,
  fields: [
    field.boolean('showPhone', 'Téléphone'),
    field.boolean('showEmail', 'E-mail'),
    field.boolean('showAddress', 'Adresse'),
  ],
  defaults: { showPhone: true, showEmail: true, showAddress: true },
  Component: Coordonnees,
}

/* ── Horaires ──────────────────────────────────────────────────────── */

export const horairesSchema = z.object({
  title: z.string().default(''),
})

function Horaires({ data, ctx }: BlockProps<z.output<typeof horairesSchema>>) {
  /* Colonne jsonb — la forme est garantie par le schéma du formulaire
     Paramètres, Drizzle ne la connaît pas. */
  const hours = (ctx.settings.openingHours ?? []) as {
    day: string
    hours: string
  }[]
  if (hours.length === 0) {
    if (!ctx.editable) return null
    return (
      <p className="rounded-[3px] border border-dashed border-line-strong p-4 text-center text-[0.78rem] text-stone">
        Renseignez les horaires dans Paramètres.
      </p>
    )
  }

  return (
    <Reveal>
      {data.title && (
        <h3 className="mb-4 font-serif text-[1.02rem] text-ink">{data.title}</h3>
      )}
      <dl className="border-t border-line">
        {hours.map((row, i) => (
          <div
            key={i}
            className="flex items-baseline justify-between gap-4 border-b border-line py-2.5"
          >
            <dt className="text-[0.82rem] text-ink">{row.day}</dt>
            <dd className="text-[0.82rem] text-ink-soft">{row.hours}</dd>
          </div>
        ))}
      </dl>
    </Reveal>
  )
}

export const horairesBlock: BlockDefinition<typeof horairesSchema> = {
  label: 'Horaires',
  description: 'Les horaires d’ouverture — tirés des Paramètres du site.',
  group: 'Contenu',
  inline: true,
  schema: horairesSchema,
  fields: [field.text('title', 'Titre (optionnel)', { full: true })],
  defaults: { title: '' },
  Component: Horaires,
}

/* ── Réseaux sociaux ───────────────────────────────────────────────── */

export const reseauxSchema = z.object({
  direction: z.enum(['ligne', 'colonne']).default('ligne'),
})

function Reseaux({ data, ctx }: BlockProps<z.output<typeof reseauxSchema>>) {
  /* Colonne jsonb — même garantie que les horaires. */
  const links = (ctx.settings.socialLinks ?? []) as {
    label: string
    url: string
  }[]
  if (links.length === 0) {
    if (!ctx.editable) return null
    return (
      <p className="rounded-[3px] border border-dashed border-line-strong p-3 text-center text-[0.75rem] text-stone">
        Ajoutez des liens dans Paramètres → Réseaux.
      </p>
    )
  }

  return (
    <Reveal>
      <ul
        className={cn(
          'flex gap-x-5 gap-y-2',
          data.direction === 'colonne' ? 'flex-col' : 'flex-wrap items-baseline',
        )}
      >
        {links.map((link) => (
          <li key={link.url}>
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[0.8rem] uppercase tracking-[0.1em] text-ink-soft underline decoration-line-strong underline-offset-4 transition-colors hover:text-blue-deep"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </Reveal>
  )
}

export const reseauxBlock: BlockDefinition<typeof reseauxSchema> = {
  label: 'Réseaux',
  description: 'Les liens sociaux — tirés des Paramètres du site.',
  group: 'Contenu',
  inline: true,
  schema: reseauxSchema,
  fields: [
    field.select('direction', 'Disposition', [
      { value: 'ligne', label: 'En ligne' },
      { value: 'colonne', label: 'En colonne' },
    ]),
  ],
  defaults: { direction: 'ligne' },
  Component: Reseaux,
}
