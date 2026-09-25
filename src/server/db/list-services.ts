import './load-env'

import { asc } from 'drizzle-orm'

import { db } from './index'
import { serviceGroups, services } from './schema'

/**
 * Affiche la table des accompagnements telle qu'elle est en base.
 *
 * Outil de diagnostic, en lecture seule : il n'écrit rien. Utile quand
 * l'écran d'administration montre quelque chose d'inattendu et qu'il faut
 * savoir si le défaut vient de la donnée ou du rendu.
 *
 *   npm run db:list-services
 */
async function main() {
  const familles = await db
    .select()
    .from(serviceGroups)
    .orderBy(asc(serviceGroups.sortOrder))

  console.log(`\nFAMILLES (${familles.length})`)
  for (const f of familles) {
    console.log(`  ${String(f.sortOrder).padStart(3)}  ${f.label}   [${f.id.slice(0, 8)}]`)
  }

  const lignes = await db
    .select()
    .from(services)
    .orderBy(asc(services.sortOrder), asc(services.createdAt))

  console.log(`\nACCOMPAGNEMENTS (${lignes.length})`)
  for (const s of lignes) {
    const famille = familles.find((f) => f.id === s.groupId)?.label ?? '—'
    console.log(
      [
        String(s.sortOrder).padStart(3),
        s.isActive ? 'on ' : 'off',
        s.slug.padEnd(26),
        '|',
        s.title.padEnd(26),
        '|',
        famille.padEnd(24),
        '|',
        s.excerpt.slice(0, 40),
      ].join(' '),
    )
  }
  console.log()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
