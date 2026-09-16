import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Slugifie une chaîne : accents retirés, minuscules, tirets. */
/**
 * Lien d'une entrée de menu : ancre nue (`contact`) → `#contact` ;
 * chemin interne (`/approche`) ou URL complète → tel quel.
 * Module neutre : utilisable côté serveur (Footer) comme côté client
 * (Header) — une fonction exportée d'un module `use client` ne peut pas
 * être appelée depuis un composant serveur.
 */
/**
 * Lien de navigation à partir d'une valeur du CMS.
 *
 * Les entrées peuvent être écrites de trois façons — `a-propos`, `#a-propos`
 * ou `/une-page` — selon qu'elles viennent d'un ancien enregistrement, de la
 * page Navigation ou d'un lien externe. La fonction est idempotente : elle
 * n'ajoute un `#` que s'il manque, sans quoi on obtient `##a-propos`, qui ne
 * correspond à aucune ancre.
 */
export function navHref(anchor: string): string {
  return anchor.startsWith('/') ||
    anchor.startsWith('http') ||
    anchor.startsWith('#')
    ? anchor
    : `#${anchor}`
}

/** Identifiant de section correspondant à une entrée de navigation. */
export function anchorId(anchor: string): string {
  return anchor.startsWith('#') ? anchor.slice(1) : anchor
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

/** Slugs que le CMS ne doit jamais laisser créer — ils entrent en collision avec les routes. */
export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'login',
  'logout',
  'sitemap.xml',
  'robots.txt',
  '_next',
  /* Page annexe de revue de la bibliothèque (non indexée). */
  'templates',
])

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
