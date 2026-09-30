import NextAuth from 'next-auth'

import { authConfig } from '@/lib/auth.config'

/**
 * Bloque `/admin/*` avant tout rendu (la liste des préfixes protégés vit
 * dans `auth.config.ts`, rappel `authorized`).
 *
 * `/templates` n'y est PAS : les tests de bout en bout (`e2e/public/
 * routes.spec.ts`) exigent qu'elle réponde 200 à un visiteur sans
 * session. Le jour où cette page devra être réservée, ajouter
 * `'/templates'` ici ET dans `PROTECTED_PREFIXES` — et adapter ces tests.
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
  matcher: ['/admin/:path*'],
}
