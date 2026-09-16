import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'
import { cache } from 'react'

import { sectionsFromSnapshot } from '@/lib/publish'
import { db } from '../db'
import {
  faqItems,
  media,
  pages,
  savedSections,
  sections,
  seoMeta,
  services,
  settings,
  type FaqItem,
  type Media,
  type Page,
  type SavedSection,
  type Section,
  type SeoMeta,
  type ServiceWithMedia,
  type Settings,
} from '../db/schema'

/**
 * Tags de cache.
 *
 * Une Server Action n'invalide que ce qu'elle a touché : modifier la FAQ ne
 * purge pas la home. En production, le site public ne fait donc quasiment
 * jamais de requête vers Neon.
 */
export const tags = {
  pages: 'pages',
  page: (slug: string) => `page:${slug}`,
  services: 'services',
  faq: 'faq',
  settings: 'settings',
  media: 'media',
} as const

const IS_DEV = process.env.NODE_ENV === 'development'

/**
 * Enveloppe de cache.
 *
 * En production, les écritures passent toutes par des Server Actions qui
 * invalident leur tag ; l'heure de TTL n'est qu'un filet de sécurité.
 *
 * En développement, la fonction est renvoyée telle quelle — non cachée. Les
 * scripts CLI (`db:seed`, `db:seed-images`) écrivent directement dans Neon et
 * n'ont aucun moyen d'appeler `revalidateTag` : sans cela, le site continue
 * d'afficher l'état d'avant le script, même après redémarrage, puisque le
 * cache survit dans `.next/cache`.
 *
 * On ne peut pas obtenir ce résultat avec `revalidate: 0` : `unstable_cache`
 * n'accepte que `false` (cache permanent) ou une durée strictement positive.
 * Désactiver, c'est donc ne pas envelopper du tout.
 */
function cached<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  keyParts: string[],
  cacheTags: string[],
): (...args: A) => Promise<R> {
  if (IS_DEV) return fn
  return unstable_cache(fn, keyParts, {
    tags: cacheTags,
    revalidate: 3600,
  }) as (...args: A) => Promise<R>
}

/*
 * Déduplication par requête (`cache()` de React), EN PLUS de `cached()`.
 *
 * Une même requête appelle `getSettings()` depuis le layout, la page,
 * `generateMetadata` et le moteur de rendu : en production `unstable_cache`
 * absorbe ces appels, mais en développement `cached()` renvoie la fonction
 * nue — autant d'allers-retours Neon. `cache()` mémorise le résultat pour
 * la durée d'un rendu serveur, puis l'oublie : aucune incidence sur
 * l'invalidation par tags. Les fonctions concernées sont sans argument (la
 * clé de `cache()` est l'identité des arguments — ici toujours vide).
 */

const FALLBACK_SETTINGS: Settings = {
  id: 'singleton',
  siteName: 'ANASAWI',
  practitionerName: '',
  practitionerTitle: null,
  tagline: null,
  contactEmail: null,
  contactPhone: null,
  addressStreet: null,
  addressPostalCode: null,
  addressCity: null,
  addressCountry: 'FR',
  latitude: null,
  longitude: null,
  openingHours: [],
  practicalInfo: null,
  bookingUrl: null,
  socialLinks: [],
  defaultSeoTitle: null,
  defaultSeoDescription: null,
  defaultOgMediaId: null,
  navigation: null,
  identity: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

/* ════════════════════════════════════════════════════════════════════
   Réglages
   ════════════════════════════════════════════════════════════════════ */

export const getSettings = cache(
  cached(
    async (): Promise<Settings> => {
      const [row] = await db.select().from(settings).limit(1)
      return row ?? FALLBACK_SETTINGS
    },
    ['settings'],
    [tags.settings],
  ),
)

/* ════════════════════════════════════════════════════════════════════
   Accompagnements
   ════════════════════════════════════════════════════════════════════ */

export const getActiveServices = cache(
  cached(
    async (): Promise<ServiceWithMedia[]> => {
      const rows = await db
        .select({ service: services, media })
        .from(services)
        .leftJoin(media, eq(services.mediaId, media.id))
        .where(eq(services.isActive, true))
        .orderBy(asc(services.sortOrder), asc(services.createdAt))

      return rows.map((r) => ({ ...r.service, media: r.media }))
    },
    ['services-active'],
    [tags.services],
  ),
)

export async function getAllServices(): Promise<ServiceWithMedia[]> {
  const rows = await db
    .select({ service: services, media })
    .from(services)
    .leftJoin(media, eq(services.mediaId, media.id))
    .orderBy(asc(services.sortOrder), asc(services.createdAt))

  return rows.map((r) => ({ ...r.service, media: r.media }))
}

/* ════════════════════════════════════════════════════════════════════
   FAQ
   ════════════════════════════════════════════════════════════════════ */

export const getActiveFaq = cache(
  cached(
    async (): Promise<FaqItem[]> =>
      db
        .select()
        .from(faqItems)
        .where(eq(faqItems.isActive, true))
        .orderBy(asc(faqItems.sortOrder), asc(faqItems.createdAt)),
    ['faq-active'],
    [tags.faq],
  ),
)

export async function getAllFaq(): Promise<FaqItem[]> {
  return db
    .select()
    .from(faqItems)
    .orderBy(asc(faqItems.sortOrder), asc(faqItems.createdAt))
}

/* ════════════════════════════════════════════════════════════════════
   Médias
   ════════════════════════════════════════════════════════════════════ */

export async function getAllMedia(): Promise<Media[]> {
  return db.select().from(media).orderBy(desc(media.createdAt))
}

export async function getMediaByIds(ids: string[]): Promise<Media[]> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return []
  return db.select().from(media).where(inArray(media.id, unique))
}

/* ════════════════════════════════════════════════════════════════════
   Mes sections — modèles personnels (admin)
   ════════════════════════════════════════════════════════════════════ */

export async function getSavedSections(): Promise<SavedSection[]> {
  return db
    .select()
    .from(savedSections)
    .orderBy(desc(savedSections.createdAt))
}

/* ════════════════════════════════════════════════════════════════════
   Pages
   ════════════════════════════════════════════════════════════════════ */

export type PageWithSections = Page & {
  sections: Section[]
  seo: SeoMeta | null
}

async function loadPage(
  where: ReturnType<typeof eq>,
  publishedOnly: boolean,
): Promise<PageWithSections | null> {
  const [page] = await db
    .select()
    .from(pages)
    .where(
      publishedOnly ? and(where, eq(pages.status, 'published')) : where,
    )
    .limit(1)

  if (!page) return null

  /* Lecture publique : servir l'INSTANTANÉ publié, jamais le brouillon.
     Une page publiée avant l'ère brouillon→publier (pas d'instantané)
     retombe sur ses sections vivantes — compatibilité ascendante. */
  if (publishedOnly) {
    const snapshot = sectionsFromSnapshot(page.publishedSnapshot)
    if (snapshot) {
      const seoRows = await db
        .select()
        .from(seoMeta)
        .where(eq(seoMeta.pageId, page.id))
        .limit(1)
      return { ...page, sections: snapshot, seo: seoRows[0] ?? null }
    }
  }

  const [pageSections, seoRows] = await Promise.all([
    db
      .select()
      .from(sections)
      .where(eq(sections.pageId, page.id))
      .orderBy(asc(sections.sortOrder), asc(sections.createdAt)),
    db.select().from(seoMeta).where(eq(seoMeta.pageId, page.id)).limit(1),
  ])

  return { ...page, sections: pageSections, seo: seoRows[0] ?? null }
}

export const getPublishedHome = cache(
  cached(
    () => loadPage(eq(pages.isHome, true), true),
    ['page-home'],
    [tags.page('home'), tags.pages],
  ),
)

/** Lecture admin — brouillons inclus, jamais cachée. */
export function getPageById(id: string) {
  return loadPage(eq(pages.id, id), false)
}

/**
 * La page d'accueil, côté administration.
 *
 * Le site est une single page : c'est la seule page que le CMS édite. Les
 * entrées du menu principal ne sont pas des pages mais les sections de
 * celle-ci, atteintes par ancres.
 */
export function getHomePageForAdmin() {
  return loadPage(eq(pages.isHome, true), false)
}

/** Une page publiée par son slug — le rendu des pages secondaires. */
export function getPublishedPageBySlug(slug: string) {
  return loadPage(eq(pages.slug, slug), true)
}

/**
 * Identité minimale d'une page par son slug — brouillons inclus, jamais
 * cachée. Sert à la redirection « Modifier » de la barre d'administration :
 * on n'a besoin ni des sections ni du SEO, seulement de savoir où envoyer
 * l'admin.
 */
export async function getPageRefBySlug(
  slug: string,
): Promise<{ id: string; isHome: boolean } | null> {
  const [row] = await db
    .select({ id: pages.id, isHome: pages.isHome })
    .from(pages)
    .where(eq(pages.slug, slug))
    .limit(1)
  return row ?? null
}

/** Toutes les pages, pour le gestionnaire — accueil en tête. */
export async function getAdminPages(): Promise<Page[]> {
  return db
    .select()
    .from(pages)
    .orderBy(desc(pages.isHome), asc(pages.createdAt))
}


/**
 * URL à déclarer dans le sitemap.
 *
 * Toutes les pages publiées (`status = 'published'`) : l'accueil et les
 * pages secondaires servies par `(site)/[slug]`. `isHome` est renvoyé pour
 * que le sitemap adresse l'accueil à `/` plutôt qu'à `/<slug>` ; une page
 * en brouillon ou dépubliée n'y figure pas.
 */
export const getPublishedPagesForSitemap = cached(
  async () =>
    db
      .select({
        slug: pages.slug,
        isHome: pages.isHome,
        updatedAt: pages.updatedAt,
      })
      .from(pages)
      .where(eq(pages.status, 'published')),
  ['sitemap-pages'],
  [tags.pages],
)

/**
 * Menu du site.
 *
 * Géré à la main dans l'admin (`settings.navigation`) — `anchor` porte
 * alors soit une ancre nue (`contact`), soit un lien complet (`/approche`,
 * `https://…`). À défaut, dérivation historique : les sections de
 * l'accueil marquées « visible dans la navigation ».
 */
export const getNavigationItems = cache(
  cached(
    async (): Promise<{ label: string; anchor: string }[]> => {
      const [row] = await db
        .select({ navigation: settings.navigation })
        .from(settings)
        .limit(1)

      if (Array.isArray(row?.navigation) && row.navigation.length > 0) {
        return (row.navigation as { label?: unknown; href?: unknown }[])
          .filter(
            (item) =>
              typeof item.label === 'string' && typeof item.href === 'string',
          )
          .map((item) => ({
            label: item.label as string,
            anchor: item.href as string,
          }))
      }

      const [home] = await db
        .select({ id: pages.id })
        .from(pages)
        .where(and(eq(pages.isHome, true), eq(pages.status, 'published')))
        .limit(1)

      if (!home) return []

      const rows = await db
        .select({
          navLabel: sections.navLabel,
          anchor: sections.anchor,
        })
        .from(sections)
        .where(
          and(
            eq(sections.pageId, home.id),
            eq(sections.showInNav, true),
            eq(sections.isActive, true),
          ),
        )
        .orderBy(asc(sections.sortOrder))

      return rows
        .filter((r) => r.navLabel && r.anchor)
        .map((r) => ({
          label: r.navLabel as string,
          anchor: r.anchor as string,
        }))
    },
    ['navigation'],
    [tags.pages],
  ),
)
