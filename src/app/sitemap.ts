import type { MetadataRoute } from 'next'

import { absoluteUrl } from '@/lib/utils'
import { getPublishedHome } from '@/server/queries'

/** Le site est une page unique : le plan du site, c'est elle. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const accueil = await getPublishedHome().catch(() => null)
  return [
    {
      url: absoluteUrl('/'),
      lastModified: accueil?.publishedAt ?? accueil?.updatedAt ?? new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
