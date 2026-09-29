import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Lien de navigation à partir d'une valeur du CMS.
 *
 * Les entrées peuvent être écrites de quatre façons — `a-propos`,
 * `#a-propos`, `/#a-propos` ou `/une-page` — selon qu'elles viennent d'une
 * section de l'accueil, d'un ancien enregistrement, de la page Navigation
 * ou d'un lien externe. Une ancre désigne TOUJOURS une section de
 * l'accueil : le lien produit est donc `/#a-propos`, jamais `#a-propos`.
 * La différence ne se voit pas depuis l'accueil (même page, même ancre) ;
 * depuis une autre page — mentions légales, page d'un accompagnement —
 * `#a-propos` cherchait la section DANS CETTE PAGE, ne la trouvait pas, et
 * le menu ne menait nulle part.
 *
 * Module neutre : utilisable côté serveur (Footer) comme côté client
 * (Header) — une fonction exportée d'un module `use client` ne peut pas
 * être appelée depuis un composant serveur.
 */
export function navHref(anchor: string): string {
  if (anchor.startsWith('/') || anchor.startsWith('http')) return anchor
  return `/#${anchorId(anchor)}`
}

/**
 * Identifiant de section correspondant à une entrée de navigation —
 * `a-propos` pour `a-propos`, `#a-propos` et `/#a-propos`. Vide pour un
 * lien qui n'est pas une ancre de l'accueil.
 */
export function anchorId(anchor: string): string {
  if (anchor.startsWith('/#')) return anchor.slice(2)
  if (anchor.startsWith('#')) return anchor.slice(1)
  if (anchor.startsWith('/') || anchor.startsWith('http')) return ''
  return anchor
}

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Formate un numéro français en E.164 pour les liens tel: et le JSON-LD. */
export function toE164(phone: string, country = '+33'): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('33')) return `+${digits}`
  if (digits.startsWith('0')) return `${country}${digits.slice(1)}`
  return `${country}${digits}`
}

export function truncate(input: string, max: number): string {
  return input.length <= max ? input : `${input.slice(0, max - 1).trimEnd()}…`
}

/** Retire les balises et compresse les espaces — sert à dériver une meta description. */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function formatDate(date: Date | string, locale = 'fr-FR'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://anasawi.com'
).replace(/\/$/, '')

export function absoluteUrl(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
