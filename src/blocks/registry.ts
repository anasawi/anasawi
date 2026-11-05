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
import {
  mArchesBlock,
  mCheminBlock,
  mConversationBlock,
  mEnPratiqueBlock,
  mHorizonBlock,
  mPhraseBlock,
  mPromenadeBlock,
  mRencontreBlock,
  mRendezVousBlock,
  mRespirationBlock,
  mSeuilBlock,
} from './moderne/blocs'
import {
  mAppelBlock,
  mCarteBlock,
  mDefilantBlock,
  mEngagementsBlock,
  mMosaiqueBlock,
  mOuverturePartageeBlock,
  mOuverturePleineBlock,
  mParcoursBlock,
  mPileBlock,
  mPortraitChiffresBlock,
  mQuestionsAccordeonBlock,
  mServicesGrilleBlock,
  mServicesListeBlock,
  mTexteImageBlock,
  mVideoBlock,
} from './moderne/modeles'
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
  videoCinemaBlock,
} from './templates/contenu'
import { ctaImageBlock, ctaImmersifBlock } from './templates/cta'
import {
  imagePleineBlock,
  lieuArchesBlock,
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
  lieuArches: lieuArchesBlock,
  galerieArches: galerieArchesBlock,
  gallery: galleryBlock,
  imageLegende: imageLegendeBlock,
  texteDeuxColonnes: texteDeuxColonnesBlock,
  listeAtouts: listeAtoutsBlock,
  videoArche: videoArcheBlock,
  videoCinema: videoCinemaBlock,
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

  /* VERSION MODERNE — en cours d'arbitrage (voir ARBITRAGE.md). */
  mSeuil: mSeuilBlock,
  mRespiration: mRespirationBlock,
  mRencontre: mRencontreBlock,
  mChemin: mCheminBlock,
  mArches: mArchesBlock,
  mEnPratique: mEnPratiqueBlock,
  mPhrase: mPhraseBlock,
  mPromenade: mPromenadeBlock,
  mConversation: mConversationBlock,
  mRendezVous: mRendezVousBlock,
  mHorizon: mHorizonBlock,
  mOuverturePleine: mOuverturePleineBlock,
  mOuverturePartagee: mOuverturePartageeBlock,
  mPortraitChiffres: mPortraitChiffresBlock,
  mParcours: mParcoursBlock,
  mPile: mPileBlock,
  mEngagements: mEngagementsBlock,
  mServicesListe: mServicesListeBlock,
  mServicesGrille: mServicesGrilleBlock,
  mQuestionsAccordeon: mQuestionsAccordeonBlock,
  mMosaique: mMosaiqueBlock,
  mVideo: mVideoBlock,
  mDefilant: mDefilantBlock,
  mTexteImage: mTexteImageBlock,
  mCarte: mCarteBlock,
  mAppel: mAppelBlock,
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
  /** Site auquel appartient le modèle (voir `BlockMeta.theme`). */
  theme: 'classique' | 'moderne'
}

/** Fiche de chaque bloc — base de la bibliothèque de templates. */
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
    theme: ('theme' in block && block.theme) || 'classique',
  }
})

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
/**
 * Les catégories de la bibliothèque — celles d'une personne qui cherche
 * « une section pour… », dans l'ordre où l'on lit un site : s'ouvrir, se
 * présenter, dire sa méthode, montrer ses accompagnements, rassurer,
 * répondre aux questions, montrer le lieu, écrire, et être contactée.
 */
export const TEMPLATE_CATEGORIES = [
  'Ouverture',
  'Qui je suis',
  'Ma méthode',
  'Accompagnements',
  'Questions',
  'Photos & vidéos',
  'Textes',
  'Contact & rendez-vous',
] as const

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]

/** Ce que chaque catégorie sert à faire — affiché dans la bibliothèque. */
export const CATEGORY_HINT: Record<TemplateCategory, string> = {
  'Ouverture': 'La première chose que voient vos visiteurs.',
  'Qui je suis': 'Vous présenter : parcours, valeurs, chiffres, engagements.',
  'Ma méthode': 'Expliquer comment vous travaillez et comment se passe une séance.',
  'Accompagnements': 'Montrer ce que vous proposez, et vos tarifs.',
  'Questions': 'Les questions que l’on vous pose souvent.',
  'Photos & vidéos': 'Le cabinet, le lieu, une ambiance.',
  'Textes': 'Un texte, une phrase forte, une respiration entre deux sections.',
  'Contact & rendez-vous': 'Vos coordonnées et l’invitation à prendre rendez-vous.',
}

/** Catégorie de chaque modèle. Un type absent d'ici (primitives du rendu
    interne : titre, image, colonnes…) n'apparaît pas dans la bibliothèque. */
const CATEGORY_OF: Partial<Record<BlockType, TemplateCategory>> = {
  /* Version moderne. */
  mSeuil: 'Ouverture',
  mRencontre: 'Qui je suis',
  mChemin: 'Ma méthode',
  mArches: 'Accompagnements',
  mConversation: 'Questions',
  mPromenade: 'Photos & vidéos',
  mRespiration: 'Textes',
  mPhrase: 'Textes',
  mEnPratique: 'Contact & rendez-vous',
  mRendezVous: 'Contact & rendez-vous',
  mHorizon: 'Contact & rendez-vous',
  mOuverturePleine: 'Ouverture',
  mOuverturePartagee: 'Ouverture',
  mPortraitChiffres: 'Qui je suis',
  mParcours: 'Qui je suis',
  mPile: 'Ma méthode',
  mEngagements: 'Ma méthode',
  mServicesListe: 'Accompagnements',
  mServicesGrille: 'Accompagnements',
  mQuestionsAccordeon: 'Questions',
  mMosaique: 'Photos & vidéos',
  mVideo: 'Photos & vidéos',
  mDefilant: 'Textes',
  mTexteImage: 'Textes',
  mCarte: 'Contact & rendez-vous',
  mAppel: 'Contact & rendez-vous',

  heroPleinEcran: 'Ouverture',
  hero: 'Ouverture',
  heroEditorial: 'Ouverture',
  heroMinimal: 'Ouverture',
  heroBandeau: 'Ouverture',

  about: 'Qui je suis',
  aproposPortrait: 'Qui je suis',
  aproposAsymetrique: 'Qui je suis',
  aproposMedaillon: 'Qui je suis',
  aproposCitation: 'Qui je suis',
  aproposParcours: 'Qui je suis',
  chiffresClefs: 'Qui je suis',
  engagements: 'Qui je suis',
  logosPresse: 'Qui je suis',

  approach: 'Ma méthode',
  approcheColonnes: 'Ma méthode',
  processusVertical: 'Ma méthode',
  seanceDeroule: 'Ma méthode',

  servicesListe: 'Accompagnements',
  servicesArches: 'Accompagnements',
  services: 'Accompagnements',
  servicesNumerotes: 'Accompagnements',
  servicesImmersifs: 'Accompagnements',
  servicesDetail: 'Accompagnements',
  tarifsSobre: 'Accompagnements',


  faq: 'Questions',
  faqEditoriale: 'Questions',

  lieuArches: 'Photos & vidéos',
  galerieArches: 'Photos & vidéos',
  gallery: 'Photos & vidéos',
  imagePleine: 'Photos & vidéos',
  imageLegende: 'Photos & vidéos',
  videoCinema: 'Photos & vidéos',
  videoArche: 'Photos & vidéos',

  sectionVierge: 'Textes',
  manifeste: 'Textes',
  texteCentre: 'Textes',
  citationSoulignee: 'Textes',
  quote: 'Textes',
  imageText: 'Textes',
  bandeauRespirer: 'Textes',
  texteDeuxColonnes: 'Textes',
  listeAtouts: 'Textes',
  separateurAsterisque: 'Textes',

  contactMinimal: 'Contact & rendez-vous',
  contact: 'Contact & rendez-vous',
  contactCarte: 'Contact & rendez-vous',
  cta: 'Contact & rendez-vous',
  ctaImage: 'Contact & rendez-vous',
  ctaImmersif: 'Contact & rendez-vous',
  appelDoux: 'Contact & rendez-vous',
}

export type TemplateOption = BlockOption & { category: TemplateCategory }

/** Bibliothèque groupée par catégorie, dans l'ordre de lecture d'un site. */
export const templateLibrary = TEMPLATE_CATEGORIES.map((category) => ({
  category,
  options: blockOptions
    .filter((option) => CATEGORY_OF[option.type] === category)
    .map((option): TemplateOption => ({ ...option, category })),
})).filter((group) => group.options.length > 0)

/** La bibliothèque d'UN site : les modèles du thème demandé, catégories
    vides retirées. */
export function bibliotheque(theme: 'classique' | 'moderne') {
  return templateLibrary
    .map((g) => ({ ...g, options: g.options.filter((o) => o.theme === theme) }))
    .filter((g) => g.options.length > 0)
}
