import { z } from 'zod'

import { TYPOS, variablesDe } from '@/components/anasawi/typos'

/**
 * LE STYLE DU SITE MODERNE, réglé dans Réglages › Apparence : ses cinq
 * couleurs, sa paire de polices, la vivacité des animations. Rangé dans
 * `settings.identity.moderne` (pas de migration). Absent : la charte telle
 * qu'elle est dans globals.css.
 *
 * Les teintes dérivées (bleu très clair, sable foncé…) se calculent à
 * partir des cinq : changer le bleu change aussi son voile, sans rien
 * régler de plus.
 */

const hex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .transform((v) => v.toLowerCase())

export const COULEURS_MODERNES = {
  nuit: { libelle: 'Bleu nuit', aide: 'Textes, titres, boutons, pied de page', defaut: '#2e424f' },
  bleu: { libelle: 'Bleu clair', aide: 'Mots clés des titres, liens, détails', defaut: '#46728a' },
  turquoise: { libelle: 'Turquoise', aide: 'Petites touches : puces, traits, icônes', defaut: '#4fa9a6' },
  ivoire: { libelle: 'Fond', aide: 'Le fond du site', defaut: '#fbf6ee' },
  sable: { libelle: 'Sable', aide: 'Fonds de cartes et de panneaux', defaut: '#f5ecdf' },
} as const
export type CleCouleur = keyof typeof COULEURS_MODERNES

export const ANIMATIONS = [
  { value: 'normales', label: 'Normales', aide: 'Apparitions lentes et petits mouvements continus (vapeur, défilés).' },
  { value: 'discretes', label: 'Discrètes', aide: 'Les apparitions restent ; les mouvements continus s’arrêtent.' },
  { value: 'coupees', label: 'Coupées', aide: 'Rien ne bouge : tout s’affiche directement.' },
] as const
export type Animations = (typeof ANIMATIONS)[number]['value']

export const styleModerneSchema = z
  .object({
    couleurs: z.object({ nuit: hex, bleu: hex, turquoise: hex, ivoire: hex, sable: hex }).partial().optional(),
    typo: z.string().max(40).optional(),
    animations: z.enum(['normales', 'discretes', 'coupees']).optional(),
  })
  .strict()
export type StyleModerne = z.infer<typeof styleModerneSchema>

export const typoDe = (style: StyleModerne | undefined) => TYPOS.find((t) => t.id === style?.typo) ?? TYPOS[0]!

/** Les variables CSS du site moderne pour ce style (vide : la charte). */
export function styleModerneCss(style: StyleModerne | undefined): string {
  if (!style) return ''
  const c = style.couleurs ?? {}
  const v: Record<string, string> = {}
  if (c.nuit) v['--ad-nuit'] = c.nuit
  if (c.bleu) {
    v['--ad-bleu'] = c.bleu
    v['--ad-bleu-clair'] = `color-mix(in srgb, ${c.bleu} 62%, white)`
    v['--ad-brume'] = `color-mix(in srgb, ${c.bleu} 11%, white)`
  }
  if (c.turquoise) {
    v['--ad-or'] = c.turquoise
    v['--ad-touche'] = c.turquoise
    v['--ad-touche-pale'] = `color-mix(in srgb, ${c.turquoise} 16%, white)`
    v['--ad-touche-fonce'] = `color-mix(in srgb, ${c.turquoise} 78%, black)`
  }
  if (c.ivoire) v['--ad-ivoire'] = c.ivoire
  if (c.sable) {
    v['--ad-sable'] = c.sable
    v['--ad-sable-fonce'] = `color-mix(in srgb, ${c.sable} 86%, #7a5a33)`
  }
  if (style.typo) Object.assign(v, variablesDe(typoDe(style)))
  const corps = Object.entries(v)
    .map(([k, val]) => `${k}:${val};`)
    .join('')
  let css = corps ? `.ad,.ad .ad-joie,.ad .ad-accentue{${corps}}` : ''
  if (c.ivoire) css += `:root:has(.ad),:root:has(.ad) body{background:${c.ivoire}}`
  if (style.animations === 'coupees')
    css += `.ad *,.ad *::before,.ad *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;animation-delay:0s!important;transition-duration:.01ms!important;transition-delay:0s!important}`
  if (style.animations === 'discretes')
    css += `.ad [class*="ad-kenburns"],.ad [class*="ad-vapeur"],.ad [class*="ad-defiler"],.ad [class*="ad-tourner"],.ad [class*="ad-pouls"],.ad [class*="ad-onde"],.ad [class*="ad-souffle"],.ad [class*="ad-flotter"],.ad [class*="ad-bulle"]{animation:none!important}`
  return css
}
