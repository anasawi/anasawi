import { COULEURS_MODERNES, type StyleModerne } from '@/lib/style-moderne'

/**
 * LES TEINTES DU SITE MODERNE — les couleurs de la palette (Réglages ›
 * Apparence), pures, et leurs nuances. C'est le SEUL nuancier : le fond
 * d'une section et ses panneaux s'y choisissent, et il suit la palette
 * (changer le bleu change toutes les nuances de bleu).
 *
 * Une teinte est enregistrée par son nom (« bleu-2 »), pas par sa
 * couleur : le rendu la calcule en CSS à partir des variables SOURCE de
 * la palette (« --ad-p-… », voir globals.css).
 *
 * CONTRASTE AUTOMATIQUE. Sur une teinte foncée (bleu nuit, bleu clair
 * pur…), les textes passent en clair d'eux-mêmes ; les cartes claires
 * posées dessus (blanches, sable) gardent leurs textes foncés, et les
 * boutons bleu nuit s'inversent. « Foncée » se calcule sur la vraie
 * couleur de la palette : si Anne change son bleu, le choix suit.
 */

type Base = 'ivoire' | 'blanc' | 'sable' | 'nuit' | 'bleu' | 'turquoise'

export type Teinte = { id: string; nom: string; base: Base; /** Part de la couleur mêlée au blanc (1 : la couleur pure ; > 1 : assombrie). */ part: number }

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
      { id: 'bleu-4', nom: 'Bleu moyen', base: 'bleu', part: 0.6 },
      { id: 'bleu', nom: 'Bleu clair', base: 'bleu', part: 1 },
    ],
  },
  {
    nom: 'Turquoise',
    teintes: [
      { id: 'turquoise-1', nom: 'Turquoise très pâle', base: 'turquoise', part: 0.1 },
      { id: 'turquoise-2', nom: 'Turquoise pâle', base: 'turquoise', part: 0.2 },
      { id: 'turquoise-3', nom: 'Turquoise doux', base: 'turquoise', part: 0.34 },
      { id: 'turquoise-4', nom: 'Turquoise moyen', base: 'turquoise', part: 0.65 },
      { id: 'turquoise', nom: 'Turquoise', base: 'turquoise', part: 1 },
    ],
  },
  {
    nom: 'Bleu nuit',
    teintes: [
      { id: 'nuit-1', nom: 'Gris bleuté très pâle', base: 'nuit', part: 0.06 },
      { id: 'nuit-2', nom: 'Gris bleuté pâle', base: 'nuit', part: 0.12 },
      { id: 'nuit-3', nom: 'Gris bleuté doux', base: 'nuit', part: 0.2 },
      { id: 'nuit-4', nom: 'Bleu ardoise', base: 'nuit', part: 0.75 },
      { id: 'nuit', nom: 'Bleu nuit', base: 'nuit', part: 1 },
    ],
  },
]

export const TEINTES: Teinte[] = GROUPES_TEINTES.flatMap((g) => g.teintes)
export const IDS_TEINTES = TEINTES.map((t) => t.id) as [string, ...string[]]

/** La variable SOURCE de la couleur de base (jamais redéfinie par une section). */
const VAR: Record<Base, string> = {
  ivoire: 'var(--ad-p-ivoire)',
  blanc: '#ffffff',
  sable: 'var(--ad-p-sable)',
  nuit: 'var(--ad-p-nuit)',
  bleu: 'var(--ad-p-bleu)',
  turquoise: 'var(--ad-p-or)',
}

/** La couleur CSS d'une teinte (calculée à partir de la palette). */
export function teinteCss(t: Teinte): string {
  if (t.part === 1) return VAR[t.base]
  if (t.part > 1) return `color-mix(in srgb, ${VAR[t.base]} ${Math.round(100 - (t.part - 1) * 30)}%, #7a5a33)`
  return `color-mix(in srgb, ${VAR[t.base]} ${Math.round(t.part * 100)}%, white)`
}

/* ── Contraste ─────────────────────────────────────────────────────────── */

/** Les textes CLAIRS, pour une teinte foncée. */
const TEXTES_CLAIRS = [
  '--ad-nuit:var(--ad-p-ivoire)',
  '--ad-pierre:color-mix(in srgb,var(--ad-p-ivoire) 86%,transparent)',
  '--ad-gris:color-mix(in srgb,var(--ad-p-ivoire) 68%,transparent)',
  '--ad-bleu:color-mix(in srgb,var(--ad-p-bleu) 40%,white)',
  '--ad-bleu-clair:color-mix(in srgb,var(--ad-p-bleu) 30%,white)',
  '--ad-brume:rgb(255 255 255/.1)',
  '--ad-sable-fonce:rgb(255 255 255/.22)',
  '--ad-accent-pale:rgb(255 255 255/.1)',
  '--ad-accent-trait:rgb(255 255 255/.32)',
  '--ad-touche-pale:rgb(255 255 255/.12)',
  '--ad-touche-fonce:color-mix(in srgb,var(--ad-p-or) 55%,white)',
].join(';')

/** Sur une teinte MOYENNE (turquoise pur, bleu moyen…) : textes foncés, mais
    tous en bleu nuit — le bleu clair et les gris ne s'y liraient pas. */
const TEXTES_MOYENS = [
  '--ad-bleu:color-mix(in srgb,var(--ad-p-nuit) 82%,var(--ad-p-bleu))',
  '--ad-pierre:var(--ad-p-nuit)',
  '--ad-gris:color-mix(in srgb,var(--ad-p-nuit) 78%,transparent)',
  '--ad-sable-fonce:rgb(255 255 255/.35)',
  '--ad-accent-trait:color-mix(in srgb,var(--ad-p-nuit) 35%,transparent)',
  '--ad-touche-fonce:var(--ad-p-nuit)',
].join(';')

/** Les textes d'origine (FONCÉS), pour une surface claire posée sur une teinte foncée. */
const TEXTES_FONCES = [
  '--ad-nuit:var(--ad-p-nuit)',
  '--ad-pierre:#574d45',
  '--ad-gris:#857869',
  '--ad-bleu:var(--ad-p-bleu)',
  '--ad-bleu-clair:color-mix(in srgb,var(--ad-p-bleu) 62%,white)',
  '--ad-brume:color-mix(in srgb,var(--ad-p-bleu) 11%,white)',
  '--ad-sable-fonce:color-mix(in srgb,var(--ad-p-sable) 86%,#7a5a33)',
  '--ad-ivoire:var(--ad-p-ivoire)',
  '--ad-accent-pale:var(--ad-brume)',
  '--ad-accent-trait:rgb(70 114 138/.32)',
  '--ad-touche-pale:color-mix(in srgb,var(--ad-p-or) 16%,white)',
  '--ad-touche-fonce:color-mix(in srgb,var(--ad-p-or) 78%,black)',
].join(';')

/** Les surfaces claires d'un bloc (le nom exact de la classe, pas ses variantes « /90 »). */
const SURFACES_CLAIRES = `:is(.ad-surface,${['bg-white', ...[55, 70, 75, 80, 85, 90, 95].map((o) => `bg-white/${o}`), 'bg-[var(--ad-brume)]']
  .map((c) => `[class~="${c}"]`)
  .join(',')})`
const PANNEAUX = '[class~="bg-[var(--ad-sable)]"]'
const BOUTONS = '[class~="bg-[var(--ad-nuit)]"]'

/* ── Couleurs exactes (admin, contraste) ───────────────────────────────── */

const hexVers = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const versHex = (c: number[]) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
const melange = (a: string, b: string, part: number) => {
  const x = hexVers(a)
  const y = hexVers(b)
  return versHex(x.map((v, i) => v * part + y[i]! * (1 - part)))
}
const luminance = (h: string) => {
  const [r, g, b] = hexVers(h).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
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

/** Vrai si la teinte, claire, l'est trop peu pour les gris et le bleu clair. */
export function teinteMoyenne(t: Teinte, style: StyleModerne | undefined): boolean {
  return !teinteFoncee(t, style) && luminance(teinteHex(t, style)) < 0.45
}

/** Vrai si, sur cette teinte, un texte clair se lit mieux que le bleu nuit. */
export function teinteFoncee(t: Teinte, style: StyleModerne | undefined): boolean {
  const fond = luminance(teinteHex(t, style))
  const clair = luminance(style?.couleurs?.ivoire ?? COULEURS_MODERNES.ivoire.defaut)
  const fonce = luminance(style?.couleurs?.nuit ?? COULEURS_MODERNES.nuit.defaut)
  const contraste = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  return contraste(fond, clair) > contraste(fond, fonce)
}

/* ── La feuille ────────────────────────────────────────────────────────── */

/** La feuille des teintes : fonds de section, panneaux, et le contraste qui va avec. */
export function teintesCss(style?: StyleModerne): string {
  /* Le `.ad` de la section (pas un `.ad` imbriqué, ni celui de la page qui
     l'entoure sur le site public). */
  const adDe = (attr: string, id: string) => `[${attr}='${id}'] .ad:not([data-fond] .ad .ad)`
  const fonds = TEINTES.filter((t) => t.id !== 'fond').map((t) => {
    const c = teinteCss(t)
    const ad = adDe('data-fond', t.id)
    /* Le « fond » de la section devient cette teinte : fondus, anneaux et
       découpes faits pour se fondre dans le fond suivent. */
    let css = `${ad}{--ad-ivoire:${c};background-color:${c}}`
    if (teinteMoyenne(t, style))
      css +=
        `${ad},${ad} :is(.ad-joie,.ad-accentue){${TEXTES_MOYENS}}` +
        `${ad} ${SURFACES_CLAIRES}{${TEXTES_FONCES}}`
    if (teinteFoncee(t, style))
      css +=
        `${ad},${ad} :is(.ad-joie,.ad-accentue){${TEXTES_CLAIRS}}${ad}{color:var(--ad-p-ivoire)}` +
        /* Sans teinte de panneaux choisie, les panneaux d'une section foncée
           sont un ton plus clair que son fond (pas un aplat sable criard). */
        `[data-fond='${t.id}']:not([data-panneau]) .ad:not([data-fond] .ad .ad){--ad-sable:color-mix(in srgb,${c} 88%,white)}` +
        /* … sauf posés dans une carte claire : là, le sable d'origine. */
        `[data-fond='${t.id}']:not([data-panneau]) .ad:not([data-fond] .ad .ad) ${SURFACES_CLAIRES}{--ad-sable:var(--ad-p-sable)}` +
        `${ad} ${SURFACES_CLAIRES}{${TEXTES_FONCES};color:var(--ad-p-nuit)}` +
        /* Les BOUTONS bleu nuit s'inversent (leur fond suit --ad-nuit, devenu
           clair) : texte foncé. Les autres blocs bleu nuit (bulles, bandeaux)
           restent foncés, un ton plus clair que le fond, textes clairs. */
        `${ad} ${BOUTONS}:is(a,button):not(${SURFACES_CLAIRES} *){color:var(--ad-p-nuit)}` +
        `${ad} ${BOUTONS}:not(a,button):not(${SURFACES_CLAIRES} *){background-color:color-mix(in srgb,var(--ad-p-nuit) 86%,white)}`
    return css
  })
  /* Les panneaux, APRÈS les fonds : un panneau foncé l'emporte sur la
     remise en foncé des surfaces claires. */
  const panneaux = TEINTES.map((t) => {
    const c = teinteCss(t)
    let css = `[data-panneau='${t.id}'] .ad,.ad [data-panneau='${t.id}']{--ad-sable:${c}}`
    if (teinteFoncee(t, style)) css += `${adDe('data-panneau', t.id)} ${PANNEAUX}{${TEXTES_CLAIRS};color:var(--ad-p-ivoire)}`
    /* Panneaux clairs choisis sur un fond de section (foncé ou non) : textes foncés. */
    else {
      css += `[data-fond]${adDe('data-panneau', t.id)} ${PANNEAUX}{${TEXTES_FONCES};color:var(--ad-p-nuit)}`
      /* Panneau de teinte moyenne : textes tous en bleu nuit (après la ligne d'avant). */
      if (teinteMoyenne(t, style)) css += `[data-panneau='${t.id}'][data-panneau] .ad:not([data-fond] .ad .ad) ${PANNEAUX}{${TEXTES_MOYENS}}`
    }
    return css
  })
  return [...fonds, ...panneaux].join('\n')
}
