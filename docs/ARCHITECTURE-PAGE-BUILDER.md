# ANASAWI — Architecture du Page Builder (document historique)

> **Document historique — ne décrit plus le code.**
>
> Ce document décrivait une architecture abandonnée : éditeur grille avec
> placement libre (`GridBuilder`, `LayersPanel`), aperçu dans une iframe
> piloté par `postMessage`, arbre de blocs à profondeur illimitée et file
> d'opérations atomique. Ce code a été retiré du dépôt (refactoring, lot 3).
>
> Le CMS actuel est fondé sur des **templates de sections** : l'admin choisit
> un modèle dans la bibliothèque (`TemplateLibrary`), le remplit dans
> l'inspecteur (`SectionInspector`) et voit le rendu directement dans le
> canvas de `TemplateEditor` — un seul niveau d'imbrication, une écriture
> par geste, un instantané publié séparé du brouillon.
>
> Pour l'architecture en vigueur, voir le `README.md` à la racine du dépôt
> (sections « Le principe à retenir », « Structure » et « Ajouter un type de
> section »).
