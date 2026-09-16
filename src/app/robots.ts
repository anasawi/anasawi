import type { MetadataRoute } from 'next'

import { absoluteUrl } from '@/lib/utils'

/**
 * Netlify renseigne `CONTEXT` à chaque build : `production` pour la branche de
 * production, `branch-deploy` ou `deploy-preview` sinon. En développement la
 * variable est absente, et `next dev` n'est de toute façon pas exposé.
 */
const isProductionDeploy =
  !process.env.CONTEXT || process.env.CONTEXT === 'production'

export default function robots(): MetadataRoute.Robots {
  /* Une preprod accessible publiquement serait indexée et entrerait en
     concurrence avec le vrai domaine — contenu dupliqué, et pages de travail
     visibles dans les résultats de recherche. On ferme la porte à la source
     plutôt que de compter sur le secret de l'URL. */
  if (!isProductionDeploy) {
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }

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
