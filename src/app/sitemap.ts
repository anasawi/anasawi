import type { MetadataRoute } from 'next'

import { absoluteUrl } from '@/lib/utils'
import { getPublishedPagesForSitemap } from '@/server/queries'

/**
 * Sitemap généré depuis la base : une page publiée depuis le CMS y apparaît
 * au prochain revalidate, sans redéploiement.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await getPublishedPagesForSitemap()

  return pages.map((page) => ({
    url: absoluteUrl(page.isHome ? '/' : `/${page.slug}`),
    lastModified: page.updatedAt,
    changeFrequency: page.isHome ? 'weekly' : 'monthly',
    priority: page.isHome ? 1 : 0.7,
  }))
}
