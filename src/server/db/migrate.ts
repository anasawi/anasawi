import './load-env'

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'
import { existsSync, readdirSync } from 'node:fs'

/**
 * Applique les migrations SQL du dossier `drizzle/`.
 *
 * LES MIGRATIONS SONT ÉCRITES À LA MAIN. `drizzle-kit generate` n'est PAS
 * utilisé : les instantanés de `drizzle/meta/*_snapshot.json` ne sont plus
 * maintenus depuis la 0000, et le générateur produirait un diff faux (il
 * recréerait tout). Pour changer le schéma : modifier `schema.ts`, écrire
 * le SQL correspondant dans `drizzle/00NN_nom.sql` (une instruction par
 * `--> statement-breakpoint`, idempotente autant que possible : `IF NOT
 * EXISTS`), puis ajouter l'entrée dans `drizzle/meta/_journal.json` avec
 * un `when` strictement croissant — c'est lui qui décide de l'ordre et de
 * ce qui reste à appliquer.
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
 *   npm run db:migrate    # applique ce qui manque
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
        '    → les migrations sont écrites à la main, voir l’en-tête de ce fichier\n',
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
