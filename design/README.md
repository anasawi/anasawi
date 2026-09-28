# Sources de la marque

## `logo-anasawi.svg`

Le logo d'origine — l'ombelle de pissenlit. **C'est la source**, celle
dont tout le reste dérive. Elle vit ici plutôt que dans un dossier de
téléchargements : sans elle, personne ne peut régénérer les images à une
autre taille, et le jour où il faudra un format de plus, il faudra
retrouver le fichier.

Ce n'est pas un vecteur propre : 339 tracés et 7 dégradés issus d'un
calque automatique. Les 38 Ko de métadonnées de provenance C2PA ont été
retirés.

**Ses couleurs ont été ramenées à la palette du site.** Le fichier reçu
était vert sauge (`#7C9174`) ; la tache est désormais le bleu brume
(`--color-blue`, `#7BA3B6`), et les vingt-six teintes intermédiaires des
akènes ont suivi le même déplacement en teinte, saturation et clarté,
pour garder leurs rapports entre elles. Les ivoires et blancs sont
intacts. C'est une transformation mécanique — si la palette change, elle
se rejoue.

Il n'est **pas servi au navigateur**. Trois raisons :

- 143 Ko pour une marque affichée à 28 px n'a pas de sens ;
- Satori, qui compose la vignette de partage et les icônes, ne rend
  qu'un sous-ensemble de SVG et ignore une partie des dégradés ;
- le dépôt de médias du CMS refuse les SVG à dessein — un SVG est un
  document exécutable, il peut porter du script, et il serait servi
  depuis le domaine d'Anne.

## Ce qui en dérive

| Fichier | Rôle | Taille |
| --- | --- | --- |
| `src/components/site/logo-anasawi.png` | en-tête, connexion, 404, admin | 512 px |
| `src/app/logo-par-defaut.ts` | icônes et vignette, encodé en base64 | 440 px |

Les icônes (`src/app/icon.tsx`, `src/app/apple-icon.tsx`) et la vignette
de partage (`src/app/opengraph-image.tsx`) sont des routes rendues à la
demande : elles peignent le logo choisi dans les **Réglages**, et
retombent sur `logo-par-defaut.ts` s'il n'y en a pas.

## Régénérer les dérivés

Deux précautions font toute la différence, et les oublier donne une
marque illisible :

- **`-trim +repage`** retire les marges vides. Le SVG en a beaucoup — les
  akènes qui s'envolent élargissent la boîte — si bien qu'à 16 px la
  marque n'occupait que huit pixels et devenait une tache verte. C'est le
  cadrage, pas le détail du dessin, qui la rendait illisible.
- **`-density 500` AVANT le redimensionnement** : sans lui, ImageMagick
  rastérise en 96 dpi puis agrandit, et le résultat est flou.

```sh
# Le fichier importé par les composants
convert -background none -density 500 design/logo-anasawi.svg \
  -trim +repage -resize 512x512 -colors 96 -strip \
  PNG32:src/components/site/logo-anasawi.png

# La source des icônes et de la vignette (à réencoder en base64 dans
# src/app/logo-par-defaut.ts)
convert -background none -density 500 design/logo-anasawi.svg \
  -trim +repage -resize 440x440 -colors 64 -strip PNG8:/tmp/logo.png
```

`convert` vient d'ImageMagick, qui n'est pas installé par défaut sur
macOS (`brew install imagemagick`).
