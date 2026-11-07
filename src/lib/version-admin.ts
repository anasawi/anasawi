/**
 * LA VERSION DU SITE sur laquelle on travaille dans l'admin (le temps de
 * l'arbitrage entre le site classique et le site moderne).
 *
 * Retenue dans un cookie : « Mon site », le tableau de bord et « Voir le
 * site » ouvrent la version qu'on a utilisée en dernier (le classique tant
 * qu'on n'a pas ouvert le moderne). On ne se demande jamais « où suis-je ? ».
 */

export type VersionSite = 'moderne' | 'classique'

export const COOKIE_VERSION = 'anasawi-version'

export function lireVersion(valeur: string | undefined | null): VersionSite {
  return valeur === 'moderne' ? 'moderne' : 'classique'
}

/** L'adresse publique de la version. */
export const adresseSite = (v: VersionSite) => (v === 'moderne' ? '/moderne' : '/')

/** Retient la version (côté navigateur). */
export function retenirVersion(v: VersionSite) {
  document.cookie = `${COOKIE_VERSION}=${v}; path=/; max-age=31536000; samesite=lax`
}
