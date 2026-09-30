# ANASAWI

Site vitrine et administration (CMS) d'**Anne Winzenried**, Gestalt-thérapeute à Cesson-Sévigné.

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · Drizzle ORM · Neon PostgreSQL · Auth.js v5 · Netlify (Blobs pour les médias) · Playwright.

---

## En deux minutes

- **Le site est une page unique** (`/`), composée de *sections*. Chaque section est une ligne de la table `sections` : un type (`heroPleinEcran`, `faq`, `contactMinimal`…), un contenu JSON (`payload`) validé par Zod, une couleur de fond, une ancre. Le menu du site pointe vers ces ancres.
- **Chaque type de section est un *bloc*** (`src/blocks/**`) qui déclare dans un seul objet : schéma Zod, descripteurs de champs, valeurs par défaut, composant de rendu. Le registre (`src/blocks/registry.ts`) les rassemble ; le formulaire d'édition, la bibliothèque de modèles, la validation et le rendu public en découlent.
- **L'administration (`/admin`) édite un brouillon** enregistré automatiquement ; « Publier » copie ce brouillon dans `pages.published_snapshot`, et c'est cet instantané que le site sert. Les autres écrans (accompagnements, questions, médias, réglages) sont en ligne dès l'enregistrement.
- **Lectures et écritures sont séparées** : `src/server/queries` lit (mis en cache par tag en production), `src/server/actions` écrit (Server Actions, toutes derrière une session vérifiée en base) et invalide les tags. Aucun composant ne parle à la base directement.

---

## Installation et développement

```bash
npm install
cp .env.example .env.local     # puis renseigner les variables (voir plus bas)
npm run db:seed                # structure du site + contenus d'amorçage
npm run admin:create           # compte administrateur (mot de passe saisi à la main)
npm run doctor                 # vérifie env, connexion, tables, contenu, admin
npm run dev                    # http://localhost:3000 — administration sur /admin
```

`npm run dev` applique d'abord les migrations (`predev`) sur la base de `.env.local`. **Ne pointez jamais `.env.local` vers la base de production** : utilisez une branche Neon de développement.

En développement, les médias envoyés vont dans `.storage/` (ignoré par Git) ; en ligne, dans Netlify Blobs. Sans `RESEND_API_KEY`, le formulaire de contact enregistre les messages (visibles dans `/admin/messages`) mais n'envoie pas d'e-mail.

### Variables d'environnement

| Variable | Rôle | Obligatoire |
|---|---|---|
| `DATABASE_URL` | Neon, chaîne **pooled** | oui |
| `AUTH_SECRET` | secret des sessions (`openssl rand -base64 32`) ; sert aussi à chiffrer les jetons d'invitation | oui |
| `NEXT_PUBLIC_SITE_URL` | adresse publique (`https://anasawi.com`) : canonical, sitemap, e-mails | oui |
| `RESEND_API_KEY`, `CONTACT_NOTIFY_TO`, `CONTACT_NOTIFY_FROM` | notification par e-mail des messages de contact | non |
| `MEDIA_STORAGE` | forcer `local` ou `netlify` (sinon déduit de l'environnement) | non |
| `AUTH_TRUST_HOST` | `true` derrière un proxy (déjà fixé dans le code) | non |
| `PREPROD_DATABASE_URL`, `PROD_DATABASE_URL`, `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID` | scripts de copie de contenu seulement | non |
| `E2E_DATABASE_URL`, `E2E_ADMIN_PASSWORD`, `E2E_PORT` | tests de bout en bout (`.env.test`, voir `.env.test.example`) | tests |

`CONTEXT`, `NETLIFY`, `NETLIFY_BLOBS_CONTEXT` sont injectées par Netlify ; `NEXT_DIST_DIR` sert aux builds parallèles (tests, vérification).

---

## Commandes

| Commande | |
|---|---|
| `npm run dev` | développement (migre d'abord la base) |
| `npm run build` / `npm start` | build et serveur de production |
| `npm run lint` · `npm run typecheck` | ESLint · `tsc` (application + tests) |
| `npm test` · `npm run test:ui` · `npm run test:report` | Playwright (série complète, interface, rapport HTML) |
| `npm run verifier` | lint + typecheck + tests |
| `npm run db:migrate` (`db:setup`) | applique les migrations de `drizzle/` |
| `npm run db:seed` · `db:seed-site` · `db:seed-accompagnements` | amorçages (structure + coordonnées · site complet · accompagnements) |
| `npm run db:prune-pages` | supprime les anciennes pages secondaires (le site est à page unique) |
| `npm run admin:create` · `npm run doctor` | compte administrateur · diagnostic |

Scripts « double-clic » pour macOS dans `scripts/*.command` (chacun écrit son journal dans `.e2e-logs/`) : `lancer-les-tests`, `construire` (lint + typecheck + build), `deployer` (push de la branche lue dans `.e2e-logs/branche.txt`), `migrer-la-base`, `copier-le-contenu` (dev → préprod/prod, cible dans `.e2e-logs/copie.txt`), `nettoyer-les-pages`, `retirer-les-temoignages`. Les scripts de copie et de retrait écrivent dans la base indiquée par leur fichier de cible : lire le fichier avant de double-cliquer.

---

## Structure

```
src/
├── app/
│   ├── (site)/            page d'accueil, layout du site, /templates (revue des modèles)
│   ├── (admin)/admin/     tableau de bord, accueil (éditeur), accompagnements, faq,
│   │                      medias, messages, utilisateurs, reglages
│   ├── invitation/[token] choix du mot de passe d'une personne invitée
│   ├── login/
│   ├── api/               auth · upload · media/[key] · contact · admin-bar · csp-report
│   └── robots · sitemap · manifest · icônes · image Open Graph
├── blocks/                les types de sections (registry.ts + templates/*.tsx + briques)
├── components/
│   ├── site/              chrome public, primitives d'animation (anim.tsx), rendu des sections
│   ├── admin/             écrans du CMS ; editor/ (éditeur découpé en hooks), settings/, form/, hooks/
│   ├── ui/                composants de base de l'admin (button, dialog, select, action-menu…)
│   └── motion/            MotionProvider (motion/react)
├── server/
│   ├── db/                schéma Drizzle, migrations (migrate.ts), seeds, scripts de maintenance
│   ├── queries/           lectures (cache par tag)
│   └── actions/           écritures : sections, publish, saved-sections, seo, content, media,
│                          users, navigation, identity, auth — toutes via adminAction()
├── lib/                   auth, seo, schémas Zod, liens sûrs, stockage, snapshot/publication…
├── types/                 types JSON partagés (content.ts), augmentation next-auth
└── styles/globals.css     jetons de couleur, typographie, animations
drizzle/                   migrations SQL numérotées + meta/_journal.json
e2e/                       tests Playwright (public, admin, api, auth) + support (fixtures, reset)
docs/                      matrice de couverture des tests, rapports
```

---

## Comment faire…

**Modifier un modèle de section existant.** Ouvrir son bloc dans `src/blocks/templates/*.tsx` (ou `src/blocks/<type>/index.tsx`). Le `schema` valide le contenu, `fields` génère le formulaire de l'inspecteur, `Component` rend la section. Les contenus déjà en base doivent rester valides : ajouter un champ avec `.default()`, ne jamais retirer une clé sans migration de données.

**Ajouter un modèle de section.** Créer le bloc (mêmes quatre éléments), l'enregistrer dans `blockRegistry` et lui donner une catégorie dans `CATEGORY_OF` (`src/blocks/registry.ts`). Il apparaît aussitôt dans « Ajouter une section ». Le nom (`label`) et la description sont lus par une personne non technique : pas de jargon.

**Modifier le design.** Jetons dans `src/styles/globals.css` (`@theme`) ; primitives d'animation dans `src/components/site/anim.tsx` (le `TEMPO` y règle la vitesse de tous les échelonnements) ; composants de base de l'admin dans `src/components/ui`.

**Changer le schéma de la base.** Modifier `src/server/db/schema.ts`, puis écrire la migration SQL **à la main** dans `drizzle/00NN_nom.sql` (instructions séparées par `--> statement-breakpoint`, le pilote HTTP de Neon n'accepte qu'une instruction par requête) et l'ajouter à `drizzle/meta/_journal.json`. `drizzle-kit generate` n'est pas utilisé : les instantanés `drizzle/meta` ne sont pas maintenus. Les migrations s'appliquent au `dev` et au build Netlify (`netlify.toml`).

**Ajouter une action serveur.** Dans le fichier `src/server/actions/<domaine>.ts` : `adminAction(async (user) => …)` (session relue en base, `requireOwner()` pour les gestes réservés), validation Zod des entrées (`uuidSchema`, `formError`), messages en français courant (`messages.ts`), `revalidateTag`/`revalidatePage` à la fin. Une écriture en plusieurs étapes passe par `db.batch` (`runBatch`), atomique avec le pilote HTTP.

**Comprendre la publication.** `src/lib/snapshot.ts` projette les sections vivantes en lignes d'instantané ; `publishPage` (actions/publish.ts) les écrit dans `pages.published_snapshot` ; `src/lib/publish.ts` compare brouillon et instantané (`hasUnpublishedChanges`) ; `getPublishedHome` (queries) sert l'instantané au site.

**Utilisateurs.** L'administration invite une personne (nom, e-mail) et obtient un lien `/invitation/<jeton>` valable 7 jours, une fois ; la personne y choisit son mot de passe. Le jeton est stocké chiffré (AES-GCM, clé dérivée d'`AUTH_SECRET`) pour rester recopiable tant qu'il vaut. Rôles : `owner` (peut gérer les autres owners) et `editor`.

---

## Tests

Playwright, contre une base Neon dédiée (`E2E_DATABASE_URL`) remise à zéro au démarrage (`e2e/support/reset-db.ts`), avec un build de production dans `.next-e2e`. Trois profils : ordinateur (Chromium), tablette et téléphone (WebKit) pour le site public ; les suites `admin/` tournent sur ordinateur.

```bash
cp .env.test.example .env.test   # base de test + mot de passe du compte de test
npm test
```

Règles : un test ne se modifie pas pour passer ; « le bouton existe » ou « la page s'affiche » ne sont pas des validations ; chaque suite remet la base dans l'état où elle l'a trouvée. La couverture est décrite dans `docs/tests-matrice-de-couverture.md`.

---

## Déploiement

Hébergement **Netlify**, branche `main` = production (`anasawi.com`), branche `preprod` = déploiement de branche (`preprod--anasawi.netlify.app`), chacune avec sa base Neon. Le build (`netlify.toml`) applique les migrations sur la base du contexte **avant** `next build` : une migration qui échoue fait échouer le déploiement au lieu de mettre en ligne du code que la base ne peut pas servir.

Mise en ligne : pousser `preprod`, vérifier, puis fusionner dans `main` en avance rapide et pousser. Les médias vivent dans Netlify Blobs (store `media`), partagé par la préprod et la prod ; la base ne contient que leurs métadonnées. Copier le contenu d'une base vers une autre (`copier-le-contenu`) ne copie pas les fichiers de `.storage/` : les envoyer par l'admin ou avec `NETLIFY_AUTH_TOKEN`/`NETLIFY_SITE_ID`.

Première installation d'un environnement : variables d'environnement dans Netlify, `npm run db:seed` puis `npm run admin:create` contre sa base.

---

## Sécurité, en bref

Session JWT de 7 jours, mais chaque action serveur et chaque écran admin relisent l'utilisateur en base (compte supprimé ou invité sans mot de passe → refus). Connexion limitée à 8 essais par quart d'heure, par adresse IP et par e-mail. Envois de médias : type vérifié par les octets, 4 Mo maximum, stockage servi par `/api/media/<clé>` sans exécution. Formulaire de contact : validation, piège à robots, 5 messages par heure et par adresse. En-têtes : HSTS, `nosniff`, `X-Frame-Options`, CSP en mode rapport (`/api/csp-report`), `no-store`/`noindex` sur l'admin, la connexion et les invitations. Aucun secret dans le dépôt ; `.env.local` et `.env.test` sont ignorés.

---

## Décisions techniques

- **Médias référencés par identifiant**, jamais dénormalisés : une image sert dans plusieurs sections, sa description se corrige à un endroit ; le rendu collecte les identifiants d'une page et fait une requête.
- **Description (alt) obligatoire à l'envoi** : plus simple à tenir à l'entrée qu'à rattraper sur cinquante images.
- **Recompression côté navigateur** (images et vidéos, `src/lib/video-compression.ts`) : l'hébergeur n'a pas de ffmpeg et les fonctions plafonnent à quelques Mo.
- **Une section invalide ne casse pas la page** (`safeParse`) : elle disparaît du rendu public et se signale dans l'éditeur.
- **Le hero n'est pas animé à l'entrée** (c'est le LCP) ; le rideau d'ouverture ne joue qu'une fois par visite et n'est jamais rendu sans JavaScript.
- **Rien d'inventé dans le JSON-LD** : un champ vide est omis, jamais remplacé par une valeur factice.
