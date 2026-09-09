import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { JsonLd } from '@/components/site/JsonLd'
import { SectionRenderer } from '@/components/site/SectionRenderer'
import {
  buildGraph,
  buildMetadata,
  buildOrganizationJsonLd,
  buildPersonJsonLd,
  buildWebPageJsonLd,
  buildWebSiteJsonLd,
} from '@/lib/seo'
import { absoluteUrl, RESERVED_SLUGS } from '@/lib/utils'
import {
  getMediaByIds,
  getPublishedPageBySlug,
  getSettings,
} from '@/server/queries'

export const revalidate = 3600

/**
 * Pages secondaires du site, créées depuis le CMS.
 *
 * Seules les pages PUBLIÉES sont servies — un brouillon renvoie un 404.
 * L'accueil vit à la racine : son slug redirige pour éviter le contenu
 * dupliqué.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  if (RESERVED_SLUGS.has(slug)) return {}

  const [page, settings] = await Promise.all([
    getPublishedPageBySlug(slug),
    getSettings(),
  ])
  if (!page || page.isHome) return {}

  const ogId = page.seo?.ogMediaId ?? settings.defaultOgMediaId
  const [ogImage] = ogId ? await getMediaByIds([ogId]) : []

  return buildMetadata({
    page,
    settings,
    ogImage: ogImage ?? null,
    path: `/${slug}`,
  })
}

export default async function SitePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  if (RESERVED_SLUGS.has(slug)) notFound()

  const [page, settings] = await Promise.all([
    getPublishedPageBySlug(slug),
    getSettings(),
  ])

  if (!page) notFound()
  if (page.isHome) redirect('/')

  const graph = buildGraph([
    buildOrganizationJsonLd(settings, absoluteUrl('/icon.svg')),
    buildPersonJsonLd(settings),
    buildWebSiteJsonLd(settings),
    buildWebPageJsonLd(page, `/${slug}`),
  ])

  return (
    <>
      <JsonLd json={graph} />
      <SectionRenderer sections={page.sections} />
    </>
  )
}
