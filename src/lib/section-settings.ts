import { z } from 'zod'

/**
 * Réglages non-contenu d'une section : son animation d'apparition et son
 * ornement décoratif. Des presets, pas un outil d'animation ni un éditeur
 * de dessin — quelques entrées sobres. `prefers-reduced-motion` est
 * respecté au rendu.
 */

/** Motifs « ondes et respiration » — décor au trait, posé en filigrane. */
export const ORNAMENT_MOTIFS = [
  'aucun',
  'ondes',
  'cercles',
  'arche',
  'soleil',
  'spirale',
  'horizon',
] as const

export const ORNAMENT_POSITIONS = [
  'haut-gauche',
  'haut-droite',
  'bas-gauche',
  'bas-droite',
  'centre',
] as const

export const ORNAMENT_SIZES = ['petit', 'moyen', 'grand'] as const

/** Forme du bord BAS d'une section : la façon dont son fond se déverse
    dans la section suivante. `aucun` = une ligne droite. */
export const SECTION_EDGES = [
  'aucun',
  'vague',
  'courbe',
  'arche',
  'ondulation',
  'oblique',
] as const

export type SectionEdge = (typeof SECTION_EDGES)[number]

export type OrnamentMotif = (typeof ORNAMENT_MOTIFS)[number]
export type OrnamentPosition = (typeof ORNAMENT_POSITIONS)[number]
export type OrnamentSize = (typeof ORNAMENT_SIZES)[number]

export const sectionSettingsSchema = z
  .object({
    animation: z.enum(['aucune', 'fade', 'fade-up', 'scale']).default('aucune'),
    /** Décalage au déclenchement, en secondes. */
    delay: z.number().min(0).max(2).default(0),
    /** Durée, en secondes. */
    duration: z.number().min(0.2).max(2).default(0.8),
    /** Décor au trait posé par-dessus la section. */
    ornament: z.enum(ORNAMENT_MOTIFS).default('aucun'),
    ornamentPosition: z.enum(ORNAMENT_POSITIONS).default('haut-droite'),
    ornamentSize: z.enum(ORNAMENT_SIZES).default('moyen'),
    /** Bord bas de la section — dessiné en haut de la suivante. */
    edge: z.enum(SECTION_EDGES).default('aucun'),
  })
  .strict()

export type SectionSettings = z.infer<typeof sectionSettingsSchema>

export const DEFAULT_SECTION_SETTINGS: SectionSettings = {
  animation: 'aucune',
  delay: 0,
  duration: 0.8,
  ornament: 'aucun',
  ornamentPosition: 'haut-droite',
  ornamentSize: 'moyen',
  edge: 'aucun',
}

export function parseSectionSettings(input: unknown): SectionSettings {
  const parsed = sectionSettingsSchema.safeParse(input)
  if (parsed.success) return parsed.data

  /* Réglages enregistrés avant l'arrivée des ornements : on récupère ce
     qui est valide plutôt que de tout jeter. */
  const partial = sectionSettingsSchema.partial().safeParse(input)
  return partial.success
    ? { ...DEFAULT_SECTION_SETTINGS, ...partial.data }
    : DEFAULT_SECTION_SETTINGS
}
