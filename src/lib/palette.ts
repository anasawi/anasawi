import { z } from 'zod'

import {
  contrastRatio,
  hexToRgb,
  mix,
  normalizeHex,
  relativeLuminance,
  type SwatchGroup,
} from '@/lib/color'

/**
 * La palette du site — cinq rôles, pas plus.
 *
 * Le CMS ne propose jamais « une couleur » : il propose un RÔLE (le fond, le
 * fond alterné, l'encre, l'accent, l'accent clair). Tout le reste — les gris
 * intermédiaires, les filets, le bleu brume, le fond nuit — est DÉRIVÉ de ces
 * cinq valeurs et ne peut donc pas sortir de la famille de teintes choisie.
 *
 * Les dérivations sont calibrées sur la charte ANASAWI : avec les cinq valeurs
 * par défaut, chaque variable produite retombe à un ou deux points près sur le
 * token d'origine de `globals.css`. Changer une couleur déplace donc toute sa
 * famille, mais ne change pas le site quand on n'y touche pas.
 */

/* ══════════════════════════════════════════════════════════════════════
   Nuances
   ══════════════════════════════════════════════════════════════════════ */

const WHITE = '#ffffff'

/** Le « noir » de la charte : l'encre poussée, jamais un noir neutre —
    c'est ce qui garde les paliers sombres dans la famille de la teinte. */
const BLACK = '#0d0f0d'

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value))

/** Clarté perçue, de 0 (noir) à 1 (blanc) — la luminance dégammée. */
function lightness(hex: string): number {
  return relativeLuminance(hex) ** (1 / 2.2)
}

export const SHADE_KEYS = [
  'lightest',
  'light',
  'base',
  'strong',
  'deep',
] as const

export type ShadeKey = (typeof SHADE_KEYS)[number]

const SHADE_LABELS: Record<ShadeKey, string> = {
  lightest: 'Très clair',
  light: 'Clair',
  base: 'Base',
  strong: 'Soutenu',
  deep: 'Profond',
}

/**
 * Un palier d'une teinte.
 *
 * Les proportions dépendent de la clarté de la couleur d'origine plutôt que
 * d'être fixes : un mélange de 15 % de blanc sur une encre très sombre
 * donnerait un gris pâle illisible, et le même mélange sur un bleu déjà clair
 * ne se verrait pas. Les deux droites ci-dessous sont calées sur les
 * relations de la charte (encre → encre douce → gris chaud, bleu → bleu
 * brume, bleu profond → bleu encre).
 */
export function shade(input: string, key: ShadeKey): string {
  const base = normalizeHex(input)
  if (key === 'base') return base

  const l = lightness(base)

  if (key === 'lightest') {
    return mix(base, WHITE, clamp(0.647 - 0.805 * l, 0.05, 0.62))
  }
  if (key === 'light') {
    return mix(base, WHITE, clamp(0.86 - 0.31 * l, 0.3, 0.94))
  }

  const deep = clamp(0.687 + 0.22 * l, 0.6, 0.93)
  return key === 'deep' ? mix(base, BLACK, deep) : mix(base, BLACK, (1 + deep) / 2)
}

export type Shade = { key: ShadeKey; label: string; hex: string }

/** Les cinq paliers d'une couleur, du plus clair au plus profond. */
export function shadesOf(hex: string): Shade[] {
  return SHADE_KEYS.map((key) => ({
    key,
    label: SHADE_LABELS[key],
    hex: shade(hex, key),
  }))
}

/* ══════════════════════════════════════════════════════════════════════
   Les cinq rôles
   ══════════════════════════════════════════════════════════════════════ */

export const PALETTE_DEFAULTS = {
  /** Le fond principal du site — `--color-ivory`. */
  surface: '#fbf8f2',
  /** Le fond alterné des sections — `--color-sand`. */
  surfaceAlt: '#f4eee3',
  /** L'encre : titres et texte fort — `--color-ink`. */
  ink: '#2b2f2c',
  /** L'accent profond, CTA et labels — `--color-blue-deep`. */
  accent: '#46728a',
  /** L'accent clair, ornements — `--color-blue`. */
  accentSoft: '#7ba3b6',
} as const

export type PaletteRole = keyof typeof PALETTE_DEFAULTS
export type Palette = Record<PaletteRole, string>

export const DEFAULT_PALETTE: Palette = { ...PALETTE_DEFAULTS }

export type PaletteRoleMeta = {
  key: PaletteRole
  label: string
  help: string
  /** Les variables CSS que ce rôle pilote, dérivées comprises. */
  cssVars: string[]
}

export const PALETTE_ROLES: readonly PaletteRoleMeta[] = [
  {
    key: 'surface',
    label: 'Fond principal',
    help: 'Le fond de presque toutes les sections du site.',
    cssVars: ['--color-ivory', '--color-cream'],
  },
  {
    key: 'surfaceAlt',
    label: 'Fond alterné',
    help: 'Le fond des sections qui alternent — un ton plus chaud.',
    cssVars: ['--color-sand', '--color-ivory-warm', '--color-ivory-deep'],
  },
  {
    key: 'ink',
    label: 'Encre',
    help: 'Les titres et le texte. Les gris et les filets en découlent.',
    cssVars: [
      '--color-ink',
      '--color-ink-soft',
      '--color-soft',
      '--color-stone',
      '--color-night',
      '--color-line',
      '--color-line-strong',
    ],
  },
  {
    key: 'accent',
    label: 'Accent profond',
    help: 'Les boutons, les liens et les petits titres en capitales.',
    cssVars: ['--color-blue-deep', '--color-blue-ink'],
  },
  {
    key: 'accentSoft',
    label: 'Accent clair',
    help: 'Les ornements, les filets actifs et les aplats très doux.',
    cssVars: ['--color-blue', '--color-blue-mist'],
  },
]

/* ══════════════════════════════════════════════════════════════════════
   Lecture
   ══════════════════════════════════════════════════════════════════════ */

const hex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .transform((v) => v.toLowerCase())

export const paletteSchema = z
  .object({
    surface: hex.optional(),
    surfaceAlt: hex.optional(),
    ink: hex.optional(),
    accent: hex.optional(),
    accentSoft: hex.optional(),
  })
  .strict()

export type PaletteInput = z.infer<typeof paletteSchema>

/** Complète une palette partielle avec les valeurs de la charte. */
export function parsePalette(input: unknown): Palette {
  const parsed = paletteSchema.safeParse(input ?? {})
  const value: PaletteInput = parsed.success ? parsed.data : {}

  return {
    surface: value.surface ?? PALETTE_DEFAULTS.surface,
    surfaceAlt: value.surfaceAlt ?? PALETTE_DEFAULTS.surfaceAlt,
    ink: value.ink ?? PALETTE_DEFAULTS.ink,
    accent: value.accent ?? PALETTE_DEFAULTS.accent,
    accentSoft: value.accentSoft ?? PALETTE_DEFAULTS.accentSoft,
  }
}

/* L'ancien schéma d'identité — `{ accent, accentSoft, mist }` — reste lisible.
   Les clés inconnues (buttonRadius, spacing…) sont simplement ignorées. */
const identityColorsSchema = z.object({
  palette: paletteSchema.optional(),
  accent: hex.optional(),
  accentSoft: hex.optional(),
  mist: hex.optional(),
})

/**
 * La palette d'une identité enregistrée, ancien ou nouveau format.
 *
 * Rétrocompatibilité : `accent` et `accentSoft` de l'ancien schéma alimentent
 * les rôles de même nom tant que la palette ne les définit pas elle-même.
 */
export function paletteFromIdentity(input: unknown): Palette {
  const parsed = identityColorsSchema.safeParse(input ?? {})
  if (!parsed.success) return { ...DEFAULT_PALETTE }

  const { palette, accent, accentSoft } = parsed.data
  const merged: PaletteInput = { ...(palette ?? {}) }

  if (merged.accent === undefined && accent !== undefined) merged.accent = accent
  if (merged.accentSoft === undefined && accentSoft !== undefined) {
    merged.accentSoft = accentSoft
  }

  return parsePalette(merged)
}

/** L'ancien `mist` — surcharge explicite de `--color-blue-mist` si présent. */
export function paletteMistOverride(input: unknown): string | undefined {
  const parsed = identityColorsSchema.safeParse(input ?? {})
  return parsed.success ? parsed.data.mist : undefined
}

/* ══════════════════════════════════════════════════════════════════════
   Sortie
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Toutes les variables de couleur pilotées par la palette.
 *
 * Chaque valeur est soit un rôle brut, soit un palier de ce rôle : aucune
 * teinte n'est inventée, et rien n'est un gris neutre.
 */
export function paletteVars(palette: Palette): Record<string, string> {
  const { r, g, b } = hexToRgb(palette.ink)
  const line = (alpha: number) => `rgba(${r}, ${g}, ${b}, ${alpha})`

  return {
    /* Surfaces */
    '--color-ivory': palette.surface,
    '--color-cream': mix(palette.surface, palette.surfaceAlt, 0.5),
    '--color-sand': palette.surfaceAlt,
    '--color-ivory-warm': palette.surfaceAlt,
    '--color-ivory-deep': shade(palette.surfaceAlt, 'strong'),

    /* Encre */
    '--color-ink': palette.ink,
    '--color-ink-soft': shade(palette.ink, 'light'),
    '--color-soft': shade(palette.ink, 'light'),
    '--color-stone': shade(palette.ink, 'lightest'),
    /* Le fond nuit : l'encre poussée, teintée vers l'accent — c'est ce qui
       lui donne son bleu sans le détacher de la famille de l'encre. */
    '--color-night': mix(palette.accent, shade(palette.ink, 'deep'), 0.37),
    '--color-line': line(0.09),
    '--color-line-strong': line(0.18),

    /* Accent */
    '--color-blue-deep': palette.accent,
    '--color-blue-ink': shade(palette.accent, 'deep'),
    '--color-blue': palette.accentSoft,
    '--color-blue-mist': shade(palette.accentSoft, 'lightest'),
  }
}

/**
 * Surcharges CSS de la palette, prêtes à être injectées dans un `<style>`.
 *
 * Accepte l'objet identité complet (ancien ou nouveau format). Les valeurs
 * sortent toutes de Zod ou d'un calcul : rien n'est injectable.
 */
export function paletteCss(input: unknown): string {
  const vars = paletteVars(paletteFromIdentity(input))

  const mist = paletteMistOverride(input)
  if (mist) vars['--color-blue-mist'] = mist

  const body = Object.entries(vars)
    .map(([name, value]) => `${name}:${value}`)
    .join(';')

  return `:root{${body}}`
}

/**
 * Le nuancier du CMS — un groupe par rôle, cinq nuances chacun.
 *
 * C'est la seule source de couleurs proposée dans l'administration : les
 * fonds de section ne peuvent donc pas sortir de la palette du site.
 */
export function paletteSwatchGroups(palette: Palette): SwatchGroup[] {
  return PALETTE_ROLES.map((role) => ({
    label: role.label,
    swatches: shadesOf(palette[role.key]).map((item) => ({
      hex: item.hex,
      name: `${role.label} — ${item.label.toLowerCase()}`,
    })),
  }))
}

/** Contraste de l'encre sur le fond principal — l'alerte du CMS. */
export function paletteContrast(palette: Palette): number {
  return contrastRatio(palette.ink, palette.surface)
}
