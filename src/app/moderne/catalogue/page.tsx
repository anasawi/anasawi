import type { Metadata } from 'next'

import { MODELES } from '@/blocks/moderne/modeles'
import { bibliotheque, CATEGORY_HINT, type TemplateCategory } from '@/blocks/registry'
import { chargerContenu } from '@/components/anasawi/charger'
import { Catalogue, type Rayon } from '@/components/anasawi/modeles/Catalogue'
import { Horizon } from '@/components/anasawi/sections'
import { Fil } from '@/components/anasawi/vivant'
import { getActiveFaq, getActiveServices, getAllMedia, getSettings } from '@/server/queries'

export const revalidate = 3600

export const metadata: Metadata = { title: 'ANASAWI — catalogue des modèles modernes' }

/** Le mouvement de chaque modèle, en quelques mots. */
const MOUVEMENT: Record<string, string> = {
  mSeuil: 'La porte s’ouvre, la vapeur de la tasse monte.',
  mRespiration: 'Le cercle respire ; un exercice guidé d’une minute.',
  mRencontre: 'Les portes s’ouvrent, la signature se dessine.',
  mChemin: 'Le trait qui relie les étapes se dessine à la lecture.',
  mArches: 'Survolée, une carte s’ouvre en fiche.',
  mEnPratique: 'Les jours de la semaine se posent un à un.',
  mPhrase: 'La phrase s’allume mot à mot.',
  mPromenade: 'Les portes défilent très lentement, s’arrêtent au survol.',
  mConversation: 'Les bulles arrivent comme dans une messagerie.',
  mRendezVous: 'La lettre s’envole à l’envoi.',
  mHorizon: 'Le grand mot de la fin apparaît doucement.',
  mOuverturePleine: 'La photo avance à peine, la carte se pose.',
  mOuverturePortrait: 'La grande porte s’ouvre de bas en haut.',
  mOuvertureEditoriale: 'La petite porte s’ouvre au milieu du nom.',
  mOuvertureMinimale: 'L’arche se dessine d’un seul trait.',
  mOuvertureBandeau: 'Le panorama se dévoile en montant.',
  mOuvertureTriptyque: 'Les trois portes s’ouvrent l’une après l’autre.',
  mAproposPortrait: 'La porte s’ouvre, le paraphe se trace.',
  mAproposAsymetrique: 'Les deux portes s’ouvrent en décalé.',
  mAproposMedaillon: 'L’anneau de mots tourne très lentement.',
  mAproposCitation: 'La citation et la carte apparaissent doucement.',
  mAproposParcours: 'Le fil se dessine, les étapes suivent.',
  mAproposChiffres: 'Les nombres comptent jusqu’à leur valeur.',
  mAproposEngagements: 'Les cartes montent au survol.',
  mAproposApproches: 'Les approches apparaissent une à une.',
  mMethodeColonnes: 'Un fil pointillé relie les étapes en se dessinant.',
  mMethodeVerticale: 'Le trait se remplit de bleu, étape après étape.',
  mMethodeCartes: 'Les cartes arrivent en pile et s’étalent comme un jeu.',
  mMethodeSeance: 'La ligne du temps se remplit, les moments suivent.',
  mMethodeApproche: 'La porte s’ouvre, les mots-clés apparaissent.',
  mServicesListe: 'Au survol, la petite porte de l’accompagnement apparaît.',
  mServicesPortes: 'Les portes s’ouvrent en cascade.',
  mServicesGrille: 'Les cartes montent au survol.',
  mServicesNumerotes: 'Le grand numéro se remplit au survol.',
  mServicesFenetre: 'La photo et la fiche changent en fondu.',
  mServicesDetail: 'Chaque accompagnement s’ouvre comme un tiroir.',
  mServicesTarifs: 'Les lignes de la carte apparaissent une à une.',
  mQuestionsAccordeon: 'Les questions s’ouvrent une à une.',
  mQuestionsEditoriale: 'La réponse change en fondu.',
  mQuestionsCartes: 'Un clic, la carte se retourne sur sa réponse.',
  mPhotosLieu: 'Les trois portes s’ouvrent l’une après l’autre.',
  mPhotosFenetre: 'On survole un nom, la photo change.',
  mPhotosBattants: 'La porte s’ouvre lentement sur le cabinet.',
  mPhotosBienvenue: 'Les photos se succèdent en douceur.',
  mPhotosMur: 'Les cadres glissent à peine quand on descend.',
  mPhotosMosaique: 'Les photos apparaissent en cascade.',
  mPhotosPleine: 'La photo avance à peine.',
  mPhotosLegende: 'La porte s’ouvre, le récit apparaît.',
  mVideoCinema: 'Le cadre s’élargit, la vidéo tourne en boucle.',
  mVideoArche: 'La porte s’ouvre sur la vidéo.',
  mTexteManifeste: 'Les convictions s’allument l’une après l’autre.',
  mTexteCentre: 'Le texte apparaît doucement.',
  mTexteSouligne: 'Un trait de plume se dessine sous le mot clé.',
  mTexteCitation: 'La carte et le médaillon apparaissent.',
  mTexteImage: 'La porte s’ouvre.',
  mTexteBandeau: 'Les mots défilent sans fin, s’arrêtent au survol.',
  mTexteDeuxColonnes: 'Le texte apparaît, sa lettrine en bleu.',
  mTexteAtouts: 'Chaque point se coche à son tour.',
  mTexteSeparateur: 'Les traits et les petites arches se dessinent.',
  mContactMinimal: 'Les coordonnées se soulignent au survol.',
  mContactCartes: 'Les cartes montent au survol.',
  mContactPlan: 'L’adresse, la semaine et le bouton arrivent l’un après l’autre.',
  mAppel: 'L’invitation apparaît doucement.',
  mAppelImage: 'La photo avance à peine.',
  mAppelImmersif: 'Le cadre s’élargit, la carte se pose.',
  mAppelDoux: 'La vapeur monte de la tasse.',
}

/**
 * Le catalogue : tous les modèles de la bibliothèque moderne, présentés
 * par catégorie avec une miniature vivante, leur description et leur
 * mouvement. Un clic mène au modèle en grand (/moderne/modeles).
 */
export default async function CataloguePage() {
  const [c, settings, services, faqItems, media] = await Promise.all([chargerContenu(), getSettings(), getActiveServices(), getActiveFaq(), getAllMedia()])
  const rayons: Rayon[] = bibliotheque('moderne').map((g) => ({
    categorie: g.category,
    indice: CATEGORY_HINT[g.category as TemplateCategory],
    fiches: g.options.map((o) => {
      const enPlace = !(o.type in MODELES)
      return {
        type: o.type,
        label: o.label.replace('Moderne — ', ''),
        description: o.description,
        mouvement: MOUVEMENT[o.type] ?? '',
        enPlace,
        lien: enPlace ? '/moderne' : `/moderne/modeles#${o.type}`,
      }
    }),
  }))
  return (
    <>
      <Fil liens={[{ href: '/moderne/modeles', label: 'Tous en grand' }, { href: '/moderne', label: 'Le site' }]} rdv="/moderne#contact" logo={c.logo} />
      <Catalogue rayons={rayons} data={{ services, faqItems, settings, media, partage: c }} />
      <Horizon c={c} liens={[]} />
    </>
  )
}
