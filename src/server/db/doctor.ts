import './load-env'

import { neon } from '@neondatabase/serverless'

/**
 * Diagnostic de première installation.
 *
 *   npm run doctor
 *
 * Vérifie, dans l'ordre où les choses cassent en pratique : les variables
 * d'environnement, la connexion Neon, la présence des tables, puis le contenu
 * minimal attendu. Chaque échec dit quoi lancer ensuite — plutôt qu'une stack
 * trace Drizzle qui se contente de répéter la requête ayant échoué.
 */

const EXPECTED_TABLES = [
  'users',
  'media',
  'pages',
  'sections',
  'seo_meta',
  'services',
  'faq_items',
  'settings',
  'contact_messages',
] as const

type Check = { label: string; ok: boolean; detail: string; fix?: string }

const checks: Check[] = []

function record(label: string, ok: boolean, detail: string, fix?: string) {
  checks.push({ label, ok, detail, ...(fix ? { fix } : {}) })
}

async function main() {
  /* ── 1. Variables d'environnement ──────────────────────────────── */

  const required = ['DATABASE_URL', 'AUTH_SECRET'] as const
  const optional = [
    ['BLOB_READ_WRITE_TOKEN', 'upload d’images depuis le CMS'],
    ['RESEND_API_KEY', 'notification e-mail du formulaire de contact'],
    ['NEXT_PUBLIC_SITE_URL', 'URL absolues du SEO (défaut : https://amaswi.com)'],
  ] as const

  for (const key of required) {
    record(
      key,
      Boolean(process.env[key]),
      process.env[key] ? 'renseignée' : 'manquante',
      key === 'AUTH_SECRET'
        ? 'openssl rand -base64 32 → coller dans .env.local'
        : 'console.neon.tech → connection string (pooled) → .env.local',
    )
  }

  for (const [key, usage] of optional) {
    record(
      `${key} (optionnel)`,
      true,
      process.env[key] ? 'renseignée' : `absente — ${usage} désactivé`,
    )
  }

  if (!process.env.DATABASE_URL) {
    report()
    process.exit(1)
  }

  /* ── 2. Connexion ──────────────────────────────────────────────── */

  const sql = neon(process.env.DATABASE_URL)

  try {
    const [row] = (await sql`select version() as version`) as {
      version: string
    }[]
    record('Connexion Neon', true, row?.version?.split(',')[0] ?? 'établie')
  } catch (error) {
    record(
      'Connexion Neon',
      false,
      error instanceof Error ? error.message : 'échec',
      'Vérifier DATABASE_URL — il faut la chaîne « pooled » (…-pooler.…) avec ?sslmode=require',
    )
    report()
    process.exit(1)
  }

  /* ── 3. Tables ─────────────────────────────────────────────────── */

  const rows = (await sql`
    select table_name from information_schema.tables
    where table_schema = 'public'
  `) as { table_name: string }[]

  const present = new Set(rows.map((r) => r.table_name))
  const missing = EXPECTED_TABLES.filter((t) => !present.has(t))

  record(
    'Tables',
    missing.length === 0,
    missing.length === 0
      ? `${EXPECTED_TABLES.length} tables présentes`
      : `manquantes : ${missing.join(', ')}`,
    'npm run db:push',
  )

  if (missing.length > 0) {
    report()
    process.exit(1)
  }

  /* ── 4. Contenu ────────────────────────────────────────────────── */

  const [{ n: settingsCount } = { n: 0 }] = (await sql`
    select count(*)::int as n from settings
  `) as { n: number }[]

  record(
    'Réglages du site',
    settingsCount > 0,
    settingsCount > 0 ? 'présents' : 'aucune ligne',
    'npm run db:seed',
  )

  const [{ n: homeCount } = { n: 0 }] = (await sql`
    select count(*)::int as n from pages where is_home = true and status = 'published'
  `) as { n: number }[]

  record(
    'Page d’accueil publiée',
    homeCount > 0,
    homeCount > 0 ? 'trouvée' : 'aucune page marquée accueil et publiée',
    'npm run db:seed',
  )

  const [{ n: userCount } = { n: 0 }] = (await sql`
    select count(*)::int as n from users
  `) as { n: number }[]

  record(
    'Compte administrateur',
    userCount > 0,
    userCount > 0 ? `${userCount} compte(s)` : 'aucun compte',
    'npm run admin:create',
  )

  report()
  process.exit(checks.some((c) => !c.ok) ? 1 : 0)
}

function report() {
  console.log('')
  for (const check of checks) {
    console.log(
      `${check.ok ? '  ✓' : '  ✗'} ${check.label.padEnd(28)} ${check.detail}`,
    )
    if (!check.ok && check.fix) console.log(`    → ${check.fix}`)
  }

  const failed = checks.filter((c) => !c.ok)
  console.log('')
  console.log(
    failed.length === 0
      ? '  Tout est en place. npm run dev'
      : `  ${failed.length} point(s) à corriger — voir les flèches ci-dessus.`,
  )
  console.log('')
}

main().catch((error) => {
  console.error('\n  Erreur inattendue :\n')
  console.error(error)
  process.exit(1)
})
