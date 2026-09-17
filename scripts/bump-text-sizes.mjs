import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Remonte les tailles de texte écrites en dur sur le SITE PUBLIC.
 *
 * Anne trouvait le texte courant difficile à lire. La base de `body` est
 * passée de 15 à 16px, ce qui entraîne toutes les tailles relatives ; restent
 * celles écrites en pixels dans les blocs, que ce script ajuste.
 *
 * L'administration est volontairement exclue : elle a sa propre densité
 * (`.admin-shell`, 13px), adaptée à une interface d'édition parcourue de
 * près et non à de la lecture suivie.
 *
 * Une seule passe avec une table de correspondance : un remplacement en
 * chaîne ferait passer 14 → 15 → 16 et doublerait l'augmentation.
 *
 *   node scripts/bump-text-sizes.mjs          (aperçu, n'écrit rien)
 *   node scripts/bump-text-sizes.mjs --write  (applique)
 */
const RACINES = ['src/blocks', 'src/components/site']

const CORRESPONDANCES = {
  '12.5px': '14px',
  '13px': '14.5px',
  '13.5px': '15px',
  '14px': '15px',
  '15px': '16px',
  '15.5px': '16.5px',
  '16px': '17px',
  '17px': '18px',
}

const MOTIF = /text-\[(\d+(?:\.\d+)?)px\]/g

async function* fichiers(dossier) {
  for (const entree of await readdir(dossier, { withFileTypes: true })) {
    const complet = path.join(dossier, entree.name)
    if (entree.isDirectory()) yield* fichiers(complet)
    else if (/\.(tsx|ts)$/.test(entree.name)) yield complet
  }
}

const ecrire = process.argv.includes('--write')
let totalFichiers = 0
let totalRemplacements = 0
const detail = new Map()

for (const racine of RACINES) {
  for await (const fichier of fichiers(racine)) {
    const avant = await readFile(fichier, 'utf8')
    let compte = 0

    const apres = avant.replace(MOTIF, (entier, taille) => {
      const cible = CORRESPONDANCES[`${taille}px`]
      if (!cible) return entier
      compte += 1
      detail.set(`${taille}px → ${cible}`, (detail.get(`${taille}px → ${cible}`) ?? 0) + 1)
      return `text-[${cible}]`
    })

    if (compte > 0) {
      totalFichiers += 1
      totalRemplacements += compte
      if (ecrire) await writeFile(fichier, apres)
      console.log(`  ${compte.toString().padStart(3)}  ${fichier}`)
    }
  }
}

console.log(`\n  Correspondances appliquées :`)
for (const [regle, n] of [...detail].sort()) console.log(`    ${regle}  (${n})`)

console.log(
  `\n  ${totalRemplacements} remplacement(s) dans ${totalFichiers} fichier(s).`,
)
console.log(ecrire ? '  Écrit.' : '  Aperçu seulement — relancer avec --write pour appliquer.\n')
