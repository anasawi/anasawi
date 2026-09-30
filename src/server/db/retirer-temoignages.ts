import './load-env'

import { neon } from '@neondatabase/serverless'
import { eq, inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-http'

import { pages, savedSections, sections } from './schema'

/**
 * Retire les témoignages d'une base : les sections de ces types, leurs
 * blocs enfants, leur trace dans la version publiée de l'accueil, et les
 * modèles personnels de ces types.
 *
 *   CIBLE=dev     npx tsx src/server/db/retirer-temoignages.ts
 *   CIBLE=preprod npx tsx src/server/db/retirer-temoignages.ts
 *   CIBLE=prod    npx tsx src/server/db/retirer-temoignages.ts
 *
 * Pourquoi un script et pas une migration : le registre des modèles ne
 * connaît plus ces types (`temoignageGrand`, `temoignagesMultiples`,
 * `temoignageSimple`, `temoignage`). Une section d'un type inconnu est
 * ignorée par le site public mais signalée dans l'éditeur comme « type
 * inconnu » : autant qu'elle disparaisse proprement, dans la version en
 * ligne aussi, sans obliger à republier.
 */

const TYPES = ['temoignageGrand', 'temoignagesMultiples', 'temoignageSimple', 'temoignage']

function urlCible(): string {
  const cible = process.env.CIBLE
  const cle =
    cible === 'dev'
      ? 'DATABASE_URL'
      : cible === 'preprod'
        ? 'PREPROD_DATABASE_URL'
        : cible === 'prod'
          ? 'PROD_DATABASE_URL'
          : null
  if (!cle) {
    console.error('\n  ✗ CIBLE doit valoir « dev », « preprod » ou « prod ».\n')
    process.exit(1)
  }
  const url = process.env[cle]
  if (!url) {
    console.error(`\n  ✗ ${cle} manquant dans .env.local.\n`)
    process.exit(1)
  }
  return url
}

type Ligne = { id: string; type: string; parentId: string | null }

/** Les identifiants à retirer : les sections de ces types et leurs enfants. */
function aRetirer(lignes: Ligne[]): Set<string> {
  const ids = new Set(lignes.filter((l) => TYPES.includes(l.type)).map((l) => l.id))
  let ajout = true
  while (ajout) {
    ajout = false
    for (const l of lignes) {
      if (l.parentId && ids.has(l.parentId) && !ids.has(l.id)) {
        ids.add(l.id)
        ajout = true
      }
    }
  }
  return ids
}

async function main() {
  const url = urlCible()
  const db = drizzle(neon(url))
  console.log(`\n  Base : ${new URL(url).host} (${process.env.CIBLE})\n`)

  /* Sections vivantes. */
  const vivantes = await db
    .select({ id: sections.id, type: sections.type, parentId: sections.parentId, name: sections.name })
    .from(sections)
  const idsVivantes = aRetirer(vivantes)
  if (idsVivantes.size > 0) {
    for (const s of vivantes.filter((s) => idsVivantes.has(s.id))) {
      console.log(`  – section retirée : ${s.name ?? s.type}`)
    }
    await db.delete(sections).where(inArray(sections.id, [...idsVivantes]))
  } else {
    console.log('  Aucune section de témoignage dans le brouillon.')
  }

  /* Version publiée : le même tri, dans l'instantané JSON. */
  const toutes = await db.select({ id: pages.id, title: pages.title, publishedSnapshot: pages.publishedSnapshot }).from(pages)
  for (const page of toutes) {
    const snapshot = page.publishedSnapshot
    if (!Array.isArray(snapshot)) continue
    const lignes = snapshot as Ligne[]
    const ids = aRetirer(lignes)
    if (ids.size === 0) {
      console.log(`  Version en ligne de « ${page.title} » : rien à retirer.`)
      continue
    }
    const reste = lignes.filter((l) => !ids.has(l.id))
    await db.update(pages).set({ publishedSnapshot: reste }).where(eq(pages.id, page.id))
    console.log(`  – version en ligne de « ${page.title} » : ${ids.size} section(s) retirée(s), ${reste.length} restante(s)`)
  }

  /* Modèles personnels de ces types. */
  const modeles = await db
    .select({ id: savedSections.id, name: savedSections.name, type: savedSections.type })
    .from(savedSections)
    .where(inArray(savedSections.type, TYPES))
  if (modeles.length > 0) {
    await db.delete(savedSections).where(inArray(savedSections.id, modeles.map((m) => m.id)))
    for (const m of modeles) console.log(`  – modèle personnel retiré : ${m.name}`)
  }

  console.log('\n  ✓ Terminé. Le site se met à jour au prochain rendu (cache : une heure au plus, ou un enregistrement dans l’admin).\n')
}

main().catch((error) => {
  console.error('\n  ✗ Échec :', error instanceof Error ? error.message : error, '\n')
  process.exit(1)
})
