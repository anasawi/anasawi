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
  aproposCitationBlock,
  aproposMedaillonBlock,
  aproposParcoursBlock,
  aproposPortraitBlock,
} from './templates/apropos'
import {
  approcheColonnesBlock,
  processusVerticalBlock,
} from './templates/approche'
import {
  chiffresClefsBlock,
  engagementsBlock,
  logosPresseBlock,
} from './templates/confiance'
import {
  appelDouxBlock,
  contactCarteBlock,
  contactMinimalBlock,
} from './templates/contact'
import {
  bandeauRespirerBlock,
  citationSouligneeBlock,
  galerieArchesBlock,
  imageLegendeBlock,
  listeAtoutsBlock,
  separateurAsterisqueBlock,
  texteDeuxColonnesBlock,
  videoArcheBlock,
} from './templates/contenu'
import { ctaImageBlock, ctaImmersifBlock } from './templates/cta'
import {
  imagePleineBlock,
  manifesteBlock,
  texteCentreBlock,
} from './templates/editorial'
import { faqEditorialeBlock } from './templates/faq'
import {
  heroBandeauBlock,
  heroEditorialBlock,
  heroMinimalBlock,
  heroPleinEcranBlock,
} from './templates/heros'
import {
  seanceDerouleBlock,
  servicesArchesBlock,
  servicesDetailBlock,
  servicesImmersifsBlock,
  servicesListeBlock,
  servicesNumerotesBlock,
  tarifsSobreBlock,
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
  sectionVierge: viergeBlock,

  /* Se présenter. */
  heroPleinEcran: heroPleinEcranBlock,
  hero: heroBlock,
  heroEditorial: heroEditorialBlock,
  heroMinimal: heroMinimalBlock,
  heroBandeau: heroBandeauBlock,
  about: aboutBlock,
  aproposPortrait: aproposPortraitBlock,
  aproposAsymetrique: aproposAsymetriqueBlock,
  aproposMedaillon: aproposMedaillonBlock,
  aproposCitation: aproposCitationBlock,
  aproposParcours: aproposParcoursBlock,
  approach: approachBlock,
  approcheColonnes: approcheColonnesBlock,
  processusVertical: processusVerticalBlock,

  /* Présenter son offre. */
  servicesListe: servicesListeBlock,
  servicesArches: servicesArchesBlock,
  services: servicesBlock,
  servicesNumerotes: servicesNumerotesBlock,
  servicesImmersifs: servicesImmersifsBlock,
  servicesDetail: servicesDetailBlock,
  seanceDeroule: seanceDerouleBlock,
  tarifsSobre: tarifsSobreBlock,

  /* Inspirer confiance. */
  temoignageGrand: temoignageGrandBlock,
  temoignagesMultiples: temoignagesMultiplesBlock,
  temoignageSimple: temoignageSimpleBlock,
  chiffresClefs: chiffresClefsBlock,
  engagements: engagementsBlock,
  logosPresse: logosPresseBlock,
  faqEditoriale: faqEditorialeBlock,
  faq: faqBlock,

  /* Enrichir le contenu. */
  manifeste: manifesteBlock,
  texteCentre: texteCentreBlock,
  citationSoulignee: citationSouligneeBlock,
  quote: quoteBlock,
  imageText: imageTextBlock,
  bandeauRespirer: bandeauRespirerBlock,
  imagePleine: imagePleineBlock,
  galerieArches: galerieArchesBlock,
  gallery: galleryBlock,
  imageLegende: imageLegendeBlock,
  texteDeuxColonnes: texteDeuxColonnesBlock,
  listeAtouts: listeAtoutsBlock,
  videoArche: videoArcheBlock,
  separateurAsterisque: separateurAsterisqueBlock,

  /* Être contactée. */
  contactMinimal: contactMinimalBlock,
  contact: contactBlock,
  contactCarte: contactCarteBlock,
  cta: ctaBlock,
  ctaImage: ctaImageBlock,
  ctaImmersif: ctaImmersifBlock,
  appelDoux: appelDouxBlock,

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

/**
 * Les catégories suivent l'INTENTION de l'utilisatrice (« que voulez-vous
 * ajouter ? »), pas la taxonomie technique des templates :
 * se présenter, présenter son offre, inspirer confiance, enrichir le
 * contenu, être contactée.
 */
export const TEMPLATE_CATEGORIES = [
  'Présentation',
  'Accompagnement',
  'Confiance',
  'Contenu',
  'Contact',
] as const

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]

/** Catégorie de chaque template. Un type absent d'ici (primitives du
    rendu interne : titre, image, colonnes…) n'apparaît pas dans la
    bibliothèque. */
const CATEGORY_OF: Partial<Record<BlockType, TemplateCategory>> = {
  /* Se présenter : ouvertures de page, qui je suis, mon approche. */
  heroPleinEcran: 'Présentation',
  hero: 'Présentation',
  heroEditorial: 'Présentation',
  heroMinimal: 'Présentation',
  heroBandeau: 'Présentation',
  about: 'Présentation',
  aproposPortrait: 'Présentation',
  aproposAsymetrique: 'Présentation',
  aproposMedaillon: 'Présentation',
  aproposCitation: 'Présentation',
  aproposParcours: 'Présentation',
  approach: 'Présentation',
  approcheColonnes: 'Présentation',
  processusVertical: 'Présentation',

  /* Présenter son offre. */
  servicesListe: 'Accompagnement',
  servicesArches: 'Accompagnement',
  services: 'Accompagnement',
  servicesNumerotes: 'Accompagnement',
  servicesImmersifs: 'Accompagnement',
  servicesDetail: 'Accompagnement',
  seanceDeroule: 'Accompagnement',
  tarifsSobre: 'Accompagnement',

  /* Inspirer confiance. */
  temoignageGrand: 'Confiance',
  temoignagesMultiples: 'Confiance',
  temoignageSimple: 'Confiance',
  chiffresClefs: 'Confiance',
  engagements: 'Confiance',
  logosPresse: 'Confiance',
  faqEditoriale: 'Confiance',
  faq: 'Confiance',

  /* Enrichir le contenu — la section vierge d'abord. */
  sectionVierge: 'Contenu',
  manifeste: 'Contenu',
  texteCentre: 'Contenu',
  citationSoulignee: 'Contenu',
  quote: 'Contenu',
  imageText: 'Contenu',
  bandeauRespirer: 'Contenu',
  imagePleine: 'Contenu',
  galerieArches: 'Contenu',
  gallery: 'Contenu',
  imageLegende: 'Contenu',
  texteDeuxColonnes: 'Contenu',
  listeAtouts: 'Contenu',
  videoArche: 'Contenu',
  separateurAsterisque: 'Contenu',

  /* Être contactée — le contact ET les invitations à l'action. */
  contactMinimal: 'Contact',
  contact: 'Contact',
  contactCarte: 'Contact',
  cta: 'Contact',
  ctaImage: 'Contact',
  ctaImmersif: 'Contact',
  appelDoux: 'Contact',
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
