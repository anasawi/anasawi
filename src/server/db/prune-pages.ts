import './load-env'

import { eq, ne } from 'drizzle-orm'

import { db } from './index'
import { pages } from './schema'

/**
 * Supprime les pages secondaires — tout ce qui n'est pas l'accueil.
 *
 *   npm run db:prune-pages
 *
 * Le site est une page unique et le CMS ne connaît plus que l'accueil ;
 * les pages créées par les anciens jeux de données (« À propos », « Mon
 * approche »…) restaient en base, invisibles et sans adresse. Leurs
 * sections et leur SEO partent avec elles (clés étrangères en cascade).
 * L'accueil n'est jamais touché.
 */
async function main() {
  const [home] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(eq(pages.isHome, true))
    .limit(1)
  if (!home) throw new Error('Aucun accueil en base : rien n’est supprimé.')

  const autres = await db
    .select({ id: pages.id, slug: pages.slug, title: pages.title })
    .from(pages)
    .where(ne(pages.isHome, true))

  if (autres.length === 0) {
    console.log('✓ Aucune page secondaire : rien à faire.')
    return
  }

  for (const page of autres) {
    await db.delete(pages).where(eq(pages.id, page.id))
    console.log(`  – supprimée : « ${page.title} » (/${page.slug})`)
  }
  console.log(`✓ ${autres.length} page(s) secondaire(s) supprimée(s). L’accueil est intact.`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
