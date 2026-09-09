import { neon } from '@neondatabase/serverless'
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
