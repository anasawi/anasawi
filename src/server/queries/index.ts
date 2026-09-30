import { and, asc, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'
import { cache } from 'react'

import { sectionsFromSnapshot } from '@/lib/snapshot'
import { db } from '../db'
import {
  contactMessages,
  faqItems,
  media,
  pages,
  savedSections,
  sections,
  seoMeta,
  serviceGroups,
  services,
  settings,
  type FaqItem,
  type Media,
  type Page,
  type SavedSection,
  type ContactMessage,
  type Section,
  type SeoMeta,
  type ServiceGroup,
  type ServiceWithMedia,
  type Settings,
} from '../db/schema'
import type { NavigationItem } from '@/types/content'

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
  logoMediaId: null,
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

/**
 * Ordre d'affichage : les familles d'abord, dans leur ordre à elles, puis les
 * accompagnements dans leur ordre au sein de la famille. Les accompagnements
 * sans famille ferment la liste — `nulls last` sur le rang de famille.
 */
const servicesOrder = [
  sql`${serviceGroups.sortOrder} asc nulls last`,
  asc(services.sortOrder),
  asc(services.createdAt),
]

export const getActiveServices = cache(
  cached(
    async (): Promise<ServiceWithMedia[]> => {
      const rows = await db
        .select({ service: services, media, group: serviceGroups })
        .from(services)
        .leftJoin(media, eq(services.mediaId, media.id))
        .leftJoin(serviceGroups, eq(services.groupId, serviceGroups.id))
        .where(eq(services.isActive, true))
        .orderBy(...servicesOrder)

      return rows.map((r) => ({ ...r.service, media: r.media, group: r.group }))
    },
    ['services-active'],
    /* `media` aussi : la jointure embarque l'image de chaque
       accompagnement, dont le texte alternatif se modifie depuis la
       médiathèque — sans ce tag, l'ancien alt restait servi une heure. */
    [tags.services, tags.media],
  ),
)

export async function getAllServices(): Promise<ServiceWithMedia[]> {
  const rows = await db
    .select({ service: services, media, group: serviceGroups })
    .from(services)
    .leftJoin(media, eq(services.mediaId, media.id))
    .leftJoin(serviceGroups, eq(services.groupId, serviceGroups.id))
    .orderBy(...servicesOrder)

  return rows.map((r) => ({ ...r.service, media: r.media, group: r.group }))
}

/** Toutes les familles, dans leur ordre — y compris celles encore vides. */
export async function getServiceGroups(): Promise<ServiceGroup[]> {
  return db
    .select()
    .from(serviceGroups)
    .orderBy(asc(serviceGroups.sortOrder), asc(serviceGroups.createdAt))
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

/**
 * Une entrée de menu telle que le site la consomme. `href` est le lien
 * (ancre nue `contact`, `/#contact`, `https://…`) ; `anchor` en est la
 * copie, gardée parce que le Header, le Footer et la barre d'admin lisent
 * encore ce nom-là (`NavItem` de `Header.tsx`).
 */
export type NavigationEntry = NavigationItem & { anchor: string }

/**
 * Menu du site.
 *
 * Géré à la main dans l'admin (`settings.navigation`) — `href` porte
 * alors soit une ancre nue (`contact`), soit un lien complet (`/#contact`,
 * `https://…`). À défaut, dérivation historique : les sections de
 * l'accueil marquées « visible dans la navigation ».
 */
export const getNavigationItems = cache(
  cached(
    async (): Promise<NavigationEntry[]> => {
      const [row] = await db
        .select({ navigation: settings.navigation })
        .from(settings)
        .limit(1)

      if (Array.isArray(row?.navigation) && row.navigation.length > 0) {
        return row.navigation
          .filter(
            (item): item is NavigationItem =>
              Boolean(item) &&
              typeof item.label === 'string' &&
              typeof item.href === 'string',
          )
          .map((item) => ({ label: item.label, href: item.href, anchor: item.href }))
      }

      const [home] = await db
        .select({ id: pages.id, publishedSnapshot: pages.publishedSnapshot })
        .from(pages)
        .where(and(eq(pages.isHome, true), eq(pages.status, 'published')))
        .limit(1)

      if (!home) return []

      /*
       * Les MÊMES sections que celles que le visiteur a sous les yeux :
       * l'instantané publié. Lire les sections vivantes ici, comme avant,
       * faisait pointer le menu vers l'ancre d'un brouillon (« approche »
       * renommée en « ma-methode » dans l'admin, pas encore publiée)
       * alors que la page servait encore `id="approche"` — un lien mort
       * pour les visiteurs, jusqu'à la publication. Sans instantané (page
       * publiée avant l'ère brouillon→publier), les sections vivantes
       * restent la seule source.
       */
      const snapshot = sectionsFromSnapshot(home.publishedSnapshot)
      const rows = snapshot
        ? snapshot
            .filter((s) => !s.parentId && s.showInNav && s.isActive)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((s) => ({ navLabel: s.navLabel, anchor: s.anchor }))
        : await db
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
          href: r.anchor as string,
          anchor: r.anchor as string,
        }))
    },
    ['navigation'],
    /* `settings` aussi : le menu enregistré vit dans les réglages. Sans ce
       tag, un menu modifié à la main restait l'ancien pendant une heure. */
    [tags.pages, tags.settings],
  ),
)

/* ════════════════════════════════════════════════════════════════════
   Messages et compteurs — administration (jamais en cache)
   ════════════════════════════════════════════════════════════════════ */

/** Messages non lus — la pastille de la navigation. `0` en cas de panne :
    la barre latérale ne doit pas faire tomber tout l'écran. */
export async function getUnreadCount(): Promise<number> {
  try {
    const [row] = await db
      .select({ n: count() })
      .from(contactMessages)
      .where(eq(contactMessages.isRead, false))
    return row?.n ?? 0
  } catch {
    return 0
  }
}

export type DashboardCounts = {
  sections: number
  media: number
  nonLus: number
  services: number
  faq: number
}

/** Les chiffres du tableau de bord : sections de premier niveau de la
    page donnée, médias, messages non lus, accompagnements, questions. */
export async function getDashboardCounts(pageId: string | null): Promise<DashboardCounts> {
  const [sectionRows, mediaRows, unreadRows, serviceRows, faqRows] = await Promise.all([
    pageId
      ? db
          .select({ n: count() })
          .from(sections)
          .where(and(eq(sections.pageId, pageId), isNull(sections.parentId)))
      : Promise.resolve([{ n: 0 }]),
    db.select({ n: count() }).from(media),
    db.select({ n: count() }).from(contactMessages).where(eq(contactMessages.isRead, false)),
    db.select({ n: count() }).from(services),
    db.select({ n: count() }).from(faqItems),
  ])
  return {
    sections: sectionRows[0]?.n ?? 0,
    media: mediaRows[0]?.n ?? 0,
    nonLus: unreadRows[0]?.n ?? 0,
    services: serviceRows[0]?.n ?? 0,
    faq: faqRows[0]?.n ?? 0,
  }
}

/** Les derniers messages du formulaire de contact, les plus récents d'abord. */
export async function getMessages(limit = 200): Promise<ContactMessage[]> {
  return db
    .select()
    .from(contactMessages)
    .orderBy(desc(contactMessages.createdAt))
    .limit(limit)
}
