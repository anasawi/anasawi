import { aboutBlock } from './about'
import { approachBlock } from './approach'
import {
  buttonBlock,
  headingBlock,
  imageBlock,
  listBlock,
  textBlock,
} from './content'
import {
  accordeonBlock,
  avatarBlock,
  barreBlock,
  encartBlock,
  galerieBlock,
  ongletsBlock,
  tableauBlock,
  tarifBlock,
} from './composites'
import { contactBlock } from './contact'
import { ctaBlock } from './cta'
import {
  accesBlock,
  atoutBlock,
  badgeBlock,
  carteBlock,
  citationBlock,
  coordonneesBlock,
  horairesBlock,
  reseauxBlock,
  statBlock,
  temoignageBlock,
  videoBlock,
} from './extras'
import { faqBlock } from './faq'
import { galleryBlock } from './gallery'
import { heroBlock } from './hero'
import { imageTextBlock } from './image-text'
import {
  canvasBlock,
  columnsBlock,
  dividerBlock,
  spacerBlock,
} from './layout'
import { quoteBlock } from './quote'
import { servicesBlock } from './services'
import {
  aproposAsymetriqueBlock,
  aproposParcoursBlock,
  aproposPortraitBlock,
} from './templates/apropos'
import {
  approcheColonnesBlock,
  processusVerticalBlock,
} from './templates/approche'
import { contactMinimalBlock } from './templates/contact'
import { ctaImageBlock, ctaImmersifBlock } from './templates/cta'
import {
  imagePleineBlock,
  manifesteBlock,
  texteCentreBlock,
} from './templates/editorial'
import { faqEditorialeBlock } from './templates/faq'
import {
  heroEditorialBlock,
  heroMinimalBlock,
  heroPleinEcranBlock,
} from './templates/heros'
import {
  servicesImmersifsBlock,
  servicesListeBlock,
  servicesNumerotesBlock,
} from './templates/services'
import {
  temoignageGrandBlock,
  temoignageSimpleBlock,
  temoignagesMultiplesBlock,
} from './templates/temoignages'
import { viergeBlock } from './templates/vierge'
import type { AnyBlockDefinition } from './types'

/**
 * Registre des blocs.
 *
 * Trois familles :
 *
 * - **Sections** — grandes compositions éditoriales. Elles supposent toute la
 *   largeur et ne peuvent pas être déposées dans une colonne.
 * - **Contenu** — briques fines : titre, texte, image, bouton, liste. Elles
 *   n'ont aucune hypothèse sur la largeur disponible, donc tiennent aussi bien
 *   en pleine page que dans un tiers de colonne.
 * - **Mise en page** — colonnes, filet, espace.
 *
 * Ajouter un type de section reste une seule ligne ici.
 */
export const blockRegistry = {
  /* Sections — la section libre d'abord : c'est le point de départ de
     toute composition personnalisée. */
  columns: columnsBlock,
  canvas: canvasBlock,
  hero: heroBlock,
  about: aboutBlock,
  services: servicesBlock,
  approach: approachBlock,
  faq: faqBlock,
  contact: contactBlock,
  quote: quoteBlock,
  imageText: imageTextBlock,
  gallery: galleryBlock,
  cta: ctaBlock,

  /* Sections — bibliothèque de templates. */
  sectionVierge: viergeBlock,
  heroPleinEcran: heroPleinEcranBlock,
  heroEditorial: heroEditorialBlock,
  heroMinimal: heroMinimalBlock,
  aproposPortrait: aproposPortraitBlock,
  aproposAsymetrique: aproposAsymetriqueBlock,
  aproposParcours: aproposParcoursBlock,
  servicesListe: servicesListeBlock,
  servicesNumerotes: servicesNumerotesBlock,
  servicesImmersifs: servicesImmersifsBlock,
  texteCentre: texteCentreBlock,
  manifeste: manifesteBlock,
  imagePleine: imagePleineBlock,
  approcheColonnes: approcheColonnesBlock,
  processusVertical: processusVerticalBlock,
  temoignageSimple: temoignageSimpleBlock,
  temoignageGrand: temoignageGrandBlock,
  temoignagesMultiples: temoignagesMultiplesBlock,
  faqEditoriale: faqEditorialeBlock,
  ctaImage: ctaImageBlock,
  ctaImmersif: ctaImmersifBlock,
  contactMinimal: contactMinimalBlock,

  /* Contenu */
  heading: headingBlock,
  text: textBlock,
  image: imageBlock,
  button: buttonBlock,
  list: listBlock,
  badge: badgeBlock,
  citation: citationBlock,
  stat: statBlock,
  carte: carteBlock,
  atout: atoutBlock,
  temoignage: temoignageBlock,
  accordeon: accordeonBlock,
  onglets: ongletsBlock,
  tableau: tableauBlock,
  tarif: tarifBlock,
  galerie: galerieBlock,
  avatar: avatarBlock,
  encart: encartBlock,
  barre: barreBlock,
  video: videoBlock,
  acces: accesBlock,
  coordonnees: coordonneesBlock,
  horaires: horairesBlock,
  reseaux: reseauxBlock,

  /* Mise en page */
  divider: dividerBlock,
  spacer: spacerBlock,
} as const satisfies Record<string, AnyBlockDefinition>

export type BlockType = keyof typeof blockRegistry

export const blockTypes = Object.keys(blockRegistry) as BlockType[]

export function isBlockType(value: string): value is BlockType {
  return value in blockRegistry
}

export function getBlock(type: string): AnyBlockDefinition | null {
  return isBlockType(type) ? blockRegistry[type] : null
}

export type BlockOption = {
  type: BlockType
  label: string
  description: string
  group: AnyBlockDefinition['group']
  suggestedAnchor: string
  navigable: boolean
  container: boolean
  inline: boolean
}

/** Liste destinée à la palette du constructeur. */
export const blockOptions: BlockOption[] = blockTypes.map((type) => {
  const block = blockRegistry[type]
  return {
    type,
    label: block.label,
    description: block.description,
    group: block.group,
    suggestedAnchor: block.suggestedAnchor ?? '',
    navigable: block.navigable ?? false,
    container: block.container ?? false,
    inline: block.inline ?? false,
  }
})

/** Palette groupée par famille, dans l'ordre d'affichage voulu. */
export const blockGroups = (
  ['Contenu', 'Mise en page', 'Sections'] as const
).map((group) => ({
  group,
  options: blockOptions.filter((option) => option.group === group),
}))

/* ════════════════════════════════════════════════════════════════════
   Bibliothèque de templates de sections.

   Le CMS repose sur des sections toutes conçues : l'admin choisit un
   template dans cette bibliothèque, puis remplit ses informations — la
   mise en page, le responsive et les animations sont l'affaire du
   composant. Ajouter un template = un composant + une entrée ici.
   ════════════════════════════════════════════════════════════════════ */

export const TEMPLATE_CATEGORIES = [
  'Base',
  'Hero',
  'À propos',
  'Accompagnements',
  'Éditorial',
  'Approche',
  'Témoignages',
  'FAQ',
  'Appel à l’action',
  'Contact',
] as const

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]

/** Catégorie de chaque template. Un type absent d'ici (primitives du
    rendu interne : titre, image, colonnes…) n'apparaît pas dans la
    bibliothèque. */
const CATEGORY_OF: Partial<Record<BlockType, TemplateCategory>> = {
  sectionVierge: 'Base',
  hero: 'Hero',
  heroPleinEcran: 'Hero',
  heroEditorial: 'Hero',
  heroMinimal: 'Hero',
  about: 'À propos',
  aproposPortrait: 'À propos',
  aproposAsymetrique: 'À propos',
  aproposParcours: 'À propos',
  services: 'Accompagnements',
  servicesListe: 'Accompagnements',
  servicesNumerotes: 'Accompagnements',
  servicesImmersifs: 'Accompagnements',
  approach: 'Approche',
  approcheColonnes: 'Approche',
  processusVertical: 'Approche',
  temoignageSimple: 'Témoignages',
  temoignageGrand: 'Témoignages',
  temoignagesMultiples: 'Témoignages',
  faq: 'FAQ',
  faqEditoriale: 'FAQ',
  contact: 'Contact',
  contactMinimal: 'Contact',
  quote: 'Éditorial',
  imageText: 'Éditorial',
  gallery: 'Éditorial',
  texteCentre: 'Éditorial',
  manifeste: 'Éditorial',
  imagePleine: 'Éditorial',
  cta: 'Appel à l’action',
  ctaImage: 'Appel à l’action',
  ctaImmersif: 'Appel à l’action',
}

export type TemplateOption = BlockOption & { category: TemplateCategory }

/** Bibliothèque groupée par catégorie, dans l'ordre de lecture d'un site. */
export const templateLibrary = TEMPLATE_CATEGORIES.map((category) => ({
  category,
  options: blockOptions
    .filter((option) => CATEGORY_OF[option.type] === category)
    .map((option): TemplateOption => ({ ...option, category })),
})).filter((group) => group.options.length > 0)

export function isTemplateType(type: string): boolean {
  return isBlockType(type) && CATEGORY_OF[type] !== undefined
}
