/**
 * Jeu de données des tests — connu, minimal, stable.
 *
 * Les tests s'appuient sur ces valeurs exactes. Les changer, c'est changer
 * les assertions : elles sont ici pour qu'on ne les cherche pas dans dix
 * fichiers.
 */
export const COMPTE = {
  nom: 'Testeuse E2E',
  email: 'e2e@anasawi.test',
  /**
   * Le mot de passe vient de l'environnement : il n'a pas à vivre dans le
   * dépôt, même pour un compte de test.
   *
   * Accesseur et non valeur figée : les imports sont hissés, si bien qu'une
   * lecture à l'évaluation du module précéderait le chargement de
   * `.env.test` par dotenv — et renverrait toujours une chaîne vide.
   */
  get motDePasse(): string {
    return process.env.E2E_ADMIN_PASSWORD ?? ''
  },
} as const

/** Réglages installés par la remise à plat — le site s'y réfère partout. */
export const REGLAGES = {
  nomDuSite: 'ANASAWI',
  praticienne: 'Anne Winzenried',
  email: 'annewinzenried@orange.fr',
  telephone: '06 70 89 44 97',
  rue: '6 rue Saint-Martin',
  codePostal: '35510',
  ville: 'Cesson-Sévigné',
  titreSeo: 'Anne Winzenried — Thérapeute à Cesson-Sévigné | ANASAWI',
} as const

export const PAGE_ACCUEIL = {
  slug: 'accueil',
  titre: 'Accueil',
} as const

/**
 * Page secondaire publiée, porteuse de deux sections VOLONTAIREMENT
 * cassées : un type absent du registre et un payload qui ne satisfait pas
 * son schéma.
 *
 * Elle existe parce que ces deux accidents faisaient auparavant disparaître
 * la section du site SANS AUCUNE TRACE — un hero entier s'est ainsi
 * volatilisé, et le diagnostic a coûté des heures. Les tests exigent
 * désormais que le reste de la page tienne debout, et que l'éditeur dise
 * clairement laquelle est cassée.
 */
/**
 * Page portant le hero « L'arche » avec ses réglages de titre : une ligne
 * par placement, et une taille réduite. Le site d'Anne s'ouvre sur ce
 * hero ; l'accueil du jeu de test, lui, utilise le hero en deux colonnes.
 */
export const PAGE_ARCHE = {
  slug: 'page-avec-arche',
  titre: 'Page avec l’arche',
  /** Pour-cent de la taille de la maquette. */
  taille: 80,
  lignes: [
    { text: 'Ligne à gauche', align: 'gauche' },
    { text: 'Ligne au centre', align: 'centre' },
    { text: 'Ligne à droite', align: 'droite' },
    /* Un mot long, insécable : sur un téléphone, il ne tient qu'en
       réduisant le titre — c'est ce qu'on vérifie. */
    { text: 'Psychothérapeute', align: 'centre' },
  ],
} as const

export const PAGE_CASSEE = {
  slug: 'page-avec-blocs-casses',
  titre: 'Page aux blocs cassés',
  /** Type qui n'existe pas au registre — et qui ne doit jamais y entrer. */
  typeInconnu: 'blocQuiNExistePasAuRegistre',
  /** Texte de la seule section valide de la page : elle, doit s'afficher. */
  texteValide: 'Cette section-ci doit rester visible.',
} as const

export const SERVICES = [
  {
    slug: 'therapie-individuelle-e2e',
    titre: 'Thérapie individuelle',
    extrait: 'Une heure pour démêler ce qui s’est noué.',
    duree: '1 h · 60 €',
    methode: 'Gestalt-thérapie',
  },
  {
    slug: 'viniyoga-e2e',
    titre: 'Viniyoga',
    extrait: 'Le yoga adapté à vous, et non l’inverse.',
    duree: '1 h · 55 €',
    methode: 'Séance individuelle',
  },
] as const

export const FAMILLES = ['Traverser quelque chose', 'Passer par le corps'] as const

export const QUESTIONS = [
  {
    question: 'Comment se passe la première séance ?',
    reponse: 'On fait connaissance, sans engagement pour la suite.',
  },
  {
    question: 'Les séances sont-elles remboursées ?',
    reponse: 'Certaines mutuelles prennent en charge une partie des séances.',
  },
] as const

/* ── Valeurs limites, réutilisées par les tests de robustesse ──────────── */

/** Dépasse la borne `max(160)` du titre d'accompagnement. */
export const TROP_LONG = 'É'.repeat(400)

/** Caractères qui cassent une échappée HTML, une URL ou une requête SQL. */
export const CARACTERES_SPECIAUX = `<script>alert('x')</script> & " ' \` ; -- /* */ é à ñ 漢字 🌿`

/** Adresses refusées par `z.string().email()`. */
export const EMAILS_INVALIDES = ['pas-un-email', 'a@', '@b.fr', 'a b@c.fr', '']

/** Messages exacts affichés par l'application — cités, jamais paraphrasés. */
export const MESSAGES = {
  contactInvalide: 'Formulaire invalide.',
  contactTropDeMessages: 'Trop de messages envoyés. Réessayez dans une heure.',
  altObligatoire: 'Le texte alternatif est obligatoire.',
  slugPris: 'Ce slug est déjà utilisé.',
  formulaireInvalide: 'Formulaire invalide.',
  /* Message unique et volontairement muet : il ne distingue ni le compte
     inconnu, ni le mot de passe faux, ni le blocage par limitation de débit
     — pour ne pas permettre d'énumérer les comptes ni de deviner le seuil. */
  identifiantsIncorrects: 'Identifiants incorrects.',
} as const

/** Seuil de la limitation de débit à la connexion (8 par quart d'heure). */
export const LIMITE_CONNEXION = 8

/** Seuil du formulaire de contact (5 envois par heure et par adresse IP). */
export const LIMITE_CONTACT = 5

/** Un message valide — chaque champ au-dessus de son minimum. */
export const MESSAGE_VALIDE = {
  name: 'Camille Durand',
  email: 'camille.durand@exemple.fr',
  phone: '06 12 34 56 78',
  message:
    'Bonjour, je souhaiterais convenir d’un premier rendez-vous. Quelles sont vos disponibilités ?',
  consent: true,
} as const
