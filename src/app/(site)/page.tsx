import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { HERO_TYPES } from '@/blocks/types'
import { JsonLd } from '@/components/site/JsonLd'
import { SectionRenderer } from '@/components/site/SectionRenderer'
import {
  buildFaqJsonLd,
  buildGraph,
  buildMetadata,
  buildOrganizationJsonLd,
  buildPersonJsonLd,
  buildWebPageJsonLd,
  buildWebSiteJsonLd,
} from '@/lib/seo'
import { absoluteUrl } from '@/lib/utils'
import {
  getActiveFaq,
  getMediaByIds,
  getPublishedHome,
  getSettings,
} from '@/server/queries'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([getPublishedHome(), getSettings()])
  if (!page) return { title: 'ANASAWI' }

  const ogId = page.seo?.ogMediaId ?? settings.defaultOgMediaId
  const [ogImage] = ogId ? await getMediaByIds([ogId]) : []

  return buildMetadata({
    page,
    settings,
    ogImage: ogImage ?? null,
    path: '/',
  })
}

export default async function HomePage() {
  const [page, settings, faqItems] = await Promise.all([
    getPublishedHome(),
    getSettings(),
    getActiveFaq(),
  ])

  if (!page) notFound()

  /* Un seul graphe Schema.org pour toute la page : Person, LocalBusiness,
     WebSite, WebPage et FAQPage liés entre eux par leurs @id. */
  /* L'image du cabinet : l'icône 180 px (fond ivoire plein), pas celle de
     l'onglet en 64 px sur fond transparent — Google la refuse trop petite. */
  const graph = buildGraph([
    buildOrganizationJsonLd(settings, absoluteUrl('/apple-icon')),
    buildPersonJsonLd(settings),
    buildWebSiteJsonLd(settings),
    buildWebPageJsonLd(page, '/'),
    buildFaqJsonLd(faqItems),
  ])

  /* Le H1 vient du héros qui ouvre la page. Sans héros en tête — page
     qui commence par un texte, un bandeau, une liste — la page n'en
     aurait aucun : on pose alors le titre SEO en titre principal, lu par
     les lecteurs d'écran et les moteurs, invisible à l'écran. Un seul H1
     dans tous les cas. */
  const premiere = page.sections.find((s) => s.isActive && !s.parentId)
  const sansHero = !premiere || !HERO_TYPES.has(premiere.type)
  const titrePrincipal =
    page.seo?.title?.trim() ||
    settings.defaultSeoTitle?.trim() ||
    page.title

  return (
    <>
      <JsonLd json={graph} />
      {sansHero && <h1 className="sr-only">{titrePrincipal}</h1>}
      <SectionRenderer sections={page.sections} />
    </>
  )
}
