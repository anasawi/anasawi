import { z } from 'zod'

/**
 * Réglages non-contenu d'une section — aujourd'hui : son animation
 * d'apparition. Des presets, pas un outil d'animation : quatre entrées
 * sobres, un délai, une durée. `prefers-reduced-motion` est respecté au
 * rendu.
 */
export const sectionSettingsSchema = z
  .object({
    animation: z.enum(['aucune', 'fade', 'fade-up', 'scale']).default('aucune'),
    /** Décalage au déclenchement, en secondes. */
    delay: z.number().min(0).max(2).default(0),
    /** Durée, en secondes. */
    duration: z.number().min(0.2).max(2).default(0.8),
  })
  .strict()

export type SectionSettings = z.infer<typeof sectionSettingsSchema>

export const DEFAULT_SECTION_SETTINGS: SectionSettings = {
  animation: 'aucune',
  delay: 0,
  duration: 0.8,
}

export function parseSectionSettings(input: unknown): SectionSettings {
  const parsed = sectionSettingsSchema.safeParse(input)
  return parsed.success ? parsed.data : DEFAULT_SECTION_SETTINGS
}
