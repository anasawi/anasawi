import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

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
  const graph = buildGraph([
    buildOrganizationJsonLd(settings, absoluteUrl('/icon.svg')),
    buildPersonJsonLd(settings),
    buildWebSiteJsonLd(settings),
    buildWebPageJsonLd(page, '/'),
    buildFaqJsonLd(faqItems),
  ])

  return (
    <>
      <JsonLd json={graph} />
      <SectionRenderer sections={page.sections} />
    </>
  )
}
