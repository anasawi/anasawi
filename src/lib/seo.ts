import type { Metadata } from 'next'

import { SITE_URL, absoluteUrl, stripHtml, toE164, truncate } from './utils'
import type { FaqItem, Media, OpeningHour, Settings } from '@/server/db/schema'
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

  /*
   * Titre de l'onglet et de Google, par ordre de priorité :
   *
   * 1. le titre SEO propre à la page, s'il est renseigné ;
   * 2. sur l'ACCUEIL seulement, le « Titre pour Google » des réglages —
   *    c'est le titre du site tout entier, et « Accueil — ANASAWI » ne
   *    dit rien ni à un visiteur ni à un moteur ;
   * 3. ailleurs, « Titre de la page — Nom du site » : deux pages qui
   *    partageraient le même titre se cannibaliseraient au référencement.
   *
   * Le réglage était auparavant lu nulle part : il se remplissait dans
   * l'administration sans jamais rien changer sur le site.
   */
  const title =
    seo?.title?.trim() ||
    (page.isHome ? settings.defaultSeoTitle?.trim() : '') ||
    [page.title, settings.siteName].filter(Boolean).join(' — ')

  const description = truncate(
    stripHtml(
      seo?.description?.trim() || settings.defaultSeoDescription?.trim() || '',
    ),
    300,
  )

  const canonical = canonicalUrl(seo?.canonical, path)

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

/**
 * URL canonique : celle saisie dans l'admin si c'est une adresse ABSOLUE
 * DU MÊME DOMAINE, sinon celle de la page. Une canonique vers un autre
 * domaine dit à Google « la vraie page est ailleurs » — et la page sort
 * de l'index ; un chemin relatif ou une faute de frappe donnaient une
 * balise invalide, ignorée au mieux.
 */
export function canonicalUrl(saisie: string | null | undefined, path: string): string {
  const repli = absoluteUrl(path)
  const brut = saisie?.trim()
  if (!brut) return repli
  try {
    const url = new URL(brut)
    const site = new URL(SITE_URL)
    if (url.protocol !== site.protocol && url.protocol !== 'https:') return repli
    if (url.host !== site.host) return repli
    return url.toString()
  } catch {
    return repli
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

/* ── Horaires ────────────────────────────────────────────────────────
   Les horaires sont saisis en français libre dans les Réglages
   (« 9 h – 19 h », « 9h-12h / 14h-18h », « Le matin, sur demande »).
   Google attend des `OpeningHoursSpecification` : jour Schema.org,
   heures `HH:MM`. On traduit ce qui se lit sans ambiguïté et on IGNORE
   le reste — un horaire inventé (« sur demande » devenu 9 h – 18 h)
   ferait venir quelqu'un devant une porte close. */

const JOURS: Record<string, string> = {
  lundi: 'Monday',
  mardi: 'Tuesday',
  mercredi: 'Wednesday',
  jeudi: 'Thursday',
  vendredi: 'Friday',
  samedi: 'Saturday',
  dimanche: 'Sunday',
}

/** « 9 h », « 9h30 », « 09:00 », « 14 h 15 » → « HH:MM », sinon null. */
function heure(brut: string): string | null {
  const m = /^\s*(\d{1,2})\s*(?:h|:)?\s*(\d{2})?\s*$/i.exec(brut)
  if (!m) return null
  const h = Number(m[1])
  const mn = Number(m[2] ?? '0')
  if (h > 24 || mn > 59) return null
  return `${String(h).padStart(2, '0')}:${String(mn).padStart(2, '0')}`
}

/**
 * Les plages d'une ligne d'horaires : « 9 h – 12 h / 14 h – 18 h » donne
 * deux plages ; « Fermé » ou « Sur demande » n'en donne aucune (et la
 * ligne est passée sous silence — pas de fermeture déclarée non plus).
 */
function plages(hours: string): { opens: string; closes: string }[] {
  const out: { opens: string; closes: string }[] = []
  const motif = /(\d{1,2}\s*(?:h|:)?\s*(?:\d{2})?)\s*(?:–|—|-|à|a|au)\s*(\d{1,2}\s*(?:h|:)?\s*(?:\d{2})?)/gi
  for (const m of hours.matchAll(motif)) {
    const opens = heure(m[1] ?? '')
    const closes = heure(m[2] ?? '')
    if (opens && closes && opens < closes) out.push({ opens, closes })
  }
  return out
}

/** Les horaires analysables, au format Schema.org — vide si rien ne l'est. */
export function buildOpeningHoursSpecification(hours: OpeningHour[]): Json[] {
  const out: Json[] = []
  for (const ligne of hours) {
    const jour = JOURS[ligne.day.trim().toLowerCase()]
    if (!jour) continue
    for (const plage of plages(ligne.hours)) {
      out.push({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: jour,
        opens: plage.opens,
        closes: plage.closes,
      })
    }
  }
  return out
}

/** Le logo du cabinet, tel que Google le demande : carré, 180 px, PNG. */
function buildLogo(): Json {
  return {
    '@type': 'ImageObject',
    url: absoluteUrl('/apple-icon'),
    width: 180,
    height: 180,
  }
}

export function buildOrganizationJsonLd(
  settings: Settings,
  imageUrl?: string,
): Json {
  const address = buildAddress(settings)

  return prune({
    '@type': 'HealthAndBeautyBusiness',
    '@id': absoluteUrl('/#business'),
    name: settings.siteName,
    url: absoluteUrl('/'),
    description: settings.defaultSeoDescription,
    image: imageUrl,
    logo: buildLogo(),
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
    openingHoursSpecification: buildOpeningHoursSpecification(
      (settings.openingHours as OpeningHour[]) ?? [],
    ),
    areaServed: settings.addressCity,
    /* Le graphe se lit dans les deux sens : le cabinet a une fondatrice,
       la praticienne travaille pour le cabinet — par référence, pas par
       copie. */
    founder: settings.practitionerName ? { '@id': absoluteUrl('/#person') } : null,
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
    worksFor: { '@id': absoluteUrl('/#business') },
  })
}

export function buildFaqJsonLd(
  items: FaqItem[],
  path = '/',
): Json | null {
  if (items.length === 0) return null

  return {
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
    /* Les cinq nœuds du graphe se lient par leurs `@id` — c'est tout
       l'intérêt d'un graphe unique plutôt que de cinq balises séparées.
       Celui-ci flottait sans identité ni rattachement : un moteur le
       lisait comme une fiche indépendante, sans savoir de quelle page il
       parlait. */
    '@id': `${absoluteUrl(path)}#faq`,
    isPartOf: { '@id': `${absoluteUrl(path)}#webpage` },
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
    isPartOf: { '@id': absoluteUrl('/#website') },
    /* De quoi parle la page : du cabinet — c'est lui que Google doit
       rattacher à cette adresse. */
    about: { '@id': absoluteUrl('/#business') },
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
