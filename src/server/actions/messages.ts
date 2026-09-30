/**
 * Messages renvoyés par les Server Actions — en un seul endroit.
 *
 * Ce sont des phrases lues par Anne, et certaines sont citées par les tests
 * de bout en bout (`e2e/`) : les modifier ici, c'est les modifier partout,
 * et savoir qu'il faut relancer les tests. Aucune dépendance : le module
 * est importable depuis un composant client.
 */
export const MESSAGES = {
  /* Génériques */
  champsACorriger: 'Certains champs sont à corriger.',
  sessionExpiree: 'Session expirée. Reconnectez-vous.',
  erreurGenerique: 'Une erreur est survenue. Réessayez.',
  droitsInsuffisants: 'Cette action est réservée à la personne propriétaire du site.',
  enregistrementEchoue: 'L’enregistrement n’a pas abouti. Réessayez dans un instant.',

  /* Pages et sections */
  pageIntrouvable: 'La page n’a pas été trouvée. Rechargez l’administration.',
  sectionIntrouvable:
    'Cette section n’existe plus — elle a peut-être été supprimée. Rechargez la page.',
  blocIndisponible: 'Ce modèle de section n’est plus disponible.',
  modeleIntrouvable: 'Ce modèle n’existe plus. Rechargez la page.',
  placementImpossible: 'Impossible de placer la section à cet endroit. Réessayez.',
  apparenceRefusee: 'Ces réglages d’apparence ne sont pas acceptés.',
  instantaneIllisible:
    'La version en ligne de la page est illisible. Contactez la personne qui gère le site.',
  rienAPublier: 'Rien à publier : la page ne contient aucune section.',
  rienARestaurer: 'Rien à restaurer.',
  jamaisPubliee: 'Cette page n’a jamais été publiée : rien vers quoi revenir.',
  instantaneAutrePage:
    'La version en ligne ne correspond pas à cette page. Rechargez l’administration.',
  copieEchouee: 'La copie n’a pas abouti. Réessayez.',
  ajoutSectionEchoue: 'L’ajout de la section n’a pas abouti. Réessayez.',
  nomDeModeleRequis: 'Donnez un nom à ce modèle.',
  seuleSectionEntiere: 'Seule une section entière peut devenir un modèle.',
  modeleAncienneVersion:
    'Ce modèle a été créé avec une ancienne version du site et ne peut plus être ajouté.',
  texteNonEditableEnDirect:
    'Ce texte se modifie depuis le panneau de droite, pas directement dans la page.',
  texteRefuse: 'Ce texte n’est pas accepté pour cette section.',
  ancreRequise: 'Une section visible dans la navigation doit avoir une ancre.',
  contenuInvalide: 'Contenu invalide.',
  colonnesDansColonne: 'Un bloc « Colonnes » ne peut pas être placé dans une colonne.',
  imbricationTropProfonde: 'Imbrication trop profonde.',
  conteneurAutrePage: 'Le conteneur appartient à une autre page.',

  /* Accompagnements, FAQ, médias, messages */
  adressePrise:
    'Cette adresse est déjà utilisée par un autre accompagnement. Choisissez-en une autre.',
  accompagnementIntrouvable: 'Cet accompagnement n’existe plus. Rechargez la page.',
  regroupementIntrouvable: 'Ce titre de regroupement n’existe plus. Rechargez la page.',
  titreRegroupementRequis: 'Donnez un titre à ce regroupement.',
  questionIntrouvable: 'Cette question n’existe plus. Rechargez la page.',
  imageIntrouvable: 'Cette image n’existe plus. Rechargez la page.',
  messageIntrouvable: 'Ce message n’existe plus. Rechargez la page.',
  liensMenuACorriger: 'Certains liens du menu sont à corriger.',

  /* Utilisateurs */
  compteExistant: 'Un compte existe déjà avec cette adresse e-mail.',
  creationEchouee: 'La création n’a pas abouti. Réessayez dans un instant.',
  personneIntrouvable: 'Cette personne n’existe plus. Rechargez la page.',
  propreCompte: 'Vous ne pouvez pas supprimer votre propre compte.',
  compteActifPasDeLien:
    'Cette personne a déjà choisi son mot de passe : seule la personne propriétaire du site peut lui refaire un lien.',
  supprimerProprietaire: 'Seule la personne propriétaire du site peut supprimer un compte propriétaire.',
  dernierProprietaire: 'Impossible de supprimer le dernier compte propriétaire du site.',
  invitationInvalide:
    'Ce lien n’est plus valable. Demandez-en un nouveau à la personne qui vous a invité·e.',
} as const
