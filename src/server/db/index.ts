import { neon } from '@neondatabase/serverless'
import type { BatchItem } from 'drizzle-orm/batch'
import { drizzle } from 'drizzle-orm/neon-http'

import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL manquant. Renseignez-le dans .env.local (voir .env.example), ' +
      'puis relancez. Diagnostic complet : npm run doctor',
  )
}

const sql = neon(process.env.DATABASE_URL)

export const db = drizzle(sql, { schema })
export { schema }

export type BatchQuery = BatchItem<'pg'>

/**
 * Exécute des requêtes en UN lot atomique.
 *
 * Le driver HTTP de Neon n'ouvre pas de transaction (`db.transaction`
 * lève), mais `db.batch` envoie ses requêtes dans une seule transaction
 * côté serveur : tout passe, ou rien. C'est le seul moyen ici de garder
 * cohérentes des écritures qui vont ensemble (supprimer puis réinsérer,
 * décaler puis insérer). `db.batch` exige un tuple non vide : ce
 * détour accepte une liste construite dynamiquement, et ne fait rien
 * si elle est vide.
 */
export async function runBatch(queries: BatchQuery[]): Promise<void> {
  if (queries.length === 0) return
  await db.batch(queries as [BatchQuery, ...BatchQuery[]])
}
