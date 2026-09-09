# AMASWI — Architecture du Page Builder

Objectif : « J'ouvre /admin et j'ai l'impression d'ouvrir un logiciel de
création de site. » — v1.0

---

## 0. Analyse de l'existant : ce qui reste, ce qui évolue

Avant de dessiner quoi que ce soit, inventaire honnête du code actuel.

### Déjà construit et conservé tel quel

| Acquis | Pourquoi c'est le bon socle |
|---|---|
| **Aperçu = vraie page dans une iframe** + pont `postMessage` (mesures, sélection, placement en direct, édition inline) | C'est l'architecture de Webflow : l'éditeur ne rend rien lui-même, il pilote le rendu réel. Zéro écart possible entre édition et publication. |
| **Viewport fixe mis à l'échelle** (1280/834/414 × `transform: scale`) | Les media queries s'évaluent dans l'iframe — c'est déjà le mécanisme des breakpoints. |
| **Registre de blocs** (type → schéma Zod + descripteurs de champs + composant) | Exactement l'extensibilité demandée au §16 : un nouveau type = un dossier. |
| Auth, actions gardées, cache par tags, médiathèque, SEO, thème dérivé du fond | Rien à toucher. |

### Ce qui doit évoluer

| Limite actuelle | Évolution |
|---|---|
| Hiérarchie limitée à **1 niveau** (section → enfants) | Arbre **illimité** : container dans container dans section. |
| Deux modes de layout seulement (colonnes / canevas x-y) | Vrai système : flex, grille, dimensions, espacements, par élément. |
| Aucun style par élément (tout vient du type) | Colonne `styles` : layout, tailles, couleurs, typo — avec surcharges par breakpoint. |
| Sections préfabriquées **fermées** (hero, à propos…) | Elles deviennent des **modèles** : à l'insertion, elles s'instancient en arbre d'éléments entièrement modifiables. |
| Une écriture serveur par geste | File d'opérations : optimiste côté client, lot atomique côté serveur — prérequis de l'undo/redo. |

**Rien n'est détruit** : la table `sections` est étendue, pas remplacée, et
les types de sections actuels continuent de rendre le site à l'identique
pendant toute la migration (voir §8).

---

## 1. Modèle de données : tout est un nœud

La table `sections` devient conceptuellement une table de **nœuds** (on
garde son nom — le renommage n'apporte rien et casserait tout).

```
nodes (= sections étendue)
├── id            uuid
├── page_id       → pages
├── parent_id     → nodes (profondeur ILLIMITÉE, cascade)
├── slot          int      -- pour les conteneurs multi-zones (colonne 0, 1…)
├── sort_order    int      -- ordre parmi les frères
├── type          text     -- 'container' | 'heading' | 'image' | … | types legacy
├── name          text     -- nom affiché dans le panneau Calques (renommable)
├── payload       jsonb    -- CONTENU (texte, mediaId, href…) — validé par type
├── styles        jsonb    -- APPARENCE (voir §2) — commun à tous les types
├── placement     jsonb    -- position libre {x,y,w,h?} si parent en mode « libre »
├── is_active     bool     -- visibilité
├── anchor / nav_label / show_in_nav / background_color  -- niveau section
```

Séparation stricte, c'est la clé de voûte :

- **`payload`** = *ce que dit* l'élément → validé par le schéma Zod de son type
- **`styles`** = *à quoi il ressemble* → schéma **unique partagé par tous les types**

C'est ce qui rend le panneau Style universel : un seul éditeur de styles
pour l'image, le texte, le container — pas un par type.

Le §16 de ton brief est couvert point par point : id, type, parentId,
order (`sort_order` + `slot`), position/layout (`styles.layout` +
`placement`), styles, contenu (`payload`), responsive (`styles.tablet/mobile`),
visibilité (`is_active`), metadata (`name`, anchor…).

---

## 2. Le système de styles et le responsive

### Schéma d'un `styles`

```ts
type NodeStyles = {
  base: StyleProps          // desktop — la source
  tablet?: Partial<StyleProps>   // surcharges ≤ 1024
  mobile?: Partial<StyleProps>   // surcharges ≤ 640
}

type StyleProps = {
  /* Layout (containers) */
  display?: 'flex' | 'grid'
  direction?: 'row' | 'column'
  gap?: number
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between'
  wrap?: boolean
  gridCols?: number
  /* Boîte (tous) */
  width?: Size      // 'auto' | 'fill' | {pct} | {px} — voir plus bas
  height?: Size
  maxWidth?: Size
  padding?: [number, number, number, number]
  radius?: number
  opacity?: number
  background?: string        // hex — même dérivation de contraste qu'aujourd'hui
  border?: { width: number; color: string }
  /* Typographie (éléments texte) */
  font?: 'serif' | 'sans'
  size?: number              // rem
  weight?: 400 | 500
  color?: string
  alignText?: 'left' | 'center' | 'right'
  lineHeight?: number
  tracking?: number
}
```

Tout est **optionnel** : un nœud sans styles rend avec les défauts élégants
de son type (les tokens AMASWI actuels). On ne force personne à styler.

### Rendu : CSS généré, pas de style inline par média query

Les media queries n'existent pas en style inline. Le rendeur produit donc,
par page, une feuille de styles **générée depuis les données** :

```
<style>
  .n-a1b2 { display:flex; flex-direction:row; gap:24px; }
  @media (max-width:1024px){ .n-a1b2 { flex-direction:column; } }
  @media (max-width:640px) { .n-a1b2 { gap:12px; } }
</style>
```

Générée côté serveur au rendu, mise en cache avec la page, échappée et
bornée (valeurs numériques clampées, couleurs validées) — l'admin ne peut
pas injecter de CSS arbitraire, seulement des valeurs dans des propriétés
connues. C'est du SSR pur : aucun JavaScript de layout au chargement,
les Core Web Vitals ne bougent pas.

### Édition responsive — le modèle Webflow

Le sélecteur Bureau / Tablette / Mobile existant devient **aussi** le
sélecteur de breakpoint d'édition :

- En vue **Bureau**, toute modification écrit dans `base`
- En vue **Tablette/Mobile**, elle écrit dans la surcharge correspondante
- Une propriété surchargée est **marquée en bleu** dans le panneau, avec
  un bouton « revenir à la valeur bureau »
- Cascade descendante : bureau → tablette → mobile, jamais l'inverse

Ton exemple exact : image 50 % en bureau, on passe en vue Mobile, on la met
à 100 % → `styles.mobile.width = fill`. C'est tout.

---

## 3. Le layout : LIBRE par défaut *(décision utilisateur, actée)*

> Choix arbitré le 2026-09-02 : Val préfère le positionnement libre partout,
> en connaissance des risques responsive. L'architecture s'y plie, et
> investit en contrepartie dans un repli mobile automatique.

- **Chaque section est un canevas libre par défaut** : on y dépose au point
  exact, on déplace, on redimensionne (x, y, largeur — et hauteur pour les
  éléments qui la supportent : image, container, spacer, vidéo).
- **Repli mobile automatique par ordre de lecture** : sous le breakpoint,
  les éléments s'empilent triés par position (haut → bas, puis gauche →
  droite). Personne n'a d'ordre à régler à la main ; un réglage manuel par
  élément restera possible en phase 2 pour les cas particuliers.
- **Le container reste disponible** comme élément de groupement : posé
  librement dans la section, il peut être interne-flux (pile serrée
  titre+texte qui se déplace d'un seul geste) ou interne-libre. C'est lui
  qui permet les compositions à plusieurs éléments solidaires.
- Le **drag & drop décide seul du bon geste** : dépôt dans un canevas → au
  point exact ; dépôt dans un container en flux → ligne d'insertion.
- Le texte garde sa hauteur de contenu (pas de troncature possible) ; tout
  le reste est redimensionnable en hauteur.

Redimensionnement : poignées latérales = largeur (flux et libre) ; poignées
8 directions sur les éléments à hauteur contrôlable (image, container,
spacer, vidéo). Le texte n'a pas de poignée de hauteur : sa hauteur EST son
contenu — lui en imposer une le tronquerait, aucun outil pro ne le permet.

---

## 4. Drag & drop, sélection, gestes

Tout passe par le canal iframe déjà en place, généralisé :

| Geste | Mécanisme |
|---|---|
| Dépôt depuis la palette | Rects mesurés par le pont → lignes d'insertion calculées pour **chaque container à toute profondeur** (aujourd'hui : racine + 1 niveau) |
| Déplacer un élément existant | Saisie directe dans l'aperçu (pointer events, déjà construit pour le canevas) — étendue au flux : l'élément suit le curseur en semi-transparence, les frères s'écartent |
| Changer de parent | Déposer dans un autre container (aperçu) ou glisser dans l'arbre des calques (panneau) |
| Sélection | Clic → cadre de sélection + étiquette du type + boutons rapides (dupliquer, supprimer) ; double-clic → édition texte en place (existant) |
| Redimensionner | Poignées sur le cadre de sélection, badge de mesure, magnétisme aux fractions (existant, étendu) |

---

## 5. Panneau de propriétés

Trois onglets, à droite, selon la sélection :

- **Contenu** — les champs du type (généré depuis le registre, existant)
- **Style** — le panneau universel : layout (si container), dimensions,
  espacements, fond, bordure, rayon, opacité, typographie (si texte).
  Contrôles visuels : steppers, presets, palette de couleurs de la charte
  avec avertissement de contraste — **jamais un champ CSS**.
- **Réglages** — visibilité par breakpoint, ancre, nom, animation d'entrée

---

## 6. Panneau Calques (arbre)

Colonne de gauche de l'éditeur, arbre complet de la page :

```
▾ Hero                    👁
  ▾ Container
      Titre
      Paragraphe
      Bouton
    Image
▾ À propos                👁
```

Sélection synchronisée dans les deux sens (arbre ↔ aperçu), glisser pour
réordonner **et reparenter** (dnd-kit convient ici : même document),
double-clic pour renommer, icônes visibilité/dupliquer/supprimer au survol.
C'est le `SectionList` actuel, généralisé en récursif.

---

## 7. Undo/redo et persistance

Le pivot : **toute mutation devient une opération** décrite en données.

```ts
type Op =
  | { kind: 'insert'; node: NodeSnapshot; index: number }
  | { kind: 'remove'; nodeTree: NodeSnapshot[] }        // avec descendance
  | { kind: 'move'; id; from: Position; to: Position }
  | { kind: 'setStyles'; id; prev: NodeStyles; next: NodeStyles }
  | { kind: 'setPayload'; id; prev: unknown; next: unknown }
  | { kind: 'setPlacement'; id; prev; next }
```

- **Optimiste** : l'op s'applique immédiatement à l'arbre local et à
  l'iframe (patch ciblé via le pont — pas de rechargement)
- **Historique** : pile de 50 ops, chacune portant son inverse.
  `⌘Z` / `⌘⇧Z` + boutons ↶ ↷ dans la barre
- **Persistance** : les ops partent au serveur par lots (debounce ~800 ms),
  action unique `applyOps` validée op par op (Zod, liste blanche) et
  appliquée **atomiquement** via le batch Neon — plus jamais une écriture
  par geste, et un indicateur « Enregistré · il y a 2 s » dans la barre
- Le serveur reste la source de vérité : au moindre échec, resynchronisation
  complète et toast explicite

---

## 8. Bibliothèque de blocs et migration — sans rien casser

### Les modèles (ton §14)

Un « Hero classique » n'est plus un composant React fermé : c'est un
**arbre de nœuds sérialisé** (un JSON de containers, titres, images avec
leurs styles). L'insérer = instancier ces nœuds en base. Dès la seconde
suivante, chaque élément se déplace, se restyle, se supprime — le bloc
n'enferme pas, exactement ta demande. La bibliothèque reproduira les
compositions actuelles (hero asymétrique, approche décalée…) pour que la
qualité de départ reste celle du site.

### Le site actuel (ton §17)

1. Les types de sections existants (hero, about…) restent rendus par leurs
   composants actuels — **le site public ne bouge pas d'un pixel**
2. Dans l'éditeur, ils apparaissent comme des feuilles « composition
   verrouillée » : déplaçables, duplicables, éditables par formulaire
   (comme aujourd'hui), pas décomposables
3. Une fois la bibliothèque de modèles prête, chaque section legacy
   proposera « **Convertir en éléments libres** » — conversion explicite,
   par section, jamais automatique
4. FAQ et Accompagnements restent des éléments « connectés » qui lisent
   leurs données de la base — un page builder n'a pas à dupliquer du contenu
   métier

---

## 9. Découpage en phases — engagement honnête

Ce système, chez Webflow, c'est des années-homme. La version AMASWI est
volontairement plus simple, mais elle ne peut pas atterrir en un seul jet.
Chaque phase laisse le produit **fonctionnel et cohérent**.

**Phase 1 — le cœur (la plus grosse)**
Schéma étendu + migration ; primitives `container`, `heading`, `text`,
`image`, `button`, `spacer`, `divider` ; générateur CSS ; rendu récursif ;
insertion à toute profondeur ; déplacement en flux ; redimensionnement
largeur ; panneau Style (layout, dimensions, espacements, fond, typo de
base) ; arbre des calques (sélection, visibilité, renommer, dupliquer,
supprimer) ; ops + undo/redo + sauvegarde par lots ; sections legacy
intactes.

**Phase 2 — profondeur**
Surcharges responsive complètes avec marquage visuel ; reparentage par
glisser (aperçu + calques) ; poignées 8 directions ; bibliothèque de
modèles ; primitives vidéo/galerie/formulaire/cards connectées.

**Phase 3 — finitions**
Conversion des sections legacy ; copier/coller ; animations par élément ;
raccourcis complets ; grille magnétique configurable.

---

## 10. Risques assumés

- **Complexité d'interaction** : chaque geste (drag en flux profond,
  reparentage) demandera des itérations sur le ressenti — je préfère te le
  dire : la phase 1 sortira fonctionnelle, pas parfaite au premier essai
- **Performance d'édition** : une page de 200 nœuds = 200 rects mesurés à
  chaque frame de scroll ; le pont devra throttler et mesurer par zone
- **Le garde-fou que je maintiens** : pas de hauteur forcée sur le texte,
  et le libre reste un mode de container avec repli mobile — ce sont les
  deux choix qui séparent un builder qui produit des sites propres d'un
  builder qui produit des sites cassés
