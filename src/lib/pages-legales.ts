import { z } from 'zod'

/**
 * LE TEXTE DES PAGES LÉGALES — modifiable de bout en bout depuis
 * Réglages › Pied de page.
 *
 * Chaque page est une suite de RUBRIQUES (un titre, un texte). Le texte
 * s'écrit simplement :
 *  - un paragraphe par ligne vide ; un simple retour à la ligne reste un
 *    retour à la ligne ;
 *  - une liste : des lignes qui commencent par « - » ;
 *  - **en gras**, et des liens [texte](https://…) ;
 *  - des MOTS-CLÉS entre accolades, remplacés par les Réglages : {nom},
 *    {email}, {adresse}… Si l'information manque, la LIGNE qui la contient
 *    n'apparaît pas : rien n'est inventé,
 *    et changer son e-mail dans les Coordonnées met la page à jour.
 *
 * Aucune dépendance serveur : lu par le formulaire des Réglages et par les
 * pages publiques.
 */

export const rubriqueSchema = z.object({
  id: z.string().min(1).max(40),
  titre: z.string().trim().max(160).catch(''),
  texte: z.string().max(8000).catch(''),
})
export type Rubrique = z.infer<typeof rubriqueSchema>

/** Les mots-clés disponibles, et ce qu'ils deviennent (pour l'aide du formulaire). */
export const MOTS_CLES: { cle: string; aide: string }[] = [
  { cle: 'nom', aide: 'votre nom' },
  { cle: 'metier', aide: 'votre titre professionnel' },
  { cle: 'adresse', aide: 'l’adresse du cabinet' },
  { cle: 'telephone', aide: 'votre téléphone' },
  { cle: 'email', aide: 'votre e-mail (en lien)' },
  { cle: 'hebergeur', aide: 'l’hébergeur' },
  { cle: 'mediateur', aide: 'le médiateur' },
  { cle: 'deontologie', aide: 'le paragraphe de déontologie' },
  { cle: 'credits', aide: 'les crédits' },
  { cle: 'conservation', aide: 'la durée de conservation' },
  { cle: 'prestataires', aide: 'la liste des prestataires' },
  { cle: 'confidentialite', aide: 'un lien vers la politique de confidentialité' },
]

const r = (id: string, titre: string, texte: string): Rubrique => ({ id, titre, texte })

export const MENTIONS_DEPART: Rubrique[] = [
  r('hebergement', 'Hébergement', '{hebergeur}'),
  r(
    'mediation',
    'Médiation de la consommation',
    'Conformément aux articles L611-1 et suivants du Code de la consommation, en cas de litige non résolu à l’amiable, vous pouvez recourir gratuitement au médiateur suivant : {mediateur}',
  ),
  r(
    'deontologie',
    'Déontologie',
    '{deontologie}\n\nLe site présente une activité d’accompagnement psychothérapeutique ; il ne remplace en aucun cas une consultation médicale. En cas d’urgence, composez le 15 ou le 112, ou le 3114 (numéro national de prévention du suicide).',
  ),
  r(
    'propriete',
    'Propriété intellectuelle',
    'Les textes, photographies et éléments graphiques de ce site sont protégés par le droit d’auteur. Toute reproduction, même partielle, est soumise à l’accord préalable de l’éditrice. Les logos des organismes cités appartiennent à leurs titulaires respectifs.\n\nCrédits : {credits}',
  ),
  r(
    'liens',
    'Liens vers d’autres sites',
    'Les liens vers d’autres sites (organismes, collègues) sont proposés à titre d’information ; leur contenu relève de la seule responsabilité de leurs éditeurs.',
  ),
  r('donnees', 'Données personnelles et cookies', 'Leur traitement est décrit dans la {confidentialite}.'),
]

export const CONFIDENTIALITE_INTRO_DEPART =
  'Le respect de votre vie privée est au cœur de mon métier. Cette page explique, simplement, quelles données ce site recueille, pourquoi, combien de temps, et comment exercer vos droits — conformément au Règlement général sur la protection des données (RGPD) et à la loi Informatique et Libertés.'

export const CONFIDENTIALITE_DEPART: Rubrique[] = [
  r('responsable', 'Qui est responsable de vos données ?', '{nom}\n{metier}\n{adresse}\n{email}'),
  r(
    'recueil',
    'Ce que le site recueille',
    '**Le formulaire de contact** : votre nom, votre adresse e-mail, votre téléphone si vous le donnez, et votre message. Ils servent uniquement à vous répondre et, si vous le souhaitez, à convenir d’un rendez-vous. Le formulaire n’est envoyé qu’avec votre accord explicite (case à cocher).\n\nMerci de ne pas détailler votre situation de santé dans ce message : quelques mots suffisent, nous en parlerons de vive voix. Si vous choisissez d’en dire davantage, ces informations sont traitées avec la même confidentialité que le reste de nos échanges, et uniquement pour vous répondre.\n\n**La sécurité du site** : pour limiter les envois abusifs, l’adresse IP de l’expéditeur est transformée en une empreinte irréversible (elle n’est jamais conservée en clair).\n\nLe site ne mesure pas votre visite (aucun outil de statistiques), n’affiche aucune publicité et ne revend aucune donnée.',
  ),
  r(
    'base',
    'Sur quelle base ?',
    '- Votre consentement, donné en envoyant le formulaire (article 6.1.a du RGPD, et 9.2.a pour d’éventuelles informations de santé).\n- L’intérêt légitime à protéger le site contre les abus (article 6.1.f).',
  ),
  r('duree', 'Combien de temps ?', 'Vos messages sont conservés {conservation}, puis supprimés. Vous pouvez demander leur suppression à tout moment.'),
  r(
    'acces',
    'Qui y a accès ?',
    'Moi seule. Pour fonctionner, le site s’appuie sur des prestataires techniques, qui n’utilisent pas vos données pour leur propre compte :\n\n{prestataires}\n\nLes transferts vers les États-Unis sont encadrés par le cadre de protection des données UE–États-Unis (Data Privacy Framework) ou par les clauses contractuelles types de la Commission européenne.',
  ),
  r(
    'cookies',
    'Cookies',
    'Ce site ne dépose aucun cookie de mesure d’audience ni de publicité : il n’y a donc rien à accepter en arrivant. Le plan d’accès (Google Maps) et, le cas échéant, une vidéo (YouTube ou Vimeo) sont fournis par d’autres sites qui peuvent déposer leurs propres cookies : ils ne se chargent que si vous cliquez pour les afficher, et seulement pour la page consultée.\n\nUn cookie strictement nécessaire est utilisé uniquement pour l’espace d’administration du site (connexion de l’éditrice) ; il ne concerne pas les visiteurs.',
  ),
  r(
    'droits',
    'Vos droits',
    'Vous pouvez demander l’accès à vos données, leur rectification, leur effacement, leur portabilité, la limitation de leur traitement, ou vous y opposer, et retirer votre consentement à tout moment, en écrivant à {email}. Je vous réponds dans un délai d’un mois.\n\nSi vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL : [www.cnil.fr](https://www.cnil.fr/fr/plaintes).',
  ),
  r('seance', 'Et en séance ?', 'Ce que vous confiez en séance relève du secret professionnel et n’est en aucun cas enregistré sur ce site.'),
]

/* ── Le rendu : du texte saisi aux blocs de la page ─────────────────── */

export type Morceau = { t: 'texte'; v: string } | { t: 'gras'; v: string } | { t: 'lien'; v: string; url: string } | { t: 'br' }
export type Bloc = { t: 'p'; morceaux: Morceau[] } | { t: 'ul'; items: Morceau[][] }

/** Les valeurs des mots-clés : du texte (déjà avec ses liens éventuels), ou une liste. */
export type Valeurs = Record<string, string | string[] | undefined | null>

const RE_CLE = /\{([a-z]+)\}/g

/** Remplace les mots-clés d'une ligne ; null si l'un d'eux est vide (la ligne disparaît). */
function remplacer(ligne: string, valeurs: Valeurs): string | null {
  let vide = false
  const sortie = ligne.replace(RE_CLE, (brut, cle: string) => {
    if (!(cle in valeurs)) return brut
    const v = valeurs[cle]
    const texte = Array.isArray(v) ? v.join(', ') : (v ?? '').trim()
    if (!texte) vide = true
    return texte
  })
  return vide ? null : sortie
}

/** **gras** et [liens](https://… | mailto:… | /…). */
export function enLigne(texte: string): Morceau[] {
  const out: Morceau[] = []
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(((?:https?:\/\/|mailto:|\/)[^\s)]+)\)/g
  let dernier = 0
  for (const m of texte.matchAll(re)) {
    if (m.index! > dernier) out.push({ t: 'texte', v: texte.slice(dernier, m.index) })
    if (m[1]) out.push({ t: 'gras', v: m[1] })
    else out.push({ t: 'lien', v: m[2]!, url: m[3]! })
    dernier = m.index! + m[0].length
  }
  if (dernier < texte.length) out.push({ t: 'texte', v: texte.slice(dernier) })
  return out
}

export function blocsDe(texte: string, valeurs: Valeurs): Bloc[] {
  const blocs: Bloc[] = []
  for (const para of texte.split(/\n\s*\n/)) {
    const lignes = para.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!lignes.length) continue
    /* Un mot-clé « liste » seul sur sa ligne : une liste à puces. */
    const seul = lignes.length === 1 ? /^\{([a-z]+)\}$/.exec(lignes[0]!) : null
    const liste = seul && Array.isArray(valeurs[seul[1]!]) ? (valeurs[seul[1]!] as string[]) : null
    if (liste) {
      if (liste.length) blocs.push({ t: 'ul', items: liste.map((l, i) => enLigne(l + (i === liste.length - 1 ? '.' : ' ;'))) })
      continue
    }
    if (lignes.every((l) => l.startsWith('- '))) {
      const items = lignes.map((l) => remplacer(l.slice(2), valeurs)).filter((l): l is string => l !== null)
      if (items.length) blocs.push({ t: 'ul', items: items.map(enLigne) })
      continue
    }
    const gardees = lignes.map((l) => remplacer(l, valeurs)).filter((l): l is string => l !== null)
    if (gardees.length)
      blocs.push({ t: 'p', morceaux: gardees.flatMap((l, i) => (i ? [{ t: 'br' } as Morceau, ...enLigne(l)] : enLigne(l))) })
  }
  return blocs
}
