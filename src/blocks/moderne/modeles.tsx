import { field } from '../field'
import { z } from 'zod'

import { AIDE, enLignes, liste, media, medias, modele, t } from './fabrique'
import type { Contenu } from './contenu'
import {
  AproposApproches,
  AproposAsymetrique,
  AproposChiffres,
  AproposCitation,
  AproposEngagements,
  AproposMedaillon,
  AproposParcours,
  AproposPortrait,
} from '@/components/anasawi/modeles/apropos'
import { Appel, AppelDoux, AppelImage, AppelImmersif, ContactCartes, ContactMinimal, ContactPlan } from '@/components/anasawi/modeles/contact'
import { MethodeApproche, MethodeCartes, MethodeColonnes, MethodeSeance, MethodeVerticale } from '@/components/anasawi/modeles/methode'
import {
  OuvertureBandeau,
  OuvertureEditoriale,
  OuvertureMinimale,
  OuverturePleine,
  OuverturePortrait,
  OuvertureTriptyque,
} from '@/components/anasawi/modeles/ouverture'
import {
  PhotosBattants,
  PhotosBienvenue,
  PhotosFenetre,
  PhotosLegende,
  PhotosLieu,
  PhotosMosaique,
  PhotosMur,
  PhotosPleine,
  VideoArche,
  VideoCinema,
} from '@/components/anasawi/modeles/photos'
import { QuestionsAccordeon, QuestionsCartes, QuestionsEditoriale } from '@/components/anasawi/modeles/questions'
import { ServicesDetail, ServicesFenetre, ServicesGrille, ServicesListe, ServicesNumerotes, ServicesPortes, ServicesTarifs } from '@/components/anasawi/modeles/services'
import {
  TexteAtouts,
  TexteBandeau,
  TexteCentre,
  TexteCitation,
  TexteDeuxColonnes,
  TexteImage,
  TexteManifeste,
  TexteSeparateur,
  TexteSouligne,
} from '@/components/anasawi/modeles/textes'

/**
 * LES MODÈLES DE LA VERSION MODERNE — la bibliothèque complète de l'éditeur,
 * dans la DA du site moderne : chaque modèle du site classique a son
 * jumeau, plus des idées propres au moderne. Tous préremplis avec le vrai
 * contenu d'Anne, tous dans un écran (100vh au plus). Vitrine :
 * /moderne/modeles.
 */

const RDV = 'Prendre rendez-vous'
const etiquetteDe = (c: Contenu) => `${c.metier} · ${c.ville}`

/* ══════════════════════════════════════════════════════════════════════
   OUVERTURE
   ══════════════════════════════════════════════════════════════════════ */

const ouvertureForme = { etiquette: t, nom: t, phrase: t, bouton: t, mediaId: media }
const ouvertureChamps = [
  field.text('etiquette', 'Étiquette'),
  field.text('nom', 'Nom', { help: 'Le premier mot en noir, la suite en accent.' }),
  field.textarea('phrase', 'Phrase'),
  field.text('bouton', 'Bouton'),
  field.media('mediaId', 'Photo', { help: AIDE.photo }),
]
const ouvertureDepart = (c: Contenu) => ({ etiquette: etiquetteDe(c), nom: c.nom, phrase: c.accroche, bouton: RDV, mediaId: c.ambiance?.id ?? null })

export const mOuverturePleineBlock = modele({
  label: 'Ouverture plein cadre',
  description: 'La photo du cabinet occupe l’écran ; une carte ivoire s’y pose avec votre nom.',
  forme: ouvertureForme,
  champs: ouvertureChamps,
  depart: ouvertureDepart,
  rendu: (d, c, o) => <OuverturePleine etiquette={d.etiquette} nom={d.nom} phrase={d.phrase} bouton={d.bouton} rdv={c.rdv} photo={o.photo(d.mediaId)} />,
})

export const mOuverturePortraitBlock = modele({
  label: 'Ouverture portrait',
  description: 'Votre nom et quelques mots à gauche, la grande porte à droite, trois mots-clés.',
  forme: { ...ouvertureForme, bouton2: t, mots: t },
  champs: [...ouvertureChamps, field.text('bouton2', 'Lien secondaire'), field.textarea('mots', 'Mots-clés', { help: AIDE.lignes })],
  depart: (c) => ({
    ...ouvertureDepart(c),
    mediaId: c.portrait?.id ?? c.ambiance?.id ?? null,
    bouton2: 'Faire connaissance',
    mots: c.services.slice(0, 3).map((s) => s.title).join('\n'),
  }),
  rendu: (d, c, o) => (
    <OuverturePortrait etiquette={d.etiquette} nom={d.nom} phrase={d.phrase} bouton={d.bouton} bouton2={d.bouton2} rdv={c.rdv} photo={o.photo(d.mediaId)} mots={enLignes(d.mots)} />
  ),
})

export const mOuvertureEditorialeBlock = modele({
  label: 'Ouverture éditoriale',
  description: 'Votre nom en très grand, une petite porte glissée entre le prénom et le nom.',
  forme: ouvertureForme,
  champs: ouvertureChamps,
  depart: ouvertureDepart,
  rendu: (d, c, o) => <OuvertureEditoriale etiquette={d.etiquette} nom={d.nom} phrase={d.phrase} bouton={d.bouton} rdv={c.rdv} photo={o.photo(d.mediaId)} />,
})

export const mOuvertureMinimaleBlock = modele({
  label: 'Ouverture minimale',
  description: 'Une grande arche dessinée d’un seul trait, votre nom posé dedans. Rien d’autre.',
  forme: { etiquette: t, nom: t, phrase: t, bouton: t },
  champs: ouvertureChamps.slice(0, 4),
  depart: (c) => ({ etiquette: etiquetteDe(c), nom: c.nom, phrase: c.accroche, bouton: RDV }),
  rendu: (d, c) => <OuvertureMinimale etiquette={d.etiquette} nom={d.nom} phrase={d.phrase} bouton={d.bouton} rdv={c.rdv} />,
})

export const mOuvertureBandeauBlock = modele({
  label: 'Ouverture panorama',
  description: 'Votre nom et votre phrase, puis le cabinet en panorama sous une arche large.',
  forme: ouvertureForme,
  champs: ouvertureChamps,
  depart: ouvertureDepart,
  rendu: (d, c, o) => <OuvertureBandeau etiquette={d.etiquette} nom={d.nom} phrase={d.phrase} bouton={d.bouton} rdv={c.rdv} photo={o.photo(d.mediaId)} />,
})

export const mOuvertureTriptyqueBlock = modele({
  label: 'Ouverture triptyque',
  description: 'Trois portes côte à côte, celle du milieu plus haute, qui s’ouvrent l’une après l’autre.',
  forme: { etiquette: t, nom: t, phrase: t, bouton: t, photos: medias },
  champs: [...ouvertureChamps.slice(0, 4), field.mediaList('photos', 'Les trois photos', { help: AIDE.photo })],
  depart: (c) => ({ etiquette: etiquetteDe(c), nom: c.nom, phrase: c.accroche, bouton: RDV, photos: [] }),
  rendu: (d, c, o) => <OuvertureTriptyque etiquette={d.etiquette} nom={d.nom} phrase={d.phrase} bouton={d.bouton} rdv={c.rdv} photos={o.photos(d.photos, 3)} />,
})

const prenomDe = (c: Contenu) => c.nom.trim().split(/\s+/)[0] ?? ''
const champEtiquette = field.text('etiquette', 'Étiquette')
const champTitre = field.textarea('titre', 'Titre', { help: AIDE.titre })
const champTexte = field.textarea('texte', 'Texte')
const champBouton = field.text('bouton', 'Bouton')
const champPhoto = field.media('mediaId', 'Photo', { help: AIDE.photo })
const champPhotos = (n: number) => field.mediaList('photos', 'Photos', { help: `${n} au plus. Vide : celles de la photothèque.` })

/* ══════════════════════════════════════════════════════════════════════
   QUI JE SUIS
   ══════════════════════════════════════════════════════════════════════ */

const presentationForme = { etiquette: t, titre: t, texte: t, signature: t, mediaId: media }
const presentationChamps = [champEtiquette, champTitre, field.richtext('texte', 'Présentation'), field.text('signature', 'Signature'), field.media('mediaId', 'Portrait', { help: AIDE.photo })]
const presentationDepart = (c: Contenu) => ({ etiquette: c.apropos.surtitre, titre: c.apropos.titre, texte: c.apropos.texte, signature: prenomDe(c), mediaId: c.portrait?.id ?? null })

export const mAproposPortraitBlock = modele({
  label: 'Présentation portrait',
  description: 'Votre portrait dans sa porte, votre présentation et votre signature à côté.',
  forme: presentationForme,
  champs: presentationChamps,
  depart: presentationDepart,
  rendu: (d, _c, o) => <AproposPortrait etiquette={d.etiquette} titre={d.titre} texte={d.texte} signature={d.signature} portrait={o.photo(d.mediaId)} />,
})

export const mAproposAsymetriqueBlock = modele({
  label: 'Présentation asymétrique',
  description: 'Le texte large, et deux portes décalées en regard : vous, et le cabinet.',
  forme: { etiquette: t, titre: t, texte: t, signature: t, photos: medias },
  champs: [...presentationChamps.slice(0, 4), champPhotos(2)],
  depart: (c) => ({ ...presentationDepart(c), photos: [c.portrait?.id, c.ambiance?.id].filter((x): x is string => Boolean(x)) }),
  rendu: (d, _c, o) => <AproposAsymetrique etiquette={d.etiquette} titre={d.titre} texte={d.texte} signature={d.signature} photos={o.photos(d.photos, 2)} />,
})

export const mAproposMedaillonBlock = modele({
  label: 'Présentation médaillon',
  description: 'Un portrait rond au centre, entouré d’un anneau de mots qui tourne lentement.',
  forme: { ...presentationForme, anneau: t },
  champs: [...presentationChamps, field.text('anneau', 'Les mots de l’anneau')],
  depart: (c) => ({ ...presentationDepart(c), anneau: `${c.metier} · ${c.ville}` }),
  rendu: (d, _c, o) => <AproposMedaillon etiquette={d.etiquette} titre={d.titre} texte={d.texte} signature={d.signature} anneau={d.anneau} portrait={o.photo(d.mediaId)} />,
})

export const mAproposCitationBlock = modele({
  label: 'Présentation par la citation',
  description: 'Vos mots en grand ; à côté, une petite carte avec votre portrait et quelques lignes.',
  forme: { etiquette: t, citation: t, texte: t, signature: t, mediaId: media },
  champs: [champEtiquette, field.textarea('citation', 'Citation'), field.textarea('texte', 'Quelques lignes'), field.text('signature', 'Nom'), field.media('mediaId', 'Portrait', { help: AIDE.photo })],
  depart: (c) => ({ etiquette: c.apropos.surtitre, citation: c.apropos.citation ?? c.citation.texte, texte: c.apropos.texte, signature: c.nom, mediaId: c.portrait?.id ?? null }),
  rendu: (d, c, o) => <AproposCitation etiquette={d.etiquette} citation={d.citation} texte={d.texte} signature={d.signature} metier={c.metier} portrait={o.photo(d.mediaId)} />,
})

export const mAproposParcoursBlock = modele({
  label: 'Mon parcours',
  description: 'Les étapes de votre chemin, sur un fil qui se dessine à la lecture.',
  forme: { etiquette: t, titre: t, texte: t, mediaId: media, etapes: liste({ annee: t, titre: t, texte: t }) },
  champs: [
    champEtiquette,
    champTitre,
    champTexte,
    field.list('etapes', 'Étapes', [field.text('annee', 'Année ou période'), field.text('titre', 'Titre'), field.textarea('texte', 'Texte')], { addLabel: 'Ajouter une étape' }),
    field.media('mediaId', 'Portrait', { help: AIDE.photo }),
  ],
  depart: (c) => ({
    etiquette: 'Mon parcours',
    titre: 'Le chemin qui m’a\n*menée ici*',
    texte: '',
    mediaId: c.portrait?.id ?? null,
    etapes: [
      { annee: 'Aujourd’hui', titre: `${c.metier} à ${c.ville}`, texte: c.accroche },
      { annee: 'Formation', titre: 'Votre formation principale', texte: 'À compléter : l’école, les années, la spécialité.' },
      { annee: 'Avant', titre: 'Ce qui vous a menée là', texte: 'À compléter : un métier, une rencontre, un déclic.' },
    ],
  }),
  rendu: (d, _c, o) => <AproposParcours etiquette={d.etiquette} titre={d.titre} texte={d.texte} etapes={d.etapes} portrait={o.photo(d.mediaId)} />,
})

export const mAproposChiffresBlock = modele({
  label: 'En quelques chiffres',
  description: 'Des nombres qui comptent jusqu’à leur valeur, chacun dans sa petite arche.',
  forme: { etiquette: t, titre: t, texte: t, chiffres: liste({ valeur: t, libelle: t }) },
  champs: [champEtiquette, champTitre, champTexte, field.list('chiffres', 'Chiffres', [field.text('valeur', 'Valeur', { help: 'Un nombre, suivi si besoin d’un « + » ou d’un « % ».' }), field.text('libelle', 'Libellé')], { addLabel: 'Ajouter un chiffre' })],
  depart: (c) => ({
    etiquette: 'En quelques chiffres',
    titre: 'Ce qui fait\n*le cabinet*',
    texte: '',
    chiffres: [
      { valeur: String(c.services.length), libelle: 'accompagnements' },
      { valeur: String(c.horaires.filter((h) => !/ferm/i.test(h.hours)).length), libelle: 'jours de consultation' },
      { valeur: String(c.faq.length), libelle: 'questions répondues' },
      { valeur: '1', libelle: 'cabinet, et la visio' },
    ],
  }),
  rendu: (d) => <AproposChiffres etiquette={d.etiquette} titre={d.titre} texte={d.texte} chiffres={d.chiffres} />,
})

export const mAproposEngagementsBlock = modele({
  label: 'Mes engagements',
  description: 'Ce que vous promettez à chaque personne, en quatre cartes.',
  forme: { etiquette: t, titre: t, texte: t, engagements: liste({ titre: t, texte: t }) },
  champs: [champEtiquette, champTitre, champTexte, field.list('engagements', 'Engagements', [field.text('titre', 'Titre'), field.textarea('texte', 'Texte')], { addLabel: 'Ajouter un engagement' })],
  depart: () => ({
    etiquette: 'Mes engagements',
    titre: 'Un cadre\n*sûr*',
    texte: '',
    engagements: [
      { titre: 'Confidentialité', texte: 'Ce qui se dit au cabinet reste au cabinet.' },
      { titre: 'Sans jugement', texte: 'Vous êtes accueilli·e tel·le que vous êtes, avec ce que vous apportez.' },
      { titre: 'À votre rythme', texte: 'Rien n’est imposé : nous avançons au pas qui vous convient.' },
      { titre: 'Un cadre clair', texte: 'Durée, tarif, fréquence : tout est posé dès le premier rendez-vous.' },
    ],
  }),
  rendu: (d) => <AproposEngagements etiquette={d.etiquette} titre={d.titre} texte={d.texte} engagements={d.engagements} />,
})

export const mAproposApprochesBlock = modele({
  label: 'Mes approches',
  description: 'Les noms de vos approches en grand, séparés de petites arches.',
  forme: { etiquette: t, titre: t, texte: t, approches: t, bouton: t },
  champs: [champEtiquette, champTitre, champTexte, field.textarea('approches', 'Approches', { help: AIDE.lignes }), champBouton],
  depart: (c) => ({
    etiquette: 'Mes approches',
    titre: 'Ce sur quoi\nje *m’appuie*',
    texte: '',
    approches: [...new Set([...c.services.map((s) => s.method).filter((m): m is string => Boolean(m)), ...c.services.map((s) => s.title)])].slice(0, 5).join('\n'),
    bouton: 'Découvrir les accompagnements',
  }),
  rendu: (d, c) => <AproposApproches etiquette={d.etiquette} titre={d.titre} texte={d.texte} approches={enLignes(d.approches)} bouton={d.bouton} rdv={c.rdv} />,
})

/* ══════════════════════════════════════════════════════════════════════
   MA MÉTHODE
   ══════════════════════════════════════════════════════════════════════ */

const methodeForme = { etiquette: t, titre: t, intro: t, etapes: liste({ titre: t, texte: t }) }
const methodeChamps = [champEtiquette, champTitre, field.textarea('intro', 'Introduction'), field.list('etapes', 'Étapes', [field.text('titre', 'Titre'), field.textarea('texte', 'Texte')], { addLabel: 'Ajouter une étape' })]
const methodeDepart = (c: Contenu) => ({ etiquette: c.methode.surtitre, titre: c.methode.titre, intro: c.methode.intro, etapes: c.methode.etapes })

export const mMethodeColonnesBlock = modele({
  label: 'Méthode en colonnes',
  description: 'Chaque étape sous sa petite arche numérotée, reliées par un fil pointillé qui se dessine.',
  forme: methodeForme,
  champs: methodeChamps,
  depart: methodeDepart,
  rendu: (d) => <MethodeColonnes etiquette={d.etiquette} titre={d.titre} intro={d.intro} etapes={d.etapes} />,
})

export const mMethodeVerticaleBlock = modele({
  label: 'Méthode pas à pas',
  description: 'Le titre à gauche ; à droite, les étapes le long d’un trait qui se remplit.',
  forme: { ...methodeForme, bouton: t },
  champs: [...methodeChamps, champBouton],
  depart: (c) => ({ ...methodeDepart(c), bouton: RDV }),
  rendu: (d, c) => <MethodeVerticale etiquette={d.etiquette} titre={d.titre} intro={d.intro} etapes={d.etapes} bouton={d.bouton} rdv={c.rdv} />,
})

export const mMethodeCartesBlock = modele({
  label: 'Méthode en cartes',
  description: 'Les étapes posées en pile, qui s’étalent à l’arrivée comme un jeu qu’on ouvre.',
  forme: methodeForme,
  champs: methodeChamps,
  depart: methodeDepart,
  rendu: (d) => <MethodeCartes etiquette={d.etiquette} titre={d.titre} intro={d.intro} etapes={d.etapes} />,
})

export const mMethodeSeanceBlock = modele({
  label: 'Le déroulé d’une séance',
  description: 'Une séance, de l’arrivée au départ, sur une ligne du temps qui se remplit.',
  forme: { etiquette: t, titre: t, intro: t, duree: t, moments: liste({ moment: t, titre: t, texte: t }) },
  champs: [
    champEtiquette,
    champTitre,
    field.textarea('intro', 'Introduction'),
    field.text('duree', 'Fin de la ligne du temps', { help: 'Par exemple « 1 heure ».' }),
    field.list('moments', 'Moments', [field.text('moment', 'Moment'), field.text('titre', 'Titre'), field.textarea('texte', 'Texte')], { addLabel: 'Ajouter un moment' }),
  ],
  depart: (c) => ({
    etiquette: 'Une séance',
    titre: 'Comment se passe\n*une séance*',
    intro: '',
    duree: c.services[0] ? (c.services[0].duration?.split(/[·—–]/)[0]?.trim() ?? '1 heure') : '1 heure',
    moments: [
      { moment: 'En arrivant', titre: 'Vous vous installez', texte: 'On prend le temps de commencer, sans rien presser.' },
      { moment: 'Au cœur', titre: 'Vous déposez', texte: 'Ce qui vous amène, à votre façon, avec vos mots.' },
      { moment: 'Vers la fin', titre: 'On regarde ensemble', texte: 'Ce qui a bougé, ce qui reste, ce que vous emportez.' },
      { moment: 'Après', titre: 'Vous repartez', texte: 'À votre rythme ; la suite se décide ensemble.' },
    ],
  }),
  rendu: (d) => <MethodeSeance etiquette={d.etiquette} titre={d.titre} intro={d.intro} duree={d.duree} moments={d.moments} />,
})

export const mMethodeApprocheBlock = modele({
  label: 'Mon approche',
  description: 'Un texte posé, une phrase en exergue, quelques mots-clés, et la porte.',
  forme: { etiquette: t, titre: t, intro: t, citation: t, mots: t, mediaId: media },
  champs: [champEtiquette, champTitre, field.textarea('intro', 'Texte'), field.textarea('citation', 'Phrase en exergue'), field.textarea('mots', 'Mots-clés', { help: AIDE.lignes }), champPhoto],
  depart: (c) => ({ etiquette: c.methode.surtitre, titre: c.methode.titre, intro: c.methode.intro, citation: c.citation.texte, mots: 'Écoute\nPrésence\nConfiance\nÀ votre rythme', mediaId: c.ambiance?.id ?? null }),
  rendu: (d, _c, o) => <MethodeApproche etiquette={d.etiquette} titre={d.titre} intro={d.intro} citation={d.citation} mots={enLignes(d.mots)} photo={o.photo(d.mediaId, 1)} />,
})

/* ══════════════════════════════════════════════════════════════════════
   ACCOMPAGNEMENTS
   ══════════════════════════════════════════════════════════════════════ */

const servicesForme = { etiquette: t, titre: t, texte: t, bouton: t }
const servicesChamps = [champEtiquette, champTitre, field.textarea('texte', 'Texte près du titre'), field.text('bouton', 'Lien de chaque accompagnement')]
/* Les variantes sans lien par accompagnement (toute la ligne est cliquable) n'en proposent pas le texte ; la fenêtre n'a pas de texte près du titre. */
const servicesSansLien = servicesChamps.slice(0, 3)
const servicesSansTexte = [servicesChamps[0]!, servicesChamps[1]!, servicesChamps[3]!]
const servicesDepart = (c: Contenu) => ({
  etiquette: 'Accompagnements',
  titre: 'Ce que je vous\n*propose*',
  texte: `${c.services.length} façons d’être accompagné·e.`,
  bouton: 'Réserver cet accompagnement',
})
const SOURCE_SERVICES = { label: 'Les accompagnements (titres, textes, durées, photos)', href: '/admin/accompagnements' }

export const mServicesListeBlock = modele({
  label: 'Accompagnements en liste',
  description: 'Une ligne par accompagnement ; au survol, sa petite porte apparaît.',
  forme: servicesForme,
  champs: servicesSansLien,
  depart: servicesDepart,
  dataSource: SOURCE_SERVICES,
  rendu: (d, c, o) => <ServicesListe {...d} rdv={c.rdv} services={c.services} photos={o.photos([], 8)} />,
})

export const mServicesPortesBlock = modele({
  label: 'Accompagnements en portes',
  description: 'Chaque accompagnement derrière sa porte en arche, son nom et sa durée dessous.',
  forme: servicesForme,
  champs: servicesSansLien,
  depart: servicesDepart,
  dataSource: SOURCE_SERVICES,
  rendu: (d, c, o) => <ServicesPortes {...d} rdv={c.rdv} services={c.services} photos={o.photos([], 8)} />,
})

export const mServicesGrilleBlock = modele({
  label: 'Accompagnements en cartes',
  description: 'Des cartes blanches : une petite porte, l’approche, quelques mots, la durée.',
  forme: servicesForme,
  champs: servicesChamps,
  depart: servicesDepart,
  dataSource: SOURCE_SERVICES,
  rendu: (d, c, o) => <ServicesGrille {...d} rdv={c.rdv} services={c.services} photos={o.photos([], 8)} />,
})

export const mServicesNumerotesBlock = modele({
  label: 'Accompagnements numérotés',
  description: 'Deux colonnes, de grands numéros dessinés au trait qui se remplissent au survol.',
  forme: servicesForme,
  champs: servicesSansLien,
  depart: servicesDepart,
  dataSource: SOURCE_SERVICES,
  rendu: (d, c) => <ServicesNumerotes {...d} rdv={c.rdv} services={c.services} photos={[]} />,
})

export const mServicesFenetreBlock = modele({
  label: 'Accompagnements à la fenêtre',
  description: 'Les noms à gauche ; à droite, une grande arche dont la photo et la fiche changent en fondu.',
  forme: servicesForme,
  champs: servicesSansTexte,
  depart: servicesDepart,
  dataSource: SOURCE_SERVICES,
  rendu: (d, c, o) => <ServicesFenetre {...d} rdv={c.rdv} services={c.services} photos={o.photos([], 8)} />,
})

export const mServicesDetailBlock = modele({
  label: 'Accompagnements en détail',
  description: 'Chaque accompagnement s’ouvre comme un tiroir, avec son texte complet.',
  forme: servicesForme,
  champs: servicesChamps,
  depart: servicesDepart,
  dataSource: SOURCE_SERVICES,
  rendu: (d, c, o) => <ServicesDetail {...d} rdv={c.rdv} services={c.services} photos={o.photos([], 8)} />,
})

export const mServicesTarifsBlock = modele({
  label: 'Tarifs',
  description: 'Une carte comme celle d’un salon de thé : chaque séance, sa durée et son prix.',
  forme: { ...servicesForme, note: t },
  champs: [champEtiquette, champTitre, champTexte, field.textarea('note', 'Note sous les tarifs'), field.text('bouton', 'Bouton')],
  depart: (c) => ({ etiquette: 'Tarifs', titre: 'Les *séances*', texte: '', note: c.infoPratique ?? '', bouton: RDV }),
  dataSource: SOURCE_SERVICES,
  rendu: (d, c) => <ServicesTarifs {...d} rdv={c.rdv} services={c.services} photos={[]} />,
})

/* ══════════════════════════════════════════════════════════════════════
   QUESTIONS
   ══════════════════════════════════════════════════════════════════════ */

const SOURCE_FAQ = { label: 'Les questions et leurs réponses', href: '/admin/faq' }
const faqForme = { etiquette: t, titre: t, texte: t, bouton: t }
const faqChamps = [champEtiquette, champTitre, champTexte, champBouton]
const faqDepart = () => ({ etiquette: 'Questions fréquentes', titre: 'Ce qu’on me\n*demande*', texte: 'Une autre question ? Écrivez-moi, je vous réponds.', bouton: 'Poser ma question' })

export const mQuestionsAccordeonBlock = modele({
  label: 'Questions en accordéon',
  description: 'Le titre à gauche ; à droite, les questions qui s’ouvrent une à une.',
  forme: faqForme,
  champs: faqChamps,
  depart: faqDepart,
  dataSource: SOURCE_FAQ,
  rendu: (d, c) => <QuestionsAccordeon {...d} rdv={c.rdv} faq={c.faq} />,
})

export const mQuestionsEditorialeBlock = modele({
  label: 'Questions éditoriales',
  description: 'Les questions en grand ; la réponse se pose dans une carte sable à côté.',
  forme: faqForme,
  champs: faqChamps.slice(0, 2),
  depart: faqDepart,
  dataSource: SOURCE_FAQ,
  rendu: (d, c) => <QuestionsEditoriale {...d} rdv={c.rdv} faq={c.faq} />,
})

export const mQuestionsCartesBlock = modele({
  label: 'Questions en cartes',
  description: 'Six questions ; un clic, et la carte se retourne sur sa réponse.',
  forme: faqForme,
  champs: faqChamps.slice(0, 3),
  depart: () => ({ ...faqDepart(), texte: 'Touchez une carte pour lire la réponse.' }),
  dataSource: SOURCE_FAQ,
  rendu: (d, c) => <QuestionsCartes {...d} rdv={c.rdv} faq={c.faq} />,
})

/* ══════════════════════════════════════════════════════════════════════
   PHOTOS & VIDÉOS
   ══════════════════════════════════════════════════════════════════════ */

const galerieForme = { etiquette: t, titre: t, texte: t, photos: medias }
const galerieChamps = (n: number) => [champEtiquette, champTitre, champTexte, champPhotos(n)]
const galerieDepart = () => ({ etiquette: 'Le lieu', titre: 'Le *cabinet*', texte: 'Entrez, regardez autour de vous.' })

export const mPhotosLieuBlock = modele({
  label: 'Le lieu en trois portes',
  description: 'Trois arches de hauteurs différentes qui s’ouvrent l’une après l’autre, leur légende dessous.',
  forme: galerieForme,
  champs: galerieChamps(3),
  depart: galerieDepart,
  rendu: (d, _c, o) => <PhotosLieu {...d} photos={o.photos(d.photos, 3)} />,
})

export const mPhotosMurBlock = modele({
  label: 'Le mur de cadres',
  description: 'Comme chez soi : des cadres de tailles différentes sur un mur sable, qui glissent à peine.',
  forme: galerieForme,
  champs: galerieChamps(6),
  depart: galerieDepart,
  rendu: (d, _c, o) => <PhotosMur {...d} photos={o.photos(d.photos, 6)} />,
})

export const mPhotosMosaiqueBlock = modele({
  label: 'Mosaïque',
  description: 'Cinq photos, une grande porte et quatre cadres doux, qui apparaissent en cascade.',
  forme: galerieForme,
  champs: galerieChamps(5),
  depart: galerieDepart,
  rendu: (d, _c, o) => <PhotosMosaique {...d} photos={o.photos(d.photos, 5)} />,
})

export const mPhotosPleineBlock = modele({
  label: 'Photo pleine largeur',
  description: 'Une seule photo, large, sous une arche ample, qui avance à peine.',
  forme: { etiquette: t, titre: t, legende: t, mediaId: media },
  champs: [champEtiquette, field.textarea('titre', 'Titre', { help: `${AIDE.titre} Vide : pas de titre.` }), field.text('legende', 'Légende'), champPhoto],
  depart: (c) => ({ etiquette: '', titre: '', legende: c.ambiance?.caption ?? '', mediaId: c.ambiance?.id ?? null }),
  rendu: (d, _c, o) => <PhotosPleine etiquette={d.etiquette} titre={d.titre} legende={d.legende} photo={o.photo(d.mediaId)} />,
})

export const mPhotosLegendeBlock = modele({
  label: 'Photo et récit',
  description: 'La porte d’un côté ; de l’autre, ce qu’on y voit, raconté.',
  forme: { etiquette: t, titre: t, texte: t, mediaId: media, cote: z.enum(['gauche', 'droite']).default('gauche') },
  champs: [champEtiquette, champTitre, champTexte, champPhoto, field.select('cote', 'Côté de la photo', [{ value: 'gauche', label: 'À gauche' }, { value: 'droite', label: 'À droite' }])],
  depart: (c) => ({ etiquette: 'Le lieu', titre: 'Un lieu pour\n*se poser*', texte: 'Un cabinet calme et lumineux, pensé pour que l’on s’y sente bien dès la porte passée.', mediaId: c.ambiance?.id ?? null }),
  rendu: (d, _c, o) => <PhotosLegende etiquette={d.etiquette} titre={d.titre} texte={d.texte} photo={o.photo(d.mediaId, 2)} inverse={d.cote === 'droite'} />,
})

const videoForme = { etiquette: t, titre: t, texte: t, videoId: media, mediaId: media }
const videoChamps = [champEtiquette, champTitre, champTexte, field.media('videoId', 'Vidéo', { mediaKind: 'video', help: 'En boucle, sans le son. Vide : la photo ci-dessous.' }), field.media('mediaId', 'Photo de remplacement', { help: AIDE.photo })]

export const mVideoCinemaBlock = modele({
  label: 'Vidéo cinéma',
  description: 'Un grand cadre doux, la vidéo du cabinet en boucle, sans le son.',
  forme: videoForme,
  champs: videoChamps,
  depart: (c) => ({ etiquette: 'En images', titre: 'Le cabinet,\n*en mouvement*', texte: '', mediaId: c.ambiance?.id ?? null }),
  rendu: (d, _c, o) => <VideoCinema etiquette={d.etiquette} titre={d.titre} legende={d.texte} video={o.media(d.videoId)} photo={o.photo(d.mediaId)} />,
})

export const mVideoArcheBlock = modele({
  label: 'Vidéo en arche',
  description: 'La vidéo dans une porte, un texte à côté.',
  forme: videoForme,
  champs: videoChamps,
  depart: (c) => ({ etiquette: 'En images', titre: 'Le cabinet,\n*en mouvement*', texte: 'Quelques secondes pour sentir le lieu avant d’y venir.', mediaId: c.ambiance?.id ?? null }),
  rendu: (d, _c, o) => <VideoArche etiquette={d.etiquette} titre={d.titre} texte={d.texte} video={o.media(d.videoId)} photo={o.photo(d.mediaId, 3)} />,
})

export const mPhotosFenetreBlock = modele({
  label: 'La fenêtre',
  description: 'Une grande arche, une photo à la fois ; à côté, le nom de chaque coin du cabinet.',
  forme: galerieForme,
  champs: galerieChamps(6),
  depart: () => ({ ...galerieDepart(), texte: 'Entrez, regardez autour de vous : chaque nom ouvre sur un coin du cabinet.' }),
  rendu: (d, _c, o) => <PhotosFenetre {...d} photos={o.photos(d.photos, 6)} />,
})

export const mPhotosBattantsBlock = modele({
  label: 'Les deux battants',
  description: 'Une porte fermée, ses moulures, ses poignées ; elle s’ouvre lentement sur le cabinet.',
  forme: galerieForme,
  champs: galerieChamps(6),
  depart: galerieDepart,
  rendu: (d, _c, o) => <PhotosBattants {...d} photos={o.photos(d.photos, 6)} />,
})

export const mPhotosBienvenueBlock = modele({
  label: 'Bienvenue',
  description: 'La porte d’un côté ; de l’autre, les petites attentions qui attendent, et une vignette par coin.',
  forme: { ...galerieForme, attentions: t },
  champs: [...galerieChamps(6), field.textarea('attentions', 'Petites attentions', { help: `${AIDE.lignes} Quatre au plus.` })],
  depart: () => ({
    ...galerieDepart(),
    texte: 'Entrez, regardez autour de vous : chaque vignette ouvre sur un coin du cabinet.',
    attentions: 'Un thé ou un café vous attend\nUn fauteuil confortable\nUne pièce lumineuse et calme\nLe jardin, juste à côté',
  }),
  rendu: (d, _c, o) => <PhotosBienvenue {...d} photos={o.photos(d.photos, 6)} attentions={enLignes(d.attentions)} />,
})

/* ══════════════════════════════════════════════════════════════════════
   TEXTES
   ══════════════════════════════════════════════════════════════════════ */

export const mTexteManifesteBlock = modele({
  label: 'Manifeste',
  description: 'Vos convictions, une par ligne, en grand, qui s’allument l’une après l’autre.',
  forme: { etiquette: t, titre: t, phrases: t },
  champs: [champEtiquette, champTitre, field.textarea('phrases', 'Convictions', { help: `${AIDE.lignes} Le mot clé entre *astérisques*.` })],
  depart: (c) => ({
    etiquette: 'Ce que je crois',
    titre: 'Quelques\n*convictions*',
    phrases: [c.citation.texte, 'Chacun porte en soi *ses propres réponses*.', 'Le changement commence par *être entendu*.', 'Il n’y a pas de *petit* problème.'].join('\n'),
  }),
  rendu: (d) => <TexteManifeste etiquette={d.etiquette} titre={d.titre} phrases={enLignes(d.phrases)} />,
})

export const mTexteCentreBlock = modele({
  label: 'Texte centré',
  description: 'Un titre, un paragraphe, de l’air autour.',
  forme: { etiquette: t, titre: t, texte: t, bouton: t },
  champs: [champEtiquette, champTitre, field.richtext('texte', 'Texte'), field.text('bouton', 'Lien', { help: 'Vide : pas de lien.' })],
  depart: (c) => ({ etiquette: c.ouverture.surtitre || 'Bienvenue', titre: 'Un espace pour\n*vous*', texte: c.accroche, bouton: RDV }),
  rendu: (d, c) => <TexteCentre {...d} rdv={c.rdv} />,
})

export const mTexteSouligneBlock = modele({
  label: 'Citation soulignée',
  description: 'Une phrase en grand ; sous le mot clé, un trait de plume se dessine.',
  forme: { citation: t, auteur: t },
  champs: [field.textarea('citation', 'La phrase', { help: 'Le mot à souligner entre *astérisques*.' }), field.text('auteur', 'Signature')],
  depart: (c) => ({ citation: c.citation.texte.includes('*') ? c.citation.texte : 'On ne répare pas les gens. On les *écoute*.', auteur: c.citation.auteur || c.nom }),
  rendu: (d) => <TexteSouligne citation={d.citation} auteur={d.auteur} />,
})

export const mTexteCitationBlock = modele({
  label: 'Citation en carte',
  description: 'Vos mots sur une carte sable, votre portrait en médaillon, votre nom.',
  forme: { citation: t, auteur: t, mediaId: media },
  champs: [field.textarea('citation', 'Citation'), field.text('auteur', 'Signature'), field.media('mediaId', 'Portrait', { help: AIDE.photo })],
  depart: (c) => ({ citation: c.citation.texte, auteur: c.citation.auteur || c.nom, mediaId: c.portrait?.id ?? null }),
  rendu: (d, c, o) => <TexteCitation citation={d.citation} auteur={d.auteur} metier={c.metier} portrait={o.photo(d.mediaId)} />,
})

export const mTexteImageBlock = modele({
  label: 'Texte et image',
  description: 'Un texte de fond, la porte en regard, à gauche ou à droite.',
  forme: { etiquette: t, titre: t, texte: t, bouton: t, mediaId: media, cote: z.enum(['droite', 'gauche']).default('droite') },
  champs: [champEtiquette, champTitre, field.richtext('texte', 'Texte'), field.text('bouton', 'Lien', { help: 'Vide : pas de lien.' }), champPhoto, field.select('cote', 'Côté de la photo', [{ value: 'droite', label: 'À droite' }, { value: 'gauche', label: 'À gauche' }])],
  depart: (c) => ({ etiquette: c.apropos.surtitre, titre: c.apropos.titre, texte: c.apropos.texte, bouton: '', mediaId: c.ambiance?.id ?? null }),
  rendu: (d, c, o) => <TexteImage etiquette={d.etiquette} titre={d.titre} texte={d.texte} bouton={d.bouton} rdv={c.rdv} photo={o.photo(d.mediaId, 4)} inverse={d.cote === 'gauche'} />,
})

export const mTexteBandeauBlock = modele({
  label: 'Bandeau de mots',
  description: 'Des mots qui passent lentement, sans fin, en italique ; ils s’arrêtent au survol.',
  forme: { mots: t },
  champs: [field.textarea('mots', 'Les mots', { help: AIDE.lignes })],
  depart: () => ({ mots: 'Respirer\nSe poser\nÊtre entendu\nAvancer\nPrendre le temps' }),
  rendu: (d) => <TexteBandeau mots={enLignes(d.mots)} />,
})

export const mTexteDeuxColonnesBlock = modele({
  label: 'Texte en deux colonnes',
  description: 'Le titre à gauche ; un texte long à droite, posé sur deux colonnes, sa lettrine en bleu.',
  forme: { etiquette: t, titre: t, texte: t },
  champs: [champEtiquette, champTitre, field.richtext('texte', 'Texte')],
  depart: (c) => ({ etiquette: c.apropos.surtitre, titre: c.apropos.titre, texte: c.apropos.texte }),
  rendu: (d) => <TexteDeuxColonnes {...d} />,
})

export const mTexteAtoutsBlock = modele({
  label: 'Les points clés',
  description: 'Une liste courte, chaque point coché à son tour, et la porte en regard.',
  forme: { etiquette: t, titre: t, texte: t, points: t, mediaId: media },
  champs: [champEtiquette, champTitre, champTexte, field.textarea('points', 'Points', { help: AIDE.lignes }), champPhoto],
  depart: (c) => ({
    etiquette: 'En pratique',
    titre: 'Ce qu’il faut\n*savoir*',
    texte: '',
    points: [`Au cabinet, à ${c.ville}`, 'En visio, si vous êtes loin ou empêché·e', ...c.services.slice(0, 2).map((s) => `${s.title}${s.duration ? ` — ${s.duration.split(/[—–]/)[0]!.trim()}` : ''}`)].join('\n'),
    mediaId: c.ambiance?.id ?? null,
  }),
  rendu: (d, _c, o) => <TexteAtouts etiquette={d.etiquette} titre={d.titre} texte={d.texte} points={enLignes(d.points)} photo={o.photo(d.mediaId, 5)} />,
})

export const mTexteSeparateurBlock = modele({
  label: 'Séparateur',
  description: 'Deux traits et trois petites arches qui se dessinent, entre deux sections.',
  forme: { mot: t },
  champs: [field.text('mot', 'Un mot au milieu', { help: 'Vide : trois petites arches.' })],
  depart: () => ({ mot: '' }),
  rendu: (d) => <TexteSeparateur mot={d.mot} />,
})

/* ══════════════════════════════════════════════════════════════════════
   CONTACT & RENDEZ-VOUS
   ══════════════════════════════════════════════════════════════════════ */

const SOURCE_CONTACT = { label: 'Téléphone, e-mail, adresse et horaires', href: '/admin/reglages' }
const contactForme = { etiquette: t, titre: t, texte: t, bouton: t }
const contactChamps = [champEtiquette, champTitre, champTexte, champBouton]
const coordonnees = (c: Contenu) => ({ telephone: c.telephone, email: c.email, adresse: c.adresse, horaires: c.horaires, rdv: c.rdv })

export const mContactMinimalBlock = modele({
  label: 'Contact minimal',
  description: 'Vos coordonnées en grand, en italique, et un bouton. Rien d’autre.',
  forme: contactForme,
  champs: contactChamps,
  depart: () => ({ etiquette: 'Contact', titre: 'Écrivez-moi,\n*simplement*', texte: '', bouton: RDV }),
  dataSource: SOURCE_CONTACT,
  rendu: (d, c) => <ContactMinimal {...d} {...coordonnees(c)} />,
})

export const mContactCartesBlock = modele({
  label: 'Contact en cartes',
  description: 'Une carte par moyen de vous joindre, et la semaine des consultations.',
  forme: contactForme,
  champs: contactChamps.slice(0, 3),
  depart: () => ({ etiquette: 'Contact', titre: 'Me *joindre*', texte: 'Par téléphone, par écrit, ou en passant la porte.', bouton: RDV }),
  dataSource: SOURCE_CONTACT,
  rendu: (d, c) => <ContactCartes {...d} {...coordonnees(c)} />,
})

export const mContactPlanBlock = modele({
  label: 'Contact avec le plan',
  description: 'La carte en grand ; à côté, l’adresse, la semaine et le rendez-vous.',
  forme: contactForme,
  champs: [champEtiquette, champTitre, champBouton],
  depart: () => ({ etiquette: 'Le cabinet', titre: 'Venir au\n*cabinet*', texte: '', bouton: RDV }),
  dataSource: SOURCE_CONTACT,
  rendu: (d, c) => <ContactPlan {...d} {...coordonnees(c)} />,
})

const appelForme = { etiquette: t, titre: t, texte: t, bouton: t }
const appelChamps = [champEtiquette, champTitre, champTexte, champBouton]
const appelDepart = () => ({ etiquette: 'Rendez-vous', titre: 'Prenons\n*le temps*', texte: 'Un premier échange, sans engagement, pour voir si nous pouvons travailler ensemble.', bouton: RDV })

export const mAppelBlock = modele({
  label: 'Invitation',
  description: 'Un panneau sable, un titre, un bouton.',
  forme: appelForme,
  champs: appelChamps,
  depart: appelDepart,
  rendu: (d, c) => <Appel {...d} rdv={c.rdv} />,
})

export const mAppelImageBlock = modele({
  label: 'Invitation en image',
  description: 'La porte d’un côté, l’invitation de l’autre, sur un panneau sable.',
  forme: { ...appelForme, mediaId: media },
  champs: [...appelChamps, champPhoto],
  depart: (c) => ({ ...appelDepart(), mediaId: c.ambiance?.id ?? null }),
  rendu: (d, c, o) => <AppelImage etiquette={d.etiquette} titre={d.titre} texte={d.texte} bouton={d.bouton} rdv={c.rdv} photo={o.photo(d.mediaId, 1)} />,
})

export const mAppelImmersifBlock = modele({
  label: 'Invitation immersive',
  description: 'La photo du cabinet en grand, une carte ivoire posée au milieu.',
  forme: { ...appelForme, mediaId: media },
  champs: [...appelChamps, champPhoto],
  depart: (c) => ({ ...appelDepart(), mediaId: c.ambiance?.id ?? null }),
  rendu: (d, c, o) => <AppelImmersif etiquette={d.etiquette} titre={d.titre} texte={d.texte} bouton={d.bouton} rdv={c.rdv} photo={o.photo(d.mediaId)} />,
})

export const mAppelDouxBlock = modele({
  label: 'Invitation douce',
  description: 'Une tasse qui fume, une phrase, un lien. Tout petit, tout calme.',
  forme: { texte: t, bouton: t },
  champs: [field.textarea('texte', 'La phrase', { help: 'Le mot clé entre *astérisques*.' }), champBouton],
  depart: () => ({ texte: 'Quand vous serez prêt·e, *je serai là*.', bouton: RDV }),
  rendu: (d, c) => <AppelDoux texte={d.texte} bouton={d.bouton} rdv={c.rdv} />,
})

/** Tous les modèles, avec leur catégorie dans la bibliothèque — dans l'ordre de la vitrine. */
export const MODELES = {
  mOuverturePleine: [mOuverturePleineBlock, 'Ouverture'],
  mOuverturePortrait: [mOuverturePortraitBlock, 'Ouverture'],
  mOuvertureEditoriale: [mOuvertureEditorialeBlock, 'Ouverture'],
  mOuvertureMinimale: [mOuvertureMinimaleBlock, 'Ouverture'],
  mOuvertureBandeau: [mOuvertureBandeauBlock, 'Ouverture'],
  mOuvertureTriptyque: [mOuvertureTriptyqueBlock, 'Ouverture'],
  mAproposPortrait: [mAproposPortraitBlock, 'Qui je suis'],
  mAproposAsymetrique: [mAproposAsymetriqueBlock, 'Qui je suis'],
  mAproposMedaillon: [mAproposMedaillonBlock, 'Qui je suis'],
  mAproposCitation: [mAproposCitationBlock, 'Qui je suis'],
  mAproposParcours: [mAproposParcoursBlock, 'Qui je suis'],
  mAproposChiffres: [mAproposChiffresBlock, 'Qui je suis'],
  mAproposEngagements: [mAproposEngagementsBlock, 'Qui je suis'],
  mAproposApproches: [mAproposApprochesBlock, 'Qui je suis'],
  mMethodeColonnes: [mMethodeColonnesBlock, 'Ma méthode'],
  mMethodeVerticale: [mMethodeVerticaleBlock, 'Ma méthode'],
  mMethodeCartes: [mMethodeCartesBlock, 'Ma méthode'],
  mMethodeSeance: [mMethodeSeanceBlock, 'Ma méthode'],
  mMethodeApproche: [mMethodeApprocheBlock, 'Ma méthode'],
  mServicesListe: [mServicesListeBlock, 'Accompagnements'],
  mServicesPortes: [mServicesPortesBlock, 'Accompagnements'],
  mServicesGrille: [mServicesGrilleBlock, 'Accompagnements'],
  mServicesNumerotes: [mServicesNumerotesBlock, 'Accompagnements'],
  mServicesFenetre: [mServicesFenetreBlock, 'Accompagnements'],
  mServicesDetail: [mServicesDetailBlock, 'Accompagnements'],
  mServicesTarifs: [mServicesTarifsBlock, 'Accompagnements'],
  mQuestionsAccordeon: [mQuestionsAccordeonBlock, 'Questions'],
  mQuestionsEditoriale: [mQuestionsEditorialeBlock, 'Questions'],
  mQuestionsCartes: [mQuestionsCartesBlock, 'Questions'],
  mPhotosLieu: [mPhotosLieuBlock, 'Photos & vidéos'],
  mPhotosFenetre: [mPhotosFenetreBlock, 'Photos & vidéos'],
  mPhotosBattants: [mPhotosBattantsBlock, 'Photos & vidéos'],
  mPhotosBienvenue: [mPhotosBienvenueBlock, 'Photos & vidéos'],
  mPhotosMur: [mPhotosMurBlock, 'Photos & vidéos'],
  mPhotosMosaique: [mPhotosMosaiqueBlock, 'Photos & vidéos'],
  mPhotosPleine: [mPhotosPleineBlock, 'Photos & vidéos'],
  mPhotosLegende: [mPhotosLegendeBlock, 'Photos & vidéos'],
  mVideoCinema: [mVideoCinemaBlock, 'Photos & vidéos'],
  mVideoArche: [mVideoArcheBlock, 'Photos & vidéos'],
  mTexteManifeste: [mTexteManifesteBlock, 'Textes'],
  mTexteCentre: [mTexteCentreBlock, 'Textes'],
  mTexteSouligne: [mTexteSouligneBlock, 'Textes'],
  mTexteCitation: [mTexteCitationBlock, 'Textes'],
  mTexteImage: [mTexteImageBlock, 'Textes'],
  mTexteBandeau: [mTexteBandeauBlock, 'Textes'],
  mTexteDeuxColonnes: [mTexteDeuxColonnesBlock, 'Textes'],
  mTexteAtouts: [mTexteAtoutsBlock, 'Textes'],
  mTexteSeparateur: [mTexteSeparateurBlock, 'Textes'],
  mContactMinimal: [mContactMinimalBlock, 'Contact & rendez-vous'],
  mContactCartes: [mContactCartesBlock, 'Contact & rendez-vous'],
  mContactPlan: [mContactPlanBlock, 'Contact & rendez-vous'],
  mAppel: [mAppelBlock, 'Contact & rendez-vous'],
  mAppelImage: [mAppelImageBlock, 'Contact & rendez-vous'],
  mAppelImmersif: [mAppelImmersifBlock, 'Contact & rendez-vous'],
  mAppelDoux: [mAppelDouxBlock, 'Contact & rendez-vous'],
} as const

type Entree = readonly [unknown, string]
const blocsDe = <M extends Record<string, Entree>>(m: M) => Object.fromEntries(Object.entries(m).map(([k, [b]]) => [k, b])) as { [K in keyof M]: M[K][0] }
const categoriesDe = <M extends Record<string, Entree>>(m: M) => Object.fromEntries(Object.entries(m).map(([k, [, cat]]) => [k, cat])) as { [K in keyof M]: M[K][1] }

export const MODELES_BLOCS = blocsDe(MODELES)
export const MODELES_CATEGORIES = categoriesDe(MODELES)
/** L'ordre de la vitrine. */
export const MODELES_ORDRE = Object.keys(MODELES) as (keyof typeof MODELES)[]
