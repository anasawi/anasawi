# Matrice de couverture — tests de bout en bout

Ce document dit **ce qui est vérifié, et ce qui ne l'est pas**. La
seconde colonne compte autant que la première : une matrice qui ne
listerait que les succès donnerait une fausse impression de complétude.

Harnais : Playwright, navigateur réel (Chromium), base Neon dédiée
(branche `test`), trois profils d'écran — ordinateur 1440×900, tablette
(iPad gen 7), mobile (iPhone 13).

Les suites `admin/` et `api/` ne sont jouées que sur le profil
ordinateur : l'administration n'est pas encore adaptée sous 1000 px (voir
« Non couvert »), et rejouer trois fois des assertions d'API n'apprend
rien de plus.

---

## Site public

| Domaine | Vérifié | Fichier |
| --- | --- | --- |
| Accueil | code 200, sections publiées affichées, un seul H1, images chargées et pourvues d'un `alt`, aucun débordement horizontal, aucune erreur de console | `public/accueil.spec.ts` |
| Coordonnées | adresse, téléphone et e-mail présents **dans la section contact ET le pied de page**, protocoles `mailto:` et `tel:` au format E.164 | `public/accueil.spec.ts` |
| Navigation | chaque ancre du menu désigne une section existante, un clic y amène réellement (avec garde : la cible ne doit pas être déjà visible), lien d'évitement qui donne le focus au contenu | `public/accueil.spec.ts` |
| Menu sous 1024 px | le bouton ouvre et referme le panneau, Échap le referme, un clic sur une entrée le referme | `public/accueil.spec.ts` |
| Routes | `/`, `/templates`, `/login` en 200 avec le bon titre ; cinq chemins inexistants en **vrai 404** ; chemins de l'application (`/admin`, `/api`, `/login`, `/preview`) jamais servis comme contenu ; retour arrière, avance et rechargement du navigateur | `public/routes.spec.ts` |
| Blocs irrécupérables | page à 200 malgré deux sections cassées, section saine affichée, en-tête et pied intacts, aucun message technique au visiteur, aucune coquille vide | `public/blocs-casses.spec.ts` |
| Images | le rideau d'apparition reste fermé tant que l'image n'est pas chargée (réseau retenu), puis s'ouvre sur l'image réelle ; découpage effectivement retiré | `public/images.spec.ts` |
| Vidéo — Cinéma | muette, en boucle, sans commande, clic traversant ; joue réellement (`currentTime` avance) ; servie par plages d'octets (206) ; le cadre s'ouvre de 64 % aux bords de l'écran en descendant, coins doux puis droits | `public/video-cinema.spec.ts` |
| Formulaire de contact | validation locale sans appel serveur, erreurs rattachées à leur champ (`aria-invalid` / `aria-describedby`), adresse invalide, message trop court, consentement, réponses 429 et 500 du serveur, coupure réseau, double clic, envoi réel puis remise à zéro, piège à robots hors écran et hors tabulation | `public/formulaire-contact.spec.ts` |
| Référencement | `robots.txt` (administration fermée, plan du site désigné), `sitemap.xml` (XML valide, l'accueil et rien d'autre — site à page unique), titre, description, canonique absolue, métadonnées de partage, indexabilité | `public/referencement.spec.ts` |
| JSON-LD | JSON valide en un seul graphe, coordonnées réelles du cabinet, praticienne, questions fréquentes, `@type` et `@id` sur chaque nœud | `public/referencement.spec.ts` |
| Hiérarchie des titres | commence par le H1, aucun saut de niveau, chaque accompagnement en H3 | `public/referencement.spec.ts` |

## Administration

| Domaine | Vérifié | Fichier |
| --- | --- | --- |
| Connexion | formulaire non indexable, mot de passe faux et compte inconnu **avec le même message**, champs vides, adresses invalides, double clic, déconnexion, limitation de débit à huit essais | `auth/connexion.spec.ts` |
| Protection des routes | neuf écrans d'administration renvoient vers la connexion sans session, la destination demandée est conservée | `auth/connexion.spec.ts` |
| Accompagnements | création (apparition immédiate + persistance), adresse déduite du titre, titre vide, titre démesuré, caractères spéciaux, adresse déjà prise, annulation, renommage, suppression avec confirmation nommée, visibilité **propagée au site dans les deux sens** | `admin/accompagnements.spec.ts` |
| Titres de regroupement | ajout, renommage persistant, abandon par Échap, titre vidé, suppression qui conserve les accompagnements | `admin/accompagnements.spec.ts` |
| Questions fréquentes | création, question sans réponse, question démesurée, caractères spéciaux conservés tels quels, annulation, modification, visibilité propagée, suppression, et **chaque commande nomme sa question** | `admin/faq.spec.ts` |
| Brouillon / publication | état « En ligne », une modification bascule l'état **sans toucher au site**, publication, annulation du brouillon, survie au rechargement, menu inerte quand tout est en ligne, aperçu qui ne publie rien | `admin/editeur-publication.spec.ts` |
| Blocs cassés côté éditeur | cartouche nommant le type fautif et son motif, sections saines toujours affichées — sur l'accueil, dans le cadre de la scène | `admin/blocs-casses.spec.ts` |
| Médias — vidéo | fichier vidéo recompressé dans le navigateur puis envoyé (< 4 Mo), rangé comme vidéo (lecteur muet, servi en 206), supprimé ensuite ; sans description, rien ne part | `admin/medias-video.spec.ts` |
| Réglages | valeurs affichées, téléphone modifié **jusqu'au JSON-LD**, adresse jusqu'au pied de page, e-mail invalide, nom démesuré, abandon sans enregistrement | `admin/reglages.spec.ts` |
| Messages | arrivée depuis le formulaire public, marquage lu / non lu persistant, coordonnées actionnables, confirmation nommée, suppression, ordre antichronologique | `admin/messages.spec.ts` |

## API

| Domaine | Vérifié | Fichier |
| --- | --- | --- |
| `POST /api/contact` | message complet, téléphone facultatif, caractères spéciaux, corps vide, corps non-JSON, nom d'une lettre, message trop court, consentement, cinq adresses invalides, bornes de longueur, piège à robots (200 sans enregistrement), limitation à cinq envois par heure **et par adresse** | `api/contact.spec.ts` |
| `POST /api/upload` | 401 sans session et sans écriture, 400 sans formulaire, 400 sans fichier, 415 pour un SVG ou un exécutable déguisé, 413 au-delà de la borne, dépôt valide **relu** avec cache immuable | `api/upload.spec.ts` |
| `GET /api/media/…` | clé inconnue en 404, extension inconnue en 404, remontée de dossier sans effet | `api/upload.spec.ts` |

---

## Non couvert — et pourquoi

Ces zones sont **connues et assumées**, pas oubliées.

| Zone | Raison |
| --- | --- |
| Administration sous 1000 px | L'interface n'y est pas adaptée : le constat est antérieur aux tests, et le chantier n'est pas ouvert. Les suites `admin/` ne tournent donc que sur le profil ordinateur. Y ajouter des tests reviendrait à figer un état qu'on sait provisoire. |
| Glisser-déposer (accompagnements, sections, grille) | Le harnais pilote un vrai navigateur, mais dnd-kit décide à partir de séquences de `pointerdown` / `pointermove` dont la fidélité en automatisation reste incertaine. Un test instable sur ce terrain coûterait plus qu'il ne rapporte. La logique de réordonnancement est en revanche couverte indirectement : l'ordre obtenu est relu après rechargement dans les tests de famille. |
| Éditeur de sections : inspecteur, bibliothèque, grille, styles | Le contrat central (brouillon / publication) est couvert. Le détail de chaque champ de chaque bloc — plus de quatre-vingts types — demanderait une campagne à part. |
| Envoi de courriel (Resend) | Aucune clé en environnement de test, et la route est écrite pour que l'échec de notification ne fasse jamais échouer l'enregistrement du message. C'est ce comportement-là qui est vérifié. |
| Stockage Netlify Blobs | Les tests utilisent le pilote local (`MEDIA_STORAGE=local`). L'interface des deux pilotes est la même ; ce qui n'est pas vérifié, c'est le comportement de Netlify lui-même. |
| Compression d'image côté navigateur | `MediaPicker` redimensionne via `createImageBitmap` et `canvas`. Vérifiable, mais demande des images de référence et une tolérance de comparaison — un chantier en soi. |
| Accessibilité au clavier, écran par écran | Partiellement couverte (lien d'évitement, piège de focus du menu, libellés nommés). Un audit complet demanderait un outil dédié (axe-core) plutôt que des assertions écrites à la main. |
| Performance, Lighthouse | Hors du champ de ce harnais. |
| Sessions expirées, rôles multiples | L'application n'a qu'un rôle (`owner`). La protection des routes est couverte ; l'expiration de jeton ne l'est pas. |

---

## Conventions du harnais

Trois règles, chacune née d'un échec qui a coûté cher.

1. **Un écran qui change ne prouve rien.** Presque toutes les assertions
   passent par `persisteApresRechargement` : seul un aller-retour serveur
   juge de ce qui est réellement enregistré.

2. **`count()` ne patiente pas.** Conclure « absent » sur une page encore
   en cours d'hydratation ne supprime rien — et l'échec surgit six tests
   plus loin, sans rapport apparent. Tout nettoyage s'ancre d'abord sur un
   élément dont on sait qu'il est présent.

3. **Chaque fichier ne touche qu'à ce qu'il a créé.** La base est partagée
   par toute la série. Les suites qui écrivent en ligne — pages, éditeur —
   republient dans leur nettoyage.
