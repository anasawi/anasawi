import { z } from 'zod'

/**
 * Liens saisis dans l'administration — ce qui est inscriptible, et comment
 * on les relit.
 *
 * Module sans dépendance serveur : les composants clients (LinkField,
 * NavigationEditor) et les actions l'importent tous deux, pour que la
 * lecture d'un lien et sa validation ne divergent jamais.
 */

/**
 * Un lien sûr : chemin interne, ancre, URL http(s), mailto ou tel.
 *
 * La liste est FERMÉE : `javascript:`, `data:`, `vbscript:` ou un schéma
 * inconnu ne passent pas — un lien de bouton rendu dans un `href` serait
 * sinon un vecteur d'injection depuis le CMS.
 */
export const SAFE_HREF_PATTERN =
  /^(\/[^\s]*|#[a-z0-9-]+|https?:\/\/\S+|mailto:\S+|tel:[+0-9\s().-]+)$/i

export const safeHrefSchema = z
  .string()
  .trim()
  .max(2000, 'Ce lien est trop long.')
  .regex(SAFE_HREF_PATTERN, 'Lien invalide — ancre, chemin interne, adresse web, e-mail ou téléphone.')

/** Comme `safeHrefSchema`, mais la chaîne vide est acceptée (« pas de lien »). */
export const optionalSafeHrefSchema = z.union([z.literal(''), safeHrefSchema])

export function isSafeHref(value: string): boolean {
  return SAFE_HREF_PATTERN.test(value.trim())
}

export type HrefMode = 'section' | 'page' | 'tel' | 'mail' | 'web'

/**
 * Décompose un lien en « où il mène » et « le reste » — la logique que
 * LinkField et NavigationEditor dupliquaient chacun de leur côté.
 *
 * - `#contact` et `/#contact` → section `contact` ;
 * - `contact` (ancre nue, ancien format du menu) → section `contact` ;
 * - `/approche` → page `/approche` ;
 * - `tel:`, `mailto:` → leur valeur, sans le préfixe ;
 * - `https://…` (ou n'importe quoi d'autre) → web.
 *
 * Vide → section, sans reste : c'est le mode proposé par défaut.
 */
export function parseHref(value: string): { mode: HrefMode; rest: string } {
  const v = value.trim()
  if (v.startsWith('tel:')) return { mode: 'tel', rest: v.slice(4) }
  if (v.startsWith('mailto:')) return { mode: 'mail', rest: v.slice(7) }
  if (/^https?:\/\//i.test(v)) return { mode: 'web', rest: v }
  if (v.startsWith('/#')) return { mode: 'section', rest: v.slice(2) }
  if (v.startsWith('#')) return { mode: 'section', rest: v.slice(1) }
  if (v.startsWith('/')) return { mode: 'page', rest: v }
  if (/^[a-z0-9-]*$/i.test(v)) return { mode: 'section', rest: v }
  return { mode: 'web', rest: v }
}
