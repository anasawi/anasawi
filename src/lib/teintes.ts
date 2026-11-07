import { COULEURS_MODERNES, type StyleModerne } from '@/lib/style-moderne'

/**
 * LES TEINTES DU SITE MODERNE — les couleurs de la palette (Réglages ›
 * Apparence) et leurs nuances claires. C'est le SEUL nuancier : le fond
 * d'une section et ses panneaux s'y choisissent, et il suit la palette
 * (changer le bleu change toutes les nuances de bleu).
 *
 * Une teinte est enregistrée par son nom (« bleu-2 »), pas par sa
 * couleur : le rendu la calcule en CSS à partir des variables de la
 * palette (voir la feuille générée par `teintesCss`).
 */

type Base = 'ivoire' | 'blanc' | 'sable' | 'nuit' | 'bleu' | 'turquoise'

export type Teinte = { id: string; nom: string; base: Base; /** Part de la couleur mêlée au blanc (1 : la couleur pure). */ part: number }

export const GROUPES_TEINTES: { nom: string; teintes: Teinte[] }[] = [
  {
    nom: 'Fonds',
    teintes: [
      { id: 'fond', nom: 'Fond du site', base: 'ivoire', part: 1 },
      { id: 'blanc', nom: 'Blanc', base: 'blanc', part: 1 },
    ],
  },
  {
    nom: 'Sable',
    teintes: [
      { id: 'sable-1', nom: 'Sable clair', base: 'sable', part: 0.5 },
      { id: 'sable', nom: 'Sable', base: 'sable', part: 1 },
      { id: 'sable-3', nom: 'Sable soutenu', base: 'sable', part: 1.6 },
    ],
  },
  {
    nom: 'Bleu clair',
    teintes: [
      { id: 'bleu-1', nom: 'Bleu très pâle', base: 'bleu', part: 0.08 },
      { id: 'bleu-2', nom: 'Bleu pâle', base: 'bleu', part: 0.16 },
      { id: 'bleu-3', nom: 'Bleu doux', base: 'bleu', part: 0.28 },
    ],
  },
  {
    nom: 'Turquoise',
    teintes: [
      { id: 'turquoise-1', nom: 'Turquoise très pâle', base: 'turquoise', part: 0.1 },
      { id: 'turquoise-2', nom: 'Turquoise pâle', base: 'turquoise', part: 0.2 },
      { id: 'turquoise-3', nom: 'Turquoise doux', base: 'turquoise', part: 0.34 },
    ],
  },
  {
    nom: 'Bleu nuit',
    teintes: [
      { id: 'nuit-1', nom: 'Gris bleuté très pâle', base: 'nuit', part: 0.06 },
      { id: 'nuit-2', nom: 'Gris bleuté pâle', base: 'nuit', part: 0.12 },
      { id: 'nuit-3', nom: 'Gris bleuté doux', base: 'nuit', part: 0.2 },
    ],
  },
]

export const TEINTES: Teinte[] = GROUPES_TEINTES.flatMap((g) => g.teintes)
export const IDS_TEINTES = TEINTES.map((t) => t.id) as [string, ...string[]]

/** La variable CSS de la couleur de base (« palette source », jamais redéfinie par une section). */
const VAR: Record<Base, string> = {
  ivoire: 'var(--ad-ivoire)',
  blanc: '#ffffff',
  sable: 'var(--ad-p-sable)',
  nuit: 'var(--ad-nuit)',
  bleu: 'var(--ad-bleu)',
  turquoise: 'var(--ad-or)',
}

/** La couleur CSS d'une teinte (calculée à partir de la palette). */
export function teinteCss(t: Teinte): string {
  if (t.part === 1) return VAR[t.base]
  if (t.part > 1) return `color-mix(in srgb, ${VAR[t.base]} ${Math.round(100 - (t.part - 1) * 30)}%, #7a5a33)`
  return `color-mix(in srgb, ${VAR[t.base]} ${Math.round(t.part * 100)}%, white)`
}

/** La feuille des teintes : fonds de section et panneaux. */
export function teintesCss(): string {
  return TEINTES.map((t) => {
    const c = teinteCss(t)
    /* Le fond se peint sur le `.ad` de la section (pas sur la section
       elle-même) : c'est là que vivent les variables de la palette. */
    return `[data-fond='${t.id}'] .ad:not(.ad .ad){background-color:${c}}[data-panneau='${t.id}'] .ad,.ad [data-panneau='${t.id}']{--ad-sable:${c}}`
  }).join('\n')
}

/* ── Pour l'admin : la couleur hexadécimale d'une teinte, d'après la palette ── */

const hexVers = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const versHex = (c: number[]) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
const melange = (a: string, b: string, part: number) => {
  const x = hexVers(a)
  const y = hexVers(b)
  return versHex(x.map((v, i) => v * part + y[i]! * (1 - part)))
}

export function teinteHex(t: Teinte, style: StyleModerne | undefined): string {
  const c = style?.couleurs ?? {}
  const base: Record<Base, string> = {
    ivoire: c.ivoire ?? COULEURS_MODERNES.ivoire.defaut,
    blanc: '#ffffff',
    sable: c.sable ?? COULEURS_MODERNES.sable.defaut,
    nuit: c.nuit ?? COULEURS_MODERNES.nuit.defaut,
    bleu: c.bleu ?? COULEURS_MODERNES.bleu.defaut,
    turquoise: c.turquoise ?? COULEURS_MODERNES.turquoise.defaut,
  }
  if (t.part === 1) return base[t.base]
  if (t.part > 1) return melange(base[t.base], '#7a5a33', (100 - (t.part - 1) * 30) / 100)
  return melange(base[t.base], '#ffffff', t.part)
}
