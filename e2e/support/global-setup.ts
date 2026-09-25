import { execFileSync } from 'node:child_process'

/**
 * Prépare l'environnement avant toute série de tests.
 *
 * Deux temps : appliquer les migrations sur la branche de test, puis la
 * remettre à plat. Les deux passent par `tsx` dans un processus séparé —
 * les scripts lisent `process.env` à leur évaluation, et les mélanger au
 * processus de Playwright rendrait l'ordre de chargement fragile.
 */
export default function globalSetup() {
  /* `Record` et non `NodeJS.ProcessEnv` : ce dernier exige `NODE_ENV` dans
     le typage du projet, alors qu'on ne fournit ici qu'une surcharge
     partielle, fusionnée ensuite avec `process.env`. */
  const lancer = (script: string, env: Record<string, string> = {}) =>
    execFileSync('npx', ['tsx', script], {
      stdio: 'inherit',
      env: { ...process.env, ...env },
    })

  const adresse = process.env.E2E_DATABASE_URL
  if (!adresse) {
    throw new Error(
      'E2E_DATABASE_URL manquant — voir .env.test.example. Les tests ne\n' +
        'peuvent viser que la branche Neon « test ».',
    )
  }

  /* Le migrateur lit DATABASE_URL : on lui donne celle des tests. */
  lancer('src/server/db/migrate.ts', { DATABASE_URL: adresse })

  lancer('e2e/support/reset-db.ts')
}
