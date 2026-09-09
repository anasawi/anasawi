import type { MetadataRoute } from 'next'

import { absoluteUrl } from '@/lib/utils'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/preview/', '/api/', '/login'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  }
}
