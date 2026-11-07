import type { Contenu } from './contenu'

/**
 * LES TEXTES DE LA VERSION MODERNE — chaque mot affiché par une section,
 * avec sa valeur de départ tirée du vrai contenu d'Anne (réglages, textes
 * du site classique) ou, à défaut, une formule rédigée.
 *
 * PUR (aucune requête, aucun composant) : utilisé à la fois
 *  - par les sections, pour compléter un champ laissé vide ;
 *  - par l'éditeur, pour PRÉREMPLIR les champs (voir `preremplir` des
 *    blocs) : Anne voit et modifie le texte réellement affiché.
 *
 * Conventions des titres : une ligne par retour à la ligne, et le mot clé
 * entre astérisques (« Ce que je vous\n*propose* »).
 */

const prenomDe = (nom: string) => nom.split(' ')[0] ?? nom
const nomDe = (nom: string) => nom.split(' ').slice(1).join(' ') || nom

export type TextesLettre = {
  salutation: string
  nom: string
  telephone: string
  email: string
  message: string
  consentement: string
  signature: string
  bouton: string
  merciTitre: string
  merciTexte: string
}

export const lettreParDefaut = (prenom: string): TextesLettre => ({
  salutation: `Chère ${prenom},`,
  nom: 'Je m’appelle…',
  telephone: 'Mon téléphone (facultatif)',
  email: 'Vous pouvez me répondre à…',
  message: 'Je vous écris parce que…',
  consentement: 'J’accepte que mes coordonnées servent uniquement à me répondre.',
  signature: '— avec mes salutations',
  bouton: 'Envoyer la lettre',
  merciTitre: 'Votre lettre est *partie*.',
  merciTexte: `${prenom} vous répondra personnellement, en général sous 48 heures.`,
})

/** Les textes de l'exercice de respiration (composant `Souffle`). */
export type TextesSouffle = {
  inspirez: string
  expirez: string
  arreter: string
  recommencer: string
  /** Pendant l'exercice ; « {n} » devient le numéro de la respiration. */
  compteur: string
  bravo: string
  repos: string
}
export const SOUFFLE_PAR_DEFAUT: TextesSouffle = {
  inspirez: 'Inspirez',
  expirez: 'Expirez',
  arreter: 'Arrêter',
  recommencer: 'Recommencer',
  compteur: 'Respiration {n} / 8',
  bravo: 'Bravo. Prenez ce calme avec vous.',
  repos: '8 respirations · 4 s · 4 s',
}

/** La citation en deux temps : la seconde moitié en accent. */
function phraseAccentuee(texte: string): string {
  if (texte.includes('*')) return texte
  const mots = texte.split(' ')
  const milieu = Math.ceil(mots.length / 2)
  return `${mots.slice(0, milieu).join(' ')} *${mots.slice(milieu).join(' ')}*`
}

export const TEXTES = {
  mSeuil: (c: Contenu) => ({
    surtitre: `${c.metier} · ${c.ville}`,
    nom: c.nom,
    intro: c.ouverture.intro || c.accroche,
    accroche: c.accroche,
    pastille2: `${c.services.length} accompagnements`,
    pastille3: 'Au cabinet ou en visio',
    bouton: 'Prendre rendez-vous',
    bouton2: 'Découvrir',
    invitation: 'Défiler pour entrer',
    slogan: 'Prenez le temps, installez-vous.',
  }),
  mRespiration: () => ({
    surtitre: 'Avant de commencer',
    titre: 'Prenez le temps\nd’une *respiration*.',
    texte: 'Un instant pour vous, avant la suite. Suivez le cercle : il gonfle, vous inspirez ; il se pose, vous expirez.',
    bouton: 'Respirer une minute',
    ...SOUFFLE_PAR_DEFAUT,
  }),
  mRencontre: (c: Contenu) => ({
    menu: 'Rencontre',
    surtitre: c.apropos.surtitre,
    titre: `${prenomDe(c.nom)}\n*${nomDe(c.nom)}*`,
    texte: c.apropos.texte,
    citation: c.apropos.citation ?? '',
    legendeCabinet: 'Le cabinet, le matin',
    signature: prenomDe(c.nom),
    anneau: `${c.metier} · ${c.ville} · ${[...new Set(c.services.map((s) => s.method).filter(Boolean))].slice(0, 2).join(' · ')} · `,
  }),
  mChemin: (c: Contenu) => ({
    menu: 'Le chemin',
    surtitre: c.methode.surtitre,
    titre: c.methode.titre,
    intro: c.methode.intro,
    etapes: c.methode.etapes.map((e) => ({ titre: e.titre, texte: e.texte })),
  }),
  mArches: (c: Contenu) => ({
    menu: 'Accompagnements',
    surtitre: 'Accompagnements',
    titre: 'Ce que je vous\n*propose*',
    texte: `${c.services.length} façons d’être accompagné. Survolez ou touchez une carte pour l’ouvrir.`,
    bouton: 'Réserver cet accompagnement',
  }),
  mEnPratique: () => ({
    menu: '',
    surtitre: 'En pratique',
    titre: 'Tout ce qu’il faut\n*savoir*',
    cabinet: 'Le cabinet',
    itineraire: 'Itinéraire',
    seances: 'Les séances',
    visioTitre: 'En visio aussi',
    visioTexte: 'Si vous êtes loin, ou empêché.',
    consultations: 'Consultations',
    ferme: 'Fermé',
    planAfficher: 'Afficher le plan',
    planCookies: 'Google Maps peut déposer des cookies',
    planExplorer: 'Explorer la carte',
    planRecentrer: 'Recentrer',
  }),
  mPhrase: (c: Contenu) => ({
    texte: phraseAccentuee(c.citation.texte),
    auteur: c.citation.auteur,
  }),
  mPromenade: () => ({
    menu: 'Le cabinet',
    surtitre: 'Le lieu',
    titre: 'Le *cabinet*',
    legende: 'Entrez, regardez autour de vous : chaque porte ouvre sur un coin du cabinet.',
  }),
  mConversation: (c: Contenu) => ({
    menu: 'Questions',
    surtitre: 'Questions fréquentes',
    titre: 'Ce qu’on me\n*demande*',
    signature: `${prenomDe(c.nom)} · répond en personne`,
    suivante: 'Question suivante',
  }),
  mRendezVous: (c: Contenu) => ({
    menu: '',
    surtitre: 'Rendez-vous',
    titre: 'Écrivez-moi,\n*simplement*',
    ouvertAujourdhui: 'Ouvert aujourd’hui · {h}',
    fermeAujourdhui: 'Le cabinet est fermé aujourd’hui',
    ferme: 'Fermé',
    ...lettreParDefaut(prenomDe(c.nom)),
  }),
  mHorizon: () => ({
    titre: 'Prenons\n*le temps.*',
    bouton: 'Prendre rendez-vous',
    mention: 'version classique',
    colonneContact: 'Me joindre',
    colonneSite: 'Le site',
    lienMessage: 'Écrire un message',
  }),
} as const

export type CleTextes = keyof typeof TEXTES

/** Vide : chaîne blanche, nul, liste vide. */
export const estVide = (v: unknown) =>
  v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0)

/**
 * Les textes d'une section. Section préremplie (`rempli`) : la saisie
 * telle quelle — un champ vidé reste vide (pastille masquée…). Sinon
 * (section jamais ouverte dans l'éditeur) : les valeurs de départ.
 */
export function textesDe<K extends CleTextes>(cle: K, c: Contenu, saisie: Record<string, unknown>): ReturnType<(typeof TEXTES)[K]> {
  const depart = TEXTES[cle](c) as Record<string, unknown>
  const resultat: Record<string, unknown> = { ...depart }
  for (const k of Object.keys(depart)) {
    const v = saisie[k]
    if (saisie.rempli === true ? v !== undefined && v !== null : !estVide(v)) resultat[k] = v
  }
  return resultat as ReturnType<(typeof TEXTES)[K]>
}

/** Les photos de la promenade par défaut : la photothèque, sans les substituts. */
export const photosPromenade = (c: Contenu) => c.photos.filter((p) => !/substitution/i.test(p.alt)).slice(0, 9)

/** Les entrées du menu : type de section → ancre (posée par la section). */
export const ANCRES: Partial<Record<CleTextes, string>> = {
  mRencontre: 'a-propos',
  mChemin: 'methode',
  mArches: 'accompagnements',
  mPromenade: 'cabinet',
  mConversation: 'questions',
  mEnPratique: 'pratique',
  mRendezVous: 'contact',
}
