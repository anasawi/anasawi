import './load-env'

import { neon } from '@neondatabase/serverless'

/**
 * COPIE DU PIED DE PAGE vers la préprod ou la production.
 *
 *   npm run pied:copier -- preprod
 *   npm run pied:copier -- prod
 *
 * Copie `settings.pied` (organismes, déontologie, collègues, mentions
 * légales et confidentialité, libellés du menu) de la base de ce poste
 * (`DATABASE_URL`) vers celle visée (`PREPROD_DATABASE_URL` ou
 * `PROD_DATABASE_URL`, dans .env.local). Rien d'autre n'est touché.
 *
 * Les LOGOS sont des fichiers rangés dans le stockage de chaque site : ils
 * ne voyagent pas. Le lien vers un logo est retiré, puis, sur le site
 * visé : Réglages › Pied de page › « Récupérer les logos manquants »,
 * et Enregistrer.
 *
 * La valeur remplacée est affichée avant l'écriture (pour pouvoir la
 * remettre à la main si besoin).
 */

const cible = process.argv[2]
const nomVariable = cible === 'preprod' ? 'PREPROD_DATABASE_URL' : cible === 'prod' ? 'PROD_DATABASE_URL' : null
if (!nomVariable) {
  console.error('\n  Usage : npm run pied:copier -- preprod   (ou prod)\n')
  process.exit(1)
}

const ici = process.env.DATABASE_URL
const la = process.env[nomVariable]
if (!ici || !la) {
  console.error(`\n  ✗ DATABASE_URL ou ${nomVariable} manquant dans .env.local.\n`)
  process.exit(1)
}
if (ici === la) {
  console.error('\n  ✗ La base de ce poste EST la base visée : rien à copier.\n')
  process.exit(1)
}

type Organisme = { id: string; logoMediaId: string | null }

async function main() {
  const source = neon(ici!)
  const destination = neon(la!)

  const [ligne] = (await source`select pied from settings where id = 'singleton'`) as { pied: Record<string, unknown> | null }[]
  if (!ligne?.pied) {
    console.error('\n  ✗ Aucun pied de page enregistré sur ce poste.\n')
    process.exit(1)
  }

  const colonne = (await destination`select 1 from information_schema.columns where table_name = 'settings' and column_name = 'pied'`) as unknown[]
  if (!colonne.length) {
    console.error(`\n  ✗ La base ${cible} n’a pas encore la colonne « pied » : déployez d’abord (le build applique la migration), puis relancez.\n`)
    process.exit(1)
  }

  /* Les logos : on garde un lien seulement si le média existe là-bas. */
  const pied = structuredClone(ligne.pied) as Record<string, unknown> & { organismes?: Organisme[] }
  const ids = (pied.organismes ?? []).map((o) => o.logoMediaId).filter((id): id is string => Boolean(id))
  const existants = ids.length ? ((await destination`select id from media where id = any(${ids}::uuid[])`) as { id: string }[]).map((m) => m.id) : []
  let sansLogo = 0
  pied.organismes = (pied.organismes ?? []).map((o) => {
    if (o.logoMediaId && existants.includes(o.logoMediaId)) return o
    if (o.logoMediaId) sansLogo++
    return { ...o, logoMediaId: null }
  })

  const [avant] = (await destination`select pied from settings where id = 'singleton'`) as { pied: unknown }[]
  console.log(`\n  Valeur remplacée sur ${cible} :\n  ${JSON.stringify(avant?.pied ?? null)}\n`)

  await destination`
    insert into settings (id, pied, updated_at) values ('singleton', ${JSON.stringify(pied)}::jsonb, now())
    on conflict (id) do update set pied = excluded.pied, updated_at = now()`

  console.log(`  ✓ Pied de page copié vers ${cible}.`)
  if (sansLogo)
    console.log(
      `  → ${sansLogo} logo(s) à récupérer sur ${cible} : Réglages › Pied de page › « Récupérer les logos manquants », puis Enregistrer.`,
    )
  console.log('')
}

main().catch((erreur) => {
  console.error(`\n  ✗ ${(erreur as Error).message}\n`)
  process.exit(1)
})
