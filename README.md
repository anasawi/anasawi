# ANASAWI

Site vitrine et CMS d'**Anne Winzenried**, thérapeute à Cesson-Sévigné.

Next.js 15 · TypeScript · Tailwind v4 · Drizzle · Neon PostgreSQL · Auth.js v5 · Netlify Blobs

---

## Le principe à retenir

**Le site public ne connaît pas son contenu.** Il connaît des *types de blocs*.

Chaque type vit dans `src/blocks/<type>/` et déclare, dans un seul fichier : son schéma Zod, ses descripteurs de champs, ses valeurs par défaut et son composant de rendu. Le registre (`src/blocks/registry.ts`) les rassemble. À partir de là, le sélecteur du CMS, le formulaire d'édition, la validation et le rendu public en découlent automatiquement.

**Ajouter un type de section = créer un dossier et ajouter une ligne au registre.** Rien d'autre.

Deux conséquences qui valent d'être connues :

- La page d'accueil n'est pas un cas particulier codé en dur. C'est la page marquée `is_home`, composée de sections comme n'importe quelle autre.
- Le header ne code pas sa navigation. Il lit les sections de l'accueil marquées « visible dans le menu » et compose les ancres. Renommer une entrée ou en déplacer une se fait depuis le CMS.

---

## Installation

```bash
npm install
cp .env.example .env.local
```

Renseigner `.env.local` :

| Variable | Où l'obtenir |
|---|---|
| `DATABASE_URL` | [console.neon.tech](https://console.neon.tech) → connection string **pooled** |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `MEDIA_STORAGE` | optionnel — `netlify` ou `local`, sinon déduit de l'hôte |
| `RESEND_API_KEY` | [resend.com](https://resend.com) — optionnel |
| `NEXT_PUBLIC_SITE_URL` | `https://anasawi.com` |

Puis :

```bash
npm run db:setup      # applique les migrations versionnées dans drizzle/
npm run db:seed       # structure du site + coordonnées réelles
npm run admin:create  # compte administrateur (mot de passe saisi à la main)
npm run doctor        # vérifie que tout est en place
npm run dev
```

> **Pourquoi pas `drizzle-kit push` ou `drizzle-kit migrate` ?** Ces commandes
> se connectent via le driver **websocket** de `@neondatabase/serverless`, qui
> reste bloqué sur « Pulling schema » selon la version de Node et le réseau.
>
> `db:migrate` est donc un script maison (`src/server/db/migrate.ts`) qui
> emprunte le driver **HTTP** — celui dont l'application se sert déjà, et dont
> on sait qu'il fonctionne. `db:generate`, lui, ne touche pas à la base : il
> lit le schéma TypeScript et écrit du SQL dans `drizzle/`.
>
> Le SQL étant versionné dans Git, chaque évolution du schéma laisse une
> trace : après avoir modifié `schema.ts`, lancer `npm run db:generate` puis
> `npm run db:migrate`.
>
> **`db:generate` est interactif.** Quand une colonne disparaît et qu'une autre
> apparaît, drizzle-kit demande s'il s'agit d'un renommage ou d'une création —
> il faut donc le lancer seul, jamais dans une commande chaînée, sinon il
> attend une réponse qui ne viendra pas et n'écrit aucun fichier. En cas de
> doute, écrire la migration à la main dans `drizzle/` et l'ajouter à
> `drizzle/meta/_journal.json` (voir `0001_section_background_color.sql`).
>
> ⚠️ Les migrations `0001` à `0006` ont été écrites à la main, sans leur
> `drizzle/meta/000N_snapshot.json` (seul `0000_snapshot.json` existe).
> Sans conséquence pour `db:migrate` ni pour le build, mais le prochain
> `db:generate` diffèrera contre le snapshot `0000` et proposera de recréer
> toutes les colonnes ajoutées depuis (`background_color`, `parent_id`,
> `placement`, `styles`, `settings`, `published_snapshot`, la table
> `saved_sections`…). Le jour où ça arrive : supprimer le fichier généré et
> écrire la migration à la main, ou resynchroniser une bonne fois (snapshots
> réécrits, ou nouvelle baseline) — sur une base de préproduction d'abord.
>
> ⚠️ La colonne `pages.puck_data` (ajoutée par `0005_puck_editor.sql`) est
> **orpheline** : elle n'apparaît pas dans `schema.ts` et n'est lue par aucun
> code. Elle reste en base tant qu'une migration `DROP COLUMN` explicite n'a
> pas été écrite ; `db:generate` la signalera comme colonne à supprimer.

Le site tourne sur `localhost:3000`, l'administration sur `/admin`.

Sans `RESEND_API_KEY`, le formulaire de contact fonctionne : les messages sont enregistrés en base et consultables dans `/admin/messages`. Seule la notification par e-mail est désactivée.

---

## Structure

```
src/
├── app/
│   ├── (site)/        Site public — page d'accueil et pages du CMS
│   ├── (admin)/admin/ CMS
│   ├── login/
│   └── api/           auth · upload · media/[key] · contact
├── blocks/            ← les types de sections
├── components/
│   ├── site/          chrome public (Header, Footer, Logo…)
│   ├── motion/        primitives d'animation
│   ├── admin/         écrans du CMS
│   └── ui/            shadcn/ui — admin uniquement
├── server/
│   ├── db/            schéma Drizzle, seed, création d'admin
│   ├── queries/       lectures, cachées par tag
│   └── actions/       écritures, invalident leur tag
└── lib/               auth · seo · schémas Zod · utilitaires
```

**Séparation à respecter** : `queries/` lit et est cachable, `actions/` écrit et invalide. Aucun composant ne parle à la base directement.

---

## Ajouter un type de section

Créer `src/blocks/temoignages/index.tsx` :

```tsx
export const temoignagesSchema = z.object({
  title: z.string().default(''),
  items: z.array(z.object({ quote: z.string(), author: z.string() })).default([]),
})

function Temoignages({ data, ctx }: BlockProps<z.output<typeof temoignagesSchema>>) {
  return /* … */
}

export const temoignagesBlock: BlockDefinition<typeof temoignagesSchema> = {
  label: 'Témoignages',
  description: 'Paroles de personnes accompagnées.',
  schema: temoignagesSchema,
  fields: [
    field.text('title', 'Titre', { full: true }),
    field.list('items', 'Témoignages', [
      field.textarea('quote', 'Texte'),
      field.text('author', 'Signature'),
    ]),
  ],
  defaults: { title: '', items: [] },
  Component: Temoignages,
}
```

Puis l'ajouter au registre. Le formulaire d'édition est généré à partir de `fields` — il n'y a pas d'éditeur React à écrire.

---

## Décisions techniques

**Pourquoi les médias sont référencés par id, pas dénormalisés.** Une section stocke `mediaId`, pas l'URL et l'alt. Une même image sert donc dans plusieurs sections, et corriger son texte alternatif se fait à un seul endroit. Le rendu collecte tous les ids d'une page et fait *une* requête, jamais une par bloc.

**Pourquoi le alt est obligatoire à l'upload.** Un média sans texte alternatif ne peut pas être créé. C'est une contrainte plus simple à tenir à l'entrée qu'à rattraper sur cinquante images.

**Pourquoi le blur et les dimensions sont calculés côté client.** Le navigateur a déjà l'image décodée ; un canvas de 16 px suffit. Cela évite `sharp` côté serveur, et les dimensions stockées éliminent tout décalage de mise en page (CLS = 0).

**Pourquoi un payload invalide ne casse pas la page.** `SectionRenderer` fait un `safeParse` : une section illisible disparaît, la page reste debout. Une faute de saisie dans le CMS ne doit jamais produire un écran blanc en production.

**Pourquoi le hero n'est pas animé à l'entrée.** C'est le Largest Contentful Paint. Aucune animation ne doit lui coûter de millisecondes. Le reste du site s'anime au scroll, lui est peint immédiatement.

**Pourquoi `prefers-reduced-motion` n'est pas un fallback.** Les primitives rendent directement leur état final plutôt que d'exécuter une transition ramenée à 0 ms — il n'y a donc ni flash, ni élément invisible resté à `opacity: 0`.

**Pourquoi rien n'est inventé dans le JSON-LD.** `prune()` retire tout champ vide avant sérialisation. Une adresse ou un horaire non renseigné est omis du balisage, jamais rempli d'un placeholder qui se retrouverait indexé.

---

## SEO

- `generateMetadata` par page, lue depuis `seo_meta` avec repli sur les Réglages
- `sitemap.xml` et `robots.txt` générés depuis la base — une page publiée y apparaît au prochain revalidate, sans redéploiement
- Graphe Schema.org unique : `Person` (Anne Winzenried), `HealthAndBeautyBusiness` (ANASAWI), `WebSite`, `WebPage`, `FAQPage`
- `/admin/seo` : title et description avec compteurs, slug, canonical, image OG, index/follow, aperçu du snippet Google
- `/admin`, `/login` et `/api` en `noindex`

Le tableau de bord signale les réglages manquants qui dégradent le balisage — c'est le premier endroit à regarder après le déploiement.

---

## Déploiement

L'hébergement est **Netlify** : son offre gratuite autorise explicitement
l'usage commercial, contrairement au plan Hobby de Vercel.

1. Pousser sur GitHub, importer le dépôt dans Netlify (« Add new project »)
2. Reporter les variables d'environnement (`DATABASE_URL` en **pooled**)
3. Rien à faire pour le stockage : Netlify Blobs est provisionné automatiquement
4. `npm run db:setup` puis `npm run db:seed` contre la base de production
5. `npm run admin:create` pour le compte d'Anne
6. Pointer `anasawi.com` sur le projet Netlify (Domain management)

`main` est la branche de production ; `preprod` est déployée en branche de
prévisualisation, sur une URL distincte et avec les mêmes variables.

Le build est assuré par l'adaptateur OpenNext, appliqué automatiquement — il
ne faut pas l'épingler dans `package.json`, Netlify le met à jour à chaque
build pour suivre les versions de Next.js.

Le cache est invalidé par tag à chaque enregistrement dans le CMS : la modification est visible immédiatement, sans rebuild.

---

## Commandes

| | |
|---|---|
| `npm run dev` | développement |
| `npm run doctor` | diagnostic : env, connexion, tables, contenu, admin |
| `npm run build` | build de production |
| `npm run lint` | ESLint (flat config `eslint.config.mjs`, règles `next/core-web-vitals` + `next/typescript`) |
| `npm run typecheck` | `tsc --noEmit` — inclut aussi `next.config.ts` et `drizzle.config.ts` |
| `npm run db:setup` | applique les migrations (alias de `db:migrate`) |
| `npm run db:generate` | génère le SQL depuis le schéma (hors ligne, interactif — voir l'avertissement plus haut) |
| `npm run db:migrate` | applique les migrations (driver HTTP) |
| `npm run db:studio` | explorateur de base Drizzle |
| `npm run db:seed` | amorce la base (structure + coordonnées) |
| `npm run db:seed-site` | remplit tout le site (accueil, pages secondaires, médias Unsplash, réglages, accompagnements, FAQ) — remplace les sections existantes, ne publie rien |
| `npm run db:seed-home` | ancienne amorce de l'accueil seul, remplacée par `db:seed-site` (conservée pour référence) |
| `npm run db:seed-images` | images de substitution (Picsum, noir et blanc) |
| `npm run db:rename-brand` | remplace l'ancien nom de marque dans les contenus en base |
| `npm run admin:create` | crée un administrateur |

---

## À compléter

Le seed pose la structure et les coordonnées exactes. Les textes éditoriaux sont marqués **« À COMPLÉTER »** et doivent être réécrits depuis `/admin` — ils sont volontairement reconnaissables pour qu'aucun ne passe en production par inadvertance.

Manquent également : les photographies (hero, portrait, accompagnements), les horaires d'ouverture, et le parcours professionnel d'Anne pour la section À propos.
