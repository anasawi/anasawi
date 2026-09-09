import { z } from 'zod'

/**
 * Identité globale du site — les quelques curseurs qui pilotent tous les
 * templates à la fois, via les variables CSS qu'ils consomment déjà.
 * Changer une valeur ici met à jour chaque section, mécaniquement.
 */

const hex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .transform((v) => v.toLowerCase())

export const identitySchema = z
  .object({
    /** Accent profond — survols, filets, labels (`--color-blue-deep`). */
    accent: hex.optional(),
    /** Aplat des boutons (`--color-blue`). */
    accentSoft: hex.optional(),
    /** Fond doux de la charte (`--color-blue-mist`). */
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

const SPACING = {
  compact: ['clamp(4.5rem, 9vw, 9rem)', 'clamp(6rem, 12vw, 12rem)'],
  normal: ['clamp(7rem, 14vw, 14rem)', 'clamp(9rem, 18vw, 18rem)'],
  aere: ['clamp(9rem, 18vw, 18rem)', 'clamp(11rem, 22vw, 22rem)'],
} as const

/** Surcharges CSS de l'identité — vide si tout est aux défauts de la
    charte. Valeurs bornées par Zod : rien d'injectable. */
export function identityCss(input: unknown): string {
  const identity = parseIdentity(input)
  const out: string[] = []

  if (identity.accent) out.push(`--color-blue-deep:${identity.accent}`)
  if (identity.accentSoft) out.push(`--color-blue:${identity.accentSoft}`)
  if (identity.mist) out.push(`--color-blue-mist:${identity.mist}`)
  if (identity.buttonRadius !== undefined) {
    out.push(`--button-radius:${identity.buttonRadius}px`)
  }
  if (identity.spacing && identity.spacing !== 'normal') {
    const [normal, lg] = SPACING[identity.spacing]
    out.push(`--spacing-section:${normal}`, `--spacing-section-lg:${lg}`)
  }

  return out.length > 0 ? `:root{${out.join(';')}}` : ''
}
