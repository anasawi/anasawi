import type { Metadata } from 'next'

import { absoluteUrl, stripHtml, toE164, truncate } from './utils'
import type { FaqItem, Media, Settings } from '@/server/db/schema'
import type { PageWithSections } from '@/server/queries'

/**
 * Construit les métadonnées d'une page.
 *
 * Ordre de résolution : SEO de la page → réglages du site → titre de la page.
 * Rien n'est inventé : un champ vide est omis plutôt que rempli d'un
 * placeholder qui se retrouverait indexé.
 */
export function buildMetadata({
  page,
  settings,
  ogImage,
  path,
}: {
  page: PageWithSections
  settings: Settings
  ogImage: Media | null
  path: string
}): Metadata {
  const seo = page.seo

  const title =
    seo?.title?.trim() ||
    [page.title, settings.siteName].filter(Boolean).join(' — ')

  const description = truncate(
    stripHtml(
      seo?.description?.trim() || settings.defaultSeoDescription?.trim() || '',
    ),
    300,
  )

  const canonical = seo?.canonical?.trim() || absoluteUrl(path)

  const images = ogImage
    ? [
        {
          url: ogImage.url,
          width: ogImage.width || 1200,
          height: ogImage.height || 630,
          alt: ogImage.alt,
        },
      ]
    : [{ url: absoluteUrl('/opengraph-image'), width: 1200, height: 630 }]

  return {
    title,
    ...(description ? { description } : {}),
    alternates: { canonical },
    keywords: seo?.keywords?.length ? seo.keywords : undefined,
    robots: {
      index: seo?.robotsIndex ?? true,
      follow: seo?.robotsFollow ?? true,
      googleBot: {
        index: seo?.robotsIndex ?? true,
        follow: seo?.robotsFollow ?? true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      type: 'website',
      locale: 'fr_FR',
      url: canonical,
      siteName: settings.siteName,
      title,
      ...(description ? { description } : {}),
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      ...(description ? { description } : {}),
      images: images.map((i) => i.url),
    },
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Données structurées

   Règle absolue : un champ non renseigné dans les Réglages est OMIS du
   JSON-LD. On ne remplit jamais une adresse, un horaire ou un diplôme par
   défaut — un balisage inventé est une faute de référencement autant qu'une
   faute professionnelle.
   ══════════════════════════════════════════════════════════════════════ */

type Json = Record<string, unknown>

/** Retire récursivement les clés vides, nulles ou vides de contenu. */
function prune<T extends Json>(input: T): T {
  const out: Json = {}
  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined || value === '') continue
    if (Array.isArray(value)) {
      const arr = value.filter((v) => v !== null && v !== undefined && v !== '')
      if (arr.length > 0) out[key] = arr
      continue
    }
    if (typeof value === 'object') {
      const nested = prune(value as Json)
      if (Object.keys(nested).length > 0) out[key] = nested
      continue
    }
    out[key] = value
  }
  return out as T
}

function buildAddress(settings: Settings): Json | null {
  if (!settings.addressStreet && !settings.addressCity) return null
  return prune({
    '@type': 'PostalAddress',
    streetAddress: settings.addressStreet,
    postalCode: settings.addressPostalCode,
    addressLocality: settings.addressCity,
    addressCountry: settings.addressCountry,
  })
}

export function buildOrganizationJsonLd(
  settings: Settings,
  logoUrl?: string,
): Json {
  const address = buildAddress(settings)

  return prune({
    '@type': 'HealthAndBeautyBusiness',
    '@id': absoluteUrl('/#business'),
    name: settings.siteName,
    url: absoluteUrl('/'),
    description: settings.defaultSeoDescription,
    image: logoUrl,
    telephone: settings.contactPhone ? toE164(settings.contactPhone) : null,
    email: settings.contactEmail,
    address,
    geo:
      settings.latitude && settings.longitude
        ? {
            '@type': 'GeoCoordinates',
            latitude: settings.latitude,
            longitude: settings.longitude,
          }
        : null,
    openingHours: (
      (settings.openingHours as { day: string; hours: string }[]) ?? []
    ).map((h) => `${h.day} ${h.hours}`),
    areaServed: settings.addressCity,
  })
}

export function buildPersonJsonLd(settings: Settings, image?: string): Json {
  if (!settings.practitionerName) return {}

  return prune({
    '@type': 'Person',
    '@id': absoluteUrl('/#person'),
    name: settings.practitionerName,
    jobTitle: settings.practitionerTitle,
    url: absoluteUrl('/'),
    image,
    telephone: settings.contactPhone ? toE164(settings.contactPhone) : null,
    email: settings.contactEmail,
    address: buildAddress(settings),
    worksFor: { '@type': 'Organization', name: settings.siteName },
  })
}

export function buildFaqJsonLd(items: FaqItem[]): Json | null {
  if (items.length === 0) return null

  return {
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}

export function buildWebPageJsonLd(page: PageWithSections, path: string): Json {
  return prune({
    '@type': 'WebPage',
    '@id': `${absoluteUrl(path)}#webpage`,
    url: absoluteUrl(path),
    name: page.seo?.title || page.title,
    description: page.seo?.description,
    inLanguage: 'fr-FR',
    isPartOf: { '@type': 'WebSite', '@id': absoluteUrl('/#website') },
  })
}

export function buildWebSiteJsonLd(settings: Settings): Json {
  return prune({
    '@type': 'WebSite',
    '@id': absoluteUrl('/#website'),
    url: absoluteUrl('/'),
    name: settings.siteName,
    inLanguage: 'fr-FR',
    publisher: { '@id': absoluteUrl('/#business') },
  })
}

/** Assemble un unique graphe — préférable à cinq balises séparées. */
export function buildGraph(nodes: (Json | null)[]): string {
  const graph = nodes.filter(
    (n): n is Json => n !== null && Object.keys(n).length > 0,
  )
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
}
