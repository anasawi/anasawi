import { config } from 'dotenv'

/**
 * Diagnostic en lecture seule : ce que contient réellement la page d'accueil
 * de la base de test — ses sections vivantes et son instantané publié.
 *
 *   npx tsx e2e/support/dump-accueil.ts
 */
config({ path: '.env.test', quiet: true })

async function main() {
  const url = process.env.E2E_DATABASE_URL
  if (!url) throw new Error('E2E_DATABASE_URL manquant.')
  process.env.DATABASE_URL = url

  const { eq } = await import('drizzle-orm')
  const { db } = await import('../../src/server/db')
  const { pages, sections } = await import('../../src/server/db/schema')
  const { getBlock } = await import('../../src/blocks/registry')

  const [accueil] = await db
    .select()
    .from(pages)
    .where(eq(pages.isHome, true))
    .limit(1)

  if (!accueil) {
    console.log('Aucune page d’accueil.')
    return
  }

  console.log(`\nPAGE  slug=${accueil.slug}  statut=${accueil.status}`)

  const vivantes = await db
    .select()
    .from(sections)
    .where(eq(sections.pageId, accueil.id))

  console.log(`\nSECTIONS VIVANTES (${vivantes.length})`)
  for (const s of vivantes) {
    const bloc = getBlock(s.type)
    const parse = bloc?.schema.safeParse(s.payload)
    console.log(
      `  ${s.sortOrder}  type=${s.type.padEnd(16)} actif=${s.isActive}` +
        `  bloc=${bloc ? 'oui' : 'INCONNU'}` +
        `  payload=${parse ? (parse.success ? 'valide' : 'INVALIDE') : '—'}`,
    )
    if (parse && !parse.success) {
      console.log('      ', JSON.stringify(parse.error.issues, null, 2))
    }
  }

  const snapshot = accueil.publishedSnapshot
  console.log(
    `\nINSTANTANÉ PUBLIÉ : ${
      Array.isArray(snapshot) ? `${snapshot.length} section(s)` : typeof snapshot
    }`,
  )
  if (Array.isArray(snapshot)) {
    for (const s of snapshot as Record<string, unknown>[]) {
      const type = String(s.type)
      const bloc = getBlock(type)
      const parse = bloc?.schema.safeParse(s.payload)
      console.log(
        `  ${s.sortOrder}  type=${type.padEnd(16)} actif=${s.isActive}` +
          `  bloc=${bloc ? 'oui' : 'INCONNU'}` +
          `  payload=${parse ? (parse.success ? 'valide' : 'INVALIDE') : '—'}`,
      )
      if (parse && !parse.success) {
        console.log('      ', JSON.stringify(parse.error.issues, null, 2))
      }
    }
  }
  console.log()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
