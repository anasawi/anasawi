import './load-env'

import { and, eq, isNull } from 'drizzle-orm'

import { db } from './index'
import { sections } from './schema'

/**
 * Bascule ponctuelle : la section « Contact — Complet » (avec formulaire)
 * devient « Contact — Sans formulaire », en place — même ancre, même
 * position, même entrée de menu, même fond.
 *
 * À lancer une fois : `npx tsx src/server/db/swap-contact.ts`.
 */
async function main() {
  const payload = {
    eyebrow: 'CONTACT',
    title: 'Prendre *rendez-vous*.',
    text: 'Pour un premier échange ou une prise de rendez-vous, écrivez ou appelez directement.',
    showAddress: true,
    showHours: true,
    showBooking: true,
    bookingLabel: 'Prendre rendez-vous',
  }

  const rows = await db
    .update(sections)
    .set({ type: 'contactMinimal', payload, updatedAt: new Date() })
    .where(and(eq(sections.type, 'contact'), isNull(sections.parentId)))
    .returning({ id: sections.id })

  console.log(
    rows.length > 0
      ? `✓ ${rows.length} section(s) Contact basculée(s) sans formulaire.`
      : '— Aucune section « Contact — Complet » trouvée, rien à faire.',
  )
  process.exit(0)
}

main().catch((error) => {
  console.error('✗ Bascule impossible :', error)
  process.exit(1)
})
