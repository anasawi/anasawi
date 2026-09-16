/* À charger en premier : `./index` lit `process.env` dès son évaluation. */
import './load-env'

import { eq } from 'drizzle-orm'

import { db } from './index'
import { pages, sections, settings } from './schema'

/**
 * Répare les liens de navigation pointant vers des pages inexistantes.
 *
 * Le site est une page unique : « À propos », « Approche », « Le cabinet »
 * sont des sections, pas des pages. Les valeurs par défaut historiques
 * écrivaient pourtant `/a-propos`, `/approche`, `/accompagnements` et
 * `/le-cabinet` — toute la navigation renvoyait donc en 404. Le code est
 * corrigé ; ce script rattrape les données déjà enregistrées.
 *
 * Il traite les trois endroits où ces liens dorment : les réglages (menu),
 * les sections vivantes (ce que l'on édite) et l'instantané publié de chaque
 * page (ce que les visiteurs voient réellement). Oublier le troisième
 * laisserait le site public inchangé.
 *
 * Idempotent : relançable sans risque, il ne touche que les valeurs fautives.
 *
 *   npm run db:fix-nav
 */
const REMPLACEMENTS: Record<string, string> = {
  '/a-propos': '#a-propos',
  '/accompagnements': '#accompagnements',
  '/approche': '#approche',
  /* Le point d'ancrage de la section « le lieu » est `cabinet`. */
  '/le-cabinet': '#cabinet',
  '/cabinet': '#cabinet',
}

let corrections = 0

/** Réécrit en profondeur toute chaîne figurant dans la table de correspondance. */
function reecrire(valeur: unknown): unknown {
  if (typeof valeur === 'string') {
    const cible = REMPLACEMENTS[valeur]
    if (cible) {
      corrections += 1
      return cible
    }
    return valeur
  }

  if (Array.isArray(valeur)) return valeur.map(reecrire)

  if (valeur && typeof valeur === 'object') {
    return Object.fromEntries(
      Object.entries(valeur as Record<string, unknown>).map(([clef, v]) => [
        clef,
        reecrire(v),
      ]),
    )
  }

  return valeur
}

async function main() {
  console.log('Réparation des liens de navigation…\n')

  /* ── 1. Réglages : le menu ─────────────────────────────────────────── */
  const [reglages] = await db.select().from(settings).limit(1)

  if (reglages?.navigation) {
    const avant = corrections
    const navigation = reecrire(reglages.navigation)

    if (corrections > avant) {
      await db
        .update(settings)
        .set({ navigation })
        .where(eq(settings.id, reglages.id))
      console.log(`  Menu           : ${corrections - avant} lien(s) corrigé(s)`)
    } else {
      console.log('  Menu           : rien à corriger')
    }
  } else {
    console.log('  Menu           : dérivé des sections, rien à corriger')
  }

  /* ── 2. Sections vivantes : ce que l'on édite ──────────────────────── */
  const avantSections = corrections
  let sectionsTouchees = 0

  for (const section of await db.select().from(sections)) {
    const avant = corrections
    const payload = reecrire(section.payload)

    if (corrections > avant) {
      await db
        .update(sections)
        .set({ payload })
        .where(eq(sections.id, section.id))
      sectionsTouchees += 1
    }
  }

  console.log(
    `  Sections       : ${corrections - avantSections} lien(s) dans ${sectionsTouchees} section(s)`,
  )

  /* ── 3. Instantanés publiés : ce que les visiteurs voient ──────────── */
  const avantSnapshots = corrections
  let pagesTouchees = 0

  for (const page of await db.select().from(pages)) {
    if (!page.publishedSnapshot) continue

    const avant = corrections
    const publishedSnapshot = reecrire(page.publishedSnapshot)

    if (corrections > avant) {
      await db
        .update(pages)
        .set({ publishedSnapshot })
        .where(eq(pages.id, page.id))
      pagesTouchees += 1
    }
  }

  console.log(
    `  Pages publiées : ${corrections - avantSnapshots} lien(s) dans ${pagesTouchees} page(s)`,
  )

  console.log(`\nTerminé — ${corrections} lien(s) corrigé(s).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
