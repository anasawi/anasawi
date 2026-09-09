/**
 * Calculs de contraste et dérivation d'un thème de section.
 *
 * Le principe : le CMS ne stocke qu'une couleur de fond. Tout le reste —
 * couleur du texte, du texte secondaire, des filets — en est déduit, de sorte
 * qu'aucun réglage ne peut produire une section illisible.
 */

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export function isHexColor(value: string): boolean {
  return HEX.test(value.trim())
}

/** Normalise `#abc` en `#aabbcc`, minuscules. */
export function normalizeHex(value: string): string {
  const raw = value.trim().toLowerCase()
  if (!HEX.test(raw)) return '#fbf8f2'
  if (raw.length === 4) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`
  }
  return raw
}

type Rgb = { r: number; g: number; b: number }

export function hexToRgb(hex: string): Rgb {
  const normalized = normalizeHex(hex)
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  }
}

function toHex({ r, g, b }: Rgb): string {
  const part = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`
}

/** Luminance relative WCAG 2.1. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)

  const channel = (value: number) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Rapport de contraste WCAG entre deux couleurs, de 1 à 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [light, dark] = la > lb ? [la, lb] : [lb, la]
  return (light + 0.05) / (dark + 0.05)
}

/** Mélange linéaire de deux couleurs. `amount` = part de `from`. */
function mix(from: string, to: string, amount: number): string {
  const a = hexToRgb(from)
  const b = hexToRgb(to)
  return toHex({
    r: a.r * amount + b.r * (1 - amount),
    g: a.g * amount + b.g * (1 - amount),
    b: a.b * amount + b.b * (1 - amount),
  })
}

const INK = '#2b2f2c'
const IVORY = '#fbf8f2'

/**
 * Choisit l'encre la plus lisible sur un fond donné.
 *
 * On compare les deux contrastes réels plutôt que d'appliquer un seuil de
 * luminance fixe : sur les teintes moyennes — un bleu ardoise, un vert
 * olive — le seuil se trompe régulièrement d'un côté ou de l'autre.
 */
export function readableInk(background: string): string {
  return contrastRatio(background, INK) >= contrastRatio(background, IVORY)
    ? INK
    : IVORY
}

export type SectionTheme = {
  background: string
  foreground: string
  /** Variables CSS à poser sur la section. */
  vars: Record<string, string>
  /** Vrai si le fond est sombre — sert à ajuster le grain. */
  isDark: boolean
  /** Contraste effectif du texte principal, pour l'indicateur du CMS. */
  contrast: number
}

/**
 * Dérive un thème complet à partir d'une seule couleur de fond.
 *
 * Les valeurs écrasent les tokens globaux (`--color-ink`, `--color-line`…)
 * directement sur l'élément `<section>`. Comme Tailwind v4 compile `text-ink`
 * en `color: var(--color-ink)`, chaque enfant hérite du bon contraste sans
 * qu'une seule ligne des composants de bloc ait à changer.
 *
 * Les niveaux intermédiaires sont des mélanges vers le fond plutôt que des
 * gris fixes : sur un fond bleu, le texte secondaire reste dans la famille du
 * bleu au lieu de virer au gris sale.
 */
export function sectionTheme(backgroundInput: string): SectionTheme {
  const background = normalizeHex(backgroundInput)
  const foreground = readableInk(background)
  const isDark = foreground === IVORY

  return {
    background,
    foreground,
    isDark,
    contrast: contrastRatio(background, foreground),
    vars: {
      '--color-ink': foreground,
      '--color-ink-soft': mix(foreground, background, 0.78),
      '--color-stone': mix(foreground, background, 0.55),
      '--color-line': mix(foreground, background, 0.14),
      '--color-line-strong': mix(foreground, background, 0.26),
      /* Le bleu d'accent ne survit pas sur tous les fonds : sur un fond
         sombre ou déjà bleu, on le remplace par l'encre courante atténuée. */
      '--color-blue-deep': isDark
        ? mix(foreground, background, 0.82)
        : '#46728a',
    },
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Palette proposée dans le CMS

   Aucune teinte inventée : ce sont les quatre familles de la charte —
   ivoire, bleu, gris chaud, anthracite — déclinées en valeurs plus claires
   et plus soutenues. Un nuancier générique donnerait plus de choix, mais
   permettrait de composer une page qui n'appartient plus au site.

   Les valeurs marquées « charte » sont exactement les tokens de
   `globals.css` ; les autres sont des paliers de la même teinte.
   ══════════════════════════════════════════════════════════════════════ */

export type SwatchGroup = {
  label: string
  swatches: readonly { hex: string; name: string }[]
}

export const SECTION_SWATCH_GROUPS: readonly SwatchGroup[] = [
  {
    label: 'Ivoire',
    swatches: [
      { hex: '#fbf8f2', name: 'Ivoire — charte' },
      { hex: '#f8f4ea', name: 'Crème — charte' },
      { hex: '#f4eee3', name: 'Sable — charte' },
      { hex: '#eae2d2', name: 'Ivoire profond' },
    ],
  },
  {
    label: 'Bleu',
    swatches: [
      { hex: '#eaf1f4', name: 'Bleu brume — charte' },
      { hex: '#d9e6ec', name: 'Bleu brume soutenu' },
      { hex: '#b9d0dc', name: 'Bleu clair' },
      { hex: '#7ba3b6', name: 'Bleu accent — charte' },
      { hex: '#46728a', name: 'Bleu profond — charte' },
      { hex: '#2f5a70', name: 'Bleu encre — charte' },
    ],
  },
  {
    label: 'Gris chaud',
    swatches: [
      { hex: '#f1efec', name: 'Gris très clair' },
      { hex: '#e2ddd6', name: 'Gris clair' },
      { hex: '#c2bcb4', name: 'Gris moyen' },
      { hex: '#98988e', name: 'Gris chaud — charte' },
    ],
  },
  {
    label: 'Encre',
    swatches: [
      { hex: '#565c56', name: 'Encre douce — charte' },
      { hex: '#2e424f', name: 'Nuit — charte' },
      { hex: '#2b2f2c', name: 'Encre — charte' },
    ],
  },
]

/** Liste à plat — pour retrouver le nom d'une couleur enregistrée. */
export const SECTION_SWATCHES = SECTION_SWATCH_GROUPS.flatMap(
  (group) => group.swatches,
)

export const DEFAULT_SECTION_COLOR = '#fbf8f2'
