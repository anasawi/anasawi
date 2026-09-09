import NextAuth from 'next-auth'

import { authConfig } from '@/lib/auth.config'

/**
 * Bloque `/admin/*` et `/preview/*` avant tout rendu.
 *
 * Ce fichier doit vivre à côté du dossier `app`, donc dans `src/` : placé à
 * la racine du dépôt alors que l'application est sous `src/`, Next l'ignore
 * silencieusement — aucune erreur, aucune protection.
 *
 * NextAuth est instancié avec la seule configuration edge-safe : le provider
 * Credentials, qui importe bcrypt et le driver Neon, n'est pas chargé ici.
 */
export const { auth: middleware } = NextAuth(authConfig)

export default middleware

export const config = {
  /* `/preview` affiche les brouillons et les sections masquées : il doit être
     protégé exactement comme le CMS. */
  matcher: ['/admin/:path*', '/preview/:path*'],
}
