import './load-env'

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'
import { existsSync, readdirSync } from 'node:fs'

/**
 * Applique les migrations SQL du dossier `drizzle/`.
 *
 * On n'utilise pas `drizzle-kit migrate` / `drizzle-kit push` : ces commandes
 * passent par le driver websocket de `@neondatabase/serverless`, qui reste
 * bloqué sur « Pulling schema » selon la version de Node et la configuration
 * réseau. Ce script emprunte le driver HTTP — exactement celui dont
 * l'application se sert déjà, et dont on sait donc qu'il fonctionne.
 *
 * Contrepartie : le driver HTTP n'ouvre pas de transaction, les instructions
 * sont donc appliquées une à une. Pour un schéma versionné dans Git et
 * appliqué en avant seulement, c'est sans conséquence.
 *
 *   npm run db:generate   # produit le SQL depuis le schéma (hors ligne)
 *   npm run db:migrate    # l'applique
 */
async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      '\n  ✗ DATABASE_URL manquant — renseignez-le dans .env.local.\n',
    )
    process.exit(1)
  }

  if (!existsSync('drizzle') || readdirSync('drizzle').length === 0) {
    console.error(
      '\n  ✗ Aucune migration dans drizzle/.\n' +
        '    → npm run db:generate    (génère le SQL depuis le schéma)\n',
    )
    process.exit(1)
  }

  const db = drizzle(neon(process.env.DATABASE_URL))

  console.log('  Application des migrations…')
  await migrate(db, { migrationsFolder: 'drizzle' })
  console.log('  ✓ Schéma à jour.\n')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n  ✗ Migration interrompue :\n')
    console.error(error)
    console.error(
      '\n  Si l’erreur mentionne un type ou une table déjà existants, la base\n' +
        '  contient un schéma partiel. Diagnostic : npm run doctor\n',
    )
    process.exit(1)
  })
