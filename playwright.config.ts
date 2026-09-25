import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

/*
 * Tests de bout en bout — navigateur réel, base isolée.
 *
 * Les tests écrivent : ils créent, modifient et suppriment du contenu. Ils
 * ne doivent donc jamais viser la base de développement, encore moins la
 * production. `.env.test` porte l'adresse d'une branche Neon dédiée, et
 * `globalSetup` la remet à plat avant chaque série.
 *
 * Trois profils d'écran, parce que la mise en page bascule réellement : le
 * menu se replie sous 1024px, les rangées d'accompagnements s'empilent, et
 * la carte au survol disparaît sur les pointeurs tactiles.
 */
config({ path: '.env.test', quiet: true })

const PORT = Number(process.env.E2E_PORT ?? 3100)
const BASE_URL = `http://127.0.0.1:${PORT}`

/* Session ouverte une fois par `auth.setup.ts` et réutilisée : rejouer la
   connexion à chaque fichier heurterait la limitation de débit (8 essais
   par quart d'heure) et ferait échouer des tests sans rapport. */
const SESSION = 'e2e/.auth/session.json'

export default defineConfig({
  testDir: './e2e',
  /* Un test qui traîne est un test qui ment : on borne. */
  timeout: 45_000,
  expect: { timeout: 10_000 },

  /* Pas de parallélisme entre fichiers : ils partagent une base et se
     marcheraient dessus. Le gain de temps ne vaut pas l'instabilité. */
  fullyParallel: false,
  workers: 1,

  /* Aucun test marqué `.only` ne doit passer en intégration continue. */
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,

  /*
   * Le rapport JSON n'est pas un doublon du rapport HTML : il est LISIBLE
   * PAR UN OUTIL. Chaque échec y porte son titre, son fichier, sa ligne,
   * son message et sa pile — de quoi diagnostiquer une série entière sans
   * recopier une console.
   */
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/resultats.json' }],
  ],

  use: {
    baseURL: BASE_URL,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    /* Trace et capture seulement en cas d'échec : de quoi comprendre sans
       noyer le dossier de rapport. */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    /* Prépare l'état d'authentification, réutilisé par les suites admin. */
    {
      name: 'setup',
      testMatch: /support\/auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },

    {
      name: 'desktop',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        storageState: SESSION,
      },
    },

    /* Les deux profils étroits ne rejouent que ce qui change de forme :
       rejouer toute la suite trois fois triplerait la durée sans rien
       apprendre de plus sur la logique métier. */
    {
      name: 'tablette',
      dependencies: ['setup'],
      use: { ...devices['iPad (gen 7)'], storageState: SESSION },
      testMatch: /(responsive|public)\/.*\.spec\.ts/,
    },
    {
      name: 'mobile',
      dependencies: ['setup'],
      use: { ...devices['iPhone 13'], storageState: SESSION },
      testMatch: /(responsive|public)\/.*\.spec\.ts/,
    },
  ],

  /*
   * Serveur dédié sur son propre port : on ne perturbe pas le `npm run dev`
   * qui tourne peut-être déjà sur 3000, et la base visée est celle des
   * tests. `reuseExistingServer` est faux même hors CI — un serveur déjà
   * lancé pointerait sur la mauvaise base.
   *
   * L'ORDRE COMPTE, et il a coûté une séance de débogage : la page d'accueil
   * est prérendue au build avec `revalidate = 3600`. Réinitialiser la base
   * APRÈS le build laisse donc un accueil figé sur les données précédentes,
   * pendant que les écrans d'administration, eux, sont dynamiques et à jour
   * — une incohérence qui ressemble à s'y méprendre à un bug applicatif.
   * Migration et remise à plat passent donc avant la construction.
   *
   * ET LE DOSSIER DE BUILD EST EFFACÉ D'ABORD, ce qui a coûté la séance
   * suivante. Le site enveloppe ses lectures dans `unstable_cache`
   * (`src/server/queries/index.ts`) : en dehors du mode développement, les
   * réponses sont écrites dans `.next-e2e/cache` avec une heure de TTL, et
   * ce cache SURVIT d'une exécution à l'autre. Un script CLI comme
   * `reset-db.ts` ne peut pas appeler `revalidateTag` : sans effacement, le
   * build reconstruit la page d'accueil à partir de sections périmées —
   * celles d'une série précédente, parfois vieilles de plusieurs jours.
   * Le symptôme est cruel : la base est juste, les tests échouent, et rien
   * ne relie les deux.
   */
  webServer: {
    command: [
      'rm -rf .next-e2e',
      'npx tsx src/server/db/migrate.ts',
      'npx tsx e2e/support/reset-db.ts',
      'npm run build',
      `npm run start -- --port ${PORT}`,
    ].join(' && '),
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      NEXT_DIST_DIR: '.next-e2e',
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? '',
      AUTH_SECRET: process.env.AUTH_SECRET ?? 'e2e-secret-ne-sert-qu-aux-tests',
      AUTH_TRUST_HOST: 'true',
      NEXT_PUBLIC_SITE_URL: BASE_URL,
      MEDIA_STORAGE: 'local',
    },
  },
})
