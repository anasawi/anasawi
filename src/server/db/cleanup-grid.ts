import './load-env'

import { inArray, isNotNull } from 'drizzle-orm'

import { db } from './index'
import { sections } from './schema'

/**
 * Purge des sections issues de l'ère « éditeur grille ».
 *
 * Le CMS repose désormais sur des templates de sections complets : les
 * canevas d'essai et leurs blocs libres (enfants avec `parent_id`) n'ont
 * plus de rendu ni d'éditeur. Les sections composées (hero, à propos,
 * accompagnements…) ne sont pas touchées.
 *
 * À lancer une fois : `npm run db:cleanup-grid`.
 */
async function main() {
  const children = await db
    .delete(sections)
    .where(isNotNull(sections.parentId))
    .returning({ id: sections.id })

  const canvases = await db
    .delete(sections)
    .where(inArray(sections.type, ['canvas', 'columns']))
    .returning({ id: sections.id })

  console.log(
    `✓ Purge terminée — ${children.length} bloc(s) libre(s) et ${canvases.length} canevas supprimés.`,
  )
  process.exit(0)
}

main().catch((error) => {
  console.error('✗ Purge impossible :', error)
  process.exit(1)
})
