import { z } from 'zod'

import { paletteCss, paletteSchema } from '@/lib/palette'

/**
 * Identité globale du site — les quelques curseurs qui pilotent tous les
 * templates à la fois, via les variables CSS qu'ils consomment déjà.
 * Changer une valeur ici met à jour chaque section, mécaniquement.
 *
 * Les couleurs vivent dans `palette` (cinq rôles, voir `lib/palette.ts`).
 * Les trois anciennes clés — `accent`, `accentSoft`, `mist` — restent
 * acceptées : des identités enregistrées avant la palette continuent d'être
 * lues et rendues à l'identique.
 */

const hex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .transform((v) => v.toLowerCase())

export const identitySchema = z
  .object({
    /** Les cinq rôles de couleur du site. */
    palette: paletteSchema.optional(),

    /* ── Héritage — ancien schéma de couleurs ─────────────────────────
       Conservé pour que les enregistrements existants restent valides.
       `accent` et `accentSoft` alimentent les rôles de même nom ; `mist`
       reste une surcharge explicite de `--color-blue-mist`. */
    /** @deprecated — utiliser `palette.accent`. */
    accent: hex.optional(),
    /** @deprecated — utiliser `palette.accentSoft`. */
    accentSoft: hex.optional(),
    /** @deprecated — dérivé du palier « très clair » de `accentSoft`. */
    mist: hex.optional(),

    /** Arrondi des boutons, en px. */
    buttonRadius: z.number().int().min(0).max(24).optional(),
    /** Respiration verticale des sections. */
    spacing: z.enum(['compact', 'normal', 'aere']).optional(),
  })
  .strict()

export type Identity = z.infer<typeof identitySchema>

export function parseIdentity(input: unknown): Identity {
  const parsed = identitySchema.safeParse(input)
  return parsed.success ? parsed.data : {}
}

/* Une seule valeur : `--spacing-section`. Les dérivés (`section-tight`,
   `band`, `hero-top`) sont des `calc()` dans globals.css et suivent
   mécaniquement. */
const SPACING = {
  compact: 'clamp(72px, 12vh, 130px)',
  normal: 'clamp(100px, 17vh, 190px)',
  aere: 'clamp(130px, 22vh, 250px)',
} as const

/**
 * Surcharges CSS de l'identité.
 *
 * Deux blocs : la palette (toujours émise — elle redéfinit explicitement
 * toute la famille de couleurs) puis les formes et la respiration, qui ne
 * sortent que si elles s'écartent de la charte. Valeurs bornées par Zod :
 * rien n'est injectable.
 */
export function identityCss(input: unknown): string {
  const identity = parseIdentity(input)
  const out: string[] = []

  if (identity.buttonRadius !== undefined) {
    out.push(`--button-radius:${identity.buttonRadius}px`)
  }
  if (identity.spacing && identity.spacing !== 'normal') {
    out.push(`--spacing-section:${SPACING[identity.spacing]}`)
  }

  const shape = out.length > 0 ? `:root{${out.join(';')}}` : ''
  return `${paletteCss(identity)}${shape}`
}
