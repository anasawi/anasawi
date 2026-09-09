import './src/server/db/load-env'

import { defineConfig } from 'drizzle-kit'

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL manquant. Renseignez-le dans .env.local (voir .env.example).',
  )
}

export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL },
  strict: true,
  verbose: true,
})
