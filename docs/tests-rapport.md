# Rapport de la campagne de tests

**302 cas, 299 réussis, 3 ignorés, 0 échec.** Quinze fichiers, trois
profils d'écran, navigateur réel, base Neon dédiée.

Les trois cas ignorés le sont à dessein : ils portent sur le menu replié
sous 1024 px et n'ont pas de sens sur le profil ordinateur.

La couverture détaillée — et surtout **ce qui n'est pas couvert** — est
dans `tests-matrice-de-couverture.md`.

---

## Ce que les tests ont trouvé

Onze défauts d'application. Ils sont classés par ce qu'ils coûtaient, pas
par la difficulté de les corriger.

### Invisibles pour tout le monde

**1. Tous les liens internes du site étaient morts.**
Le wrapper du défilement inertiel était `position: fixed` : pour le
navigateur, une cible qui vit dedans est déjà « en place », et une
navigation de fragment ne déplace rien. Le menu, le lien « Aller au
contenu », les deux boutons du hero, le pied de page — tout, sans le
moindre message d'erreur. La page ne bougeait pas, voilà tout.

Au-delà des ancres, cela cassait **la tabulation vers un champ situé plus
bas** : le navigateur tentait de l'amener à l'écran, n'y arrivait pas, et
la personne tapait dans un champ qu'elle ne voyait pas. Le formulaire de
contact entier était concerné. La recherche dans la page (⌘F) ne défilait
pas non plus.

`SmoothScroll` a été réécrit : le contenu reste dans le flux, et l'on
interpose seulement une inertie entre la molette et le défilement réel.

**2. Une section pouvait disparaître en silence.**
Un type de bloc absent du registre, ou un payload qui ne satisfait plus
son schéma, rendait `null` sans aucune trace — ni sur le site, ni dans
l'éditeur, ni dans les journaux. C'est ce défaut qui a fait disparaître un
hero entier pendant cette campagne, et il a fallu démonter la chaîne de
rendu jusqu'au HTML prérendu pour comprendre.

Désormais : trace serveur systématique, cartouche nommé dans l'éditeur, et
plus de section vide qui trouerait la page.

**3. La CSP n'observait rien.**
`Content-Security-Policy-Report-Only` sans `report-to` est purement
ignorée par Chrome. La politique était donc une sécurité de façade depuis
le premier jour. En-tête `Reporting-Endpoints`, directives `report-to` et
`report-uri`, et une route `/api/csp-report` qui journalise les
violations : l'étape d'observation avant bascule en mode bloquant peut
enfin servir.

### Anne aurait cru avoir enregistré

**4. Créer ou modifier un accompagnement ne changeait rien à l'écran.**
Quatre opérations sur sept — créer, modifier, ajouter un titre de
regroupement, en supprimer un — se contentaient de `router.refresh()`,
alors que l'écran porte son état localement. La notification verte
confirmait, la liste ne bougeait pas. Recommencer menait à « Ce slug est
déjà utilisé », message sans aucun sens de son point de vue.

**5. Même défaut sur les questions fréquentes.**

**6. Le renommage d'un titre ne confirmait rien.**
Seule écriture de cet écran sans accusé de réception : le libellé changeait
avant la réponse du serveur, si bien qu'un refus passait inaperçu.

**7. Une page dépubliée ne pouvait plus repartir en ligne.**
Son instantané publié restait identique à son brouillon : l'éditeur la
disait « En ligne » et « Publier » restait inerte. Aucune issue, sinon
modifier la page au hasard pour réveiller le bouton. L'état « Dépubliée »
manquait.

### Le message ne disait pas quoi corriger

**8. « Formulaire invalide. » au lieu de la vraie raison.**
Créer une page à l'adresse `/admin` était bien refusé — mais avec un
message générique, alors que le schéma porte déjà « Ce slug est réservé
par l'application. ».

**9. « Failed to fetch » montré à la visiteuse.**
Une coupure réseau pendant l'envoi du formulaire affichait le message brut
du navigateur : trois mots d'anglais technique, à quelqu'un qui croira que
son message est en cause.

### Accessibilité

**10. Les erreurs du formulaire n'étaient rattachées à aucun champ.**
Les paragraphes portaient un identifiant que rien ne référençait. Au
lecteur d'écran, on entendait « Adresse e-mail invalide » sans savoir
lequel des quatre champs était en cause.

**11. Le lien d'évitement ne déplaçait pas le focus.**
`<main>` n'avait pas `tabindex="-1"` : la tabulation suivante repartait
dans l'en-tête — exactement ce que le lien servait à éviter.

Et deux corrections mineures de la même famille : les commandes de chaque
question fréquente portaient toutes « Modifier » et « Afficher cette
question », dix libellés identiques sur dix lignes ; le nœud `FAQPage` du
JSON-LD flottait sans `@id` ni rattachement ; `preview` n'était pas un
slug réservé.

---

## Ce que la campagne a aussi corrigé dans le harnais

Trois pièges m'ont fait perdre du temps et sont désormais neutralisés.

**Le cache de données de Next survivait d'une série à l'autre.**
`unstable_cache` écrit dans `.next-e2e/cache` avec une heure de validité,
et un script CLI ne peut pas appeler `revalidateTag`. Le build
reconstruisait donc l'accueil à partir de sections vieilles de plusieurs
jours, pendant que la base était juste — symptôme cruel, aucune piste. Le
dossier est effacé avant chaque série.

**`count()` ne patiente pas.** Conclure « absent » sur une page en cours
d'hydratation ne supprimait rien, et l'échec surgissait six tests plus
loin sur un « slug déjà utilisé » incompréhensible.

**Une notification qui ne dit pas ce qu'elle a vu.** L'aide échouait sur
« élément introuvable » pendant que l'application affichait le motif exact
juste à côté.

---

## Ce qui reste à faire

Par ordre d'urgence.

1. **Migrer la préproduction et la production** vers la migration `0008`
   (table des familles d'accompagnements) et y pousser le code accumulé.
   Les deux vont ensemble : le code sans la migration ne démarre pas.
2. **Faire tourner le mot de passe du rôle Neon** : il est passé en clair
   dans la conversation de travail.
3. **Basculer la CSP en mode bloquant**, maintenant qu'elle observe
   réellement. Il reste à retirer `'unsafe-inline'` de `script-src`
   (chantier nonce).
4. **Remplacer les photographies de substitution** (Unsplash, Picsum) et
   réduire `img-src` et `remotePatterns` en conséquence.
5. **Adapter l'administration sous 1000 px**, ou décider explicitement
   qu'elle reste un outil d'ordinateur.
6. Retirer les anciennes adresses de médias Vercel Blob, et le badge
   « Powered by Netlify ».

---

## Relancer la série

Double-clic sur `scripts/lancer-les-tests.command`. La sortie va dans
`.e2e-logs/sortie.log` ; `node scripts/echecs.mjs` n'en extrait que les
échecs. `.e2e-logs/cible.txt`, s'il existe, limite la série à certains
fichiers.

En ligne de commande : `npm test`, ou `npm run verifier` pour enchaîner
lint, typecheck et tests.
