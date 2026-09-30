import './load-env'

import { neon } from '@neondatabase/serverless'
import { asc, isNotNull, isNull, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-http'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import {
  faqItems,
  media,
  pages,
  savedSections,
  sections,
  seoMeta,
  serviceGroups,
  services,
  settings,
} from './schema'

/**
 * Copie le CONTENU du site d'une base vers une autre.
 *
 *   CIBLE=preprod npx tsx src/server/db/copier-contenu.ts
 *   CIBLE=prod    npx tsx src/server/db/copier-contenu.ts
 *   CIBLE=prod A_BLANC=1 …   # ne fait que compter et vérifier
 *
 * Source : `DATABASE_URL` (la base de développement). Cible :
 * `PREPROD_DATABASE_URL` ou `PROD_DATABASE_URL`, selon `CIBLE`.
 *
 * Ce qui est copié, à l'identique (mêmes identifiants) : médias, page
 * d'accueil et sa version publiée, sections, référencement, titres de
 * regroupement, accompagnements, questions fréquentes, réglages, modèles
 * personnels. Ce qui n'est PAS touché : les comptes administrateur et
 * les messages reçus depuis le formulaire — ils appartiennent à la cible.
 *
 * Tout part dans UNE transaction (le pilote HTTP de Neon exécute un
 * `batch` de façon atomique) : ou la cible reçoit tout, ou elle reste
 * telle quelle. L'ordre des instructions respecte les clés étrangères.
 *
 * Fichiers médias : une ligne `media` dont l'URL commence par
 * `/api/media/` désigne un fichier du stockage (dossier `.storage/` en
 * développement, Netlify Blobs en ligne). Si `NETLIFY_AUTH_TOKEN` et
 * `NETLIFY_SITE_ID` sont renseignés, ces fichiers sont envoyés dans le
 * stockage du site ; sinon le script les liste, pour ne rien oublier.
 */

const cible = process.env.CIBLE
const aBlanc = process.env.A_BLANC === '1'

function urlCible(): string {
  const cle =
    cible === 'preprod'
      ? 'PREPROD_DATABASE_URL'
      : cible === 'prod'
        ? 'PROD_DATABASE_URL'
        : null
  if (!cle) {
    console.error('\n  ✗ CIBLE doit valoir « preprod » ou « prod ».\n')
    process.exit(1)
  }
  const url = process.env[cle]
  if (!url) {
    console.error(`\n  ✗ ${cle} manquant dans .env.local.\n`)
    process.exit(1)
  }
  return url
}

function hote(url: string): string {
  return new URL(url).host
}

async function main() {
  const source = process.env.DATABASE_URL
  if (!source) {
    console.error('\n  ✗ DATABASE_URL manquant — renseignez-le dans .env.local.\n')
    process.exit(1)
  }
  const destination = urlCible()
  if (hote(source) === hote(destination)) {
    console.error('\n  ✗ Source et cible sont la même base : rien à copier.\n')
    process.exit(1)
  }

  const de = drizzle(neon(source))
  const vers = drizzle(neon(destination))

  console.log(`\n  Source : ${hote(source)}`)
  console.log(`  Cible  : ${hote(destination)} (${cible})${aBlanc ? ' — À BLANC' : ''}\n`)

  /* ── Lecture de la source ─────────────────────────────────────────── */
  const [
    medias,
    pagesRows,
    racines,
    enfants,
    seo,
    groupes,
    accompagnements,
    questions,
    reglages,
    modeles,
  ] = await Promise.all([
    de.select().from(media),
    de.select().from(pages),
    de.select().from(sections).where(isNull(sections.parentId)).orderBy(asc(sections.sortOrder)),
    de.select().from(sections).where(isNotNull(sections.parentId)).orderBy(asc(sections.sortOrder)),
    de.select().from(seoMeta),
    de.select().from(serviceGroups).orderBy(asc(serviceGroups.sortOrder)),
    de.select().from(services).orderBy(asc(services.sortOrder)),
    de.select().from(faqItems).orderBy(asc(faqItems.sortOrder)),
    de.select().from(settings),
    de.select().from(savedSections),
  ])

  const [reglage] = reglages
  if (!reglage) {
    console.error('  ✗ La source n’a pas de réglages : base vide ?')
    process.exit(1)
  }
  const accueil = pagesRows.find((p) => p.isHome)
  if (!accueil) {
    console.error('  ✗ La source n’a pas de page d’accueil.')
    process.exit(1)
  }

  console.log('  À copier :')
  console.log(`    ${medias.length} médias`)
  console.log(`    ${pagesRows.length} page(s), ${racines.length + enfants.length} sections, ${seo.length} référencement(s)`)
  console.log(`    ${groupes.length} titres, ${accompagnements.length} accompagnements, ${questions.length} questions`)
  console.log(`    ${modeles.length} modèles personnels, 1 jeu de réglages`)
  console.log(`    accueil : ${accueil.publishedAt ? 'publiée' : 'JAMAIS PUBLIÉE'} (${accueil.publishedSnapshot ? 'avec' : 'sans'} version en ligne)\n`)

  /* ── Fichiers médias ──────────────────────────────────────────────── */
  const fichiers = medias
    .filter((m) => m.url.startsWith('/api/media/'))
    .map((m) => ({ media: m, cle: decodeURIComponent(m.url.slice('/api/media/'.length)) }))

  const localDir = path.join(process.cwd(), '.storage')
  const manquants = fichiers.filter((f) => !existsSync(path.join(localDir, f.cle)))
  if (manquants.length > 0) {
    console.error('  ✗ Fichiers absents de .storage/ (impossible de les envoyer) :')
    for (const f of manquants) console.error(`    - ${f.cle} (${f.media.alt})`)
    process.exit(1)
  }

  const token = process.env.NETLIFY_AUTH_TOKEN
  const siteID = process.env.NETLIFY_SITE_ID
  if (fichiers.length > 0) {
    console.log(`  ${fichiers.length} fichier(s) du stockage local à mettre en ligne :`)
    for (const f of fichiers) console.log(`    - ${f.cle} — ${f.media.alt}`)
    if (!token || !siteID) {
      console.log('  (NETLIFY_AUTH_TOKEN / NETLIFY_SITE_ID absents : ils NE seront PAS envoyés — à faire ensuite.)')
    }
    console.log()
  }

  if (aBlanc) {
    console.log('  À blanc : rien n’a été écrit.\n')
    return
  }

  /* ── Envoi des fichiers dans Netlify Blobs ────────────────────────── */
  if (fichiers.length > 0 && token && siteID) {
    const { getStore } = await import('@netlify/blobs')
    const store = getStore({ name: 'media', siteID, token, consistency: 'strong' })
    for (const f of fichiers) {
      const data = await readFile(path.join(localDir, f.cle))
      await store.set(f.cle, new Blob([data]), { metadata: { mimeType: f.media.mimeType } })
      console.log(`  ↑ ${f.cle} (${Math.round(data.length / 1024)} ko)`)
    }
    console.log()
  }

  /* ── Écriture, en une transaction ─────────────────────────────────── */
  const { id: _id, ...valeursReglages } = reglage
  void _id

  await vers.batch([
    /* Les références vers les médias d'abord, pour pouvoir les remplacer. */
    vers.update(settings).set({ logoMediaId: null, defaultOgMediaId: null }),
    vers.delete(sections),
    vers.delete(seoMeta),
    vers.delete(pages),
    vers.delete(services),
    vers.delete(serviceGroups),
    vers.delete(faqItems),
    vers.delete(savedSections),
    vers.delete(media),

    vers.insert(media).values(medias),
    vers.insert(pages).values(pagesRows),
    ...(racines.length > 0 ? [vers.insert(sections).values(racines)] : []),
    ...(enfants.length > 0 ? [vers.insert(sections).values(enfants)] : []),
    ...(seo.length > 0 ? [vers.insert(seoMeta).values(seo)] : []),
    ...(groupes.length > 0 ? [vers.insert(serviceGroups).values(groupes)] : []),
    ...(accompagnements.length > 0 ? [vers.insert(services).values(accompagnements)] : []),
    ...(questions.length > 0 ? [vers.insert(faqItems).values(questions)] : []),
    ...(modeles.length > 0 ? [vers.insert(savedSections).values(modeles)] : []),

    /* Les réglages : une seule ligne, mise à jour (créée si absente). */
    vers
      .insert(settings)
      .values(reglage)
      .onConflictDoUpdate({ target: settings.id, set: valeursReglages }),
  ])

  /* ── Relecture de la cible ────────────────────────────────────────── */
  const [[m], [s], [a], [q]] = await Promise.all([
    vers.select({ n: sql<number>`count(*)::int` }).from(media),
    vers.select({ n: sql<number>`count(*)::int` }).from(sections),
    vers.select({ n: sql<number>`count(*)::int` }).from(services),
    vers.select({ n: sql<number>`count(*)::int` }).from(faqItems),
  ])
  console.log('  Cible après copie :')
  console.log(`    ${m?.n} médias, ${s?.n} sections, ${a?.n} accompagnements, ${q?.n} questions`)
  const attendu = { m: medias.length, s: racines.length + enfants.length, a: accompagnements.length, q: questions.length }
  if (m?.n !== attendu.m || s?.n !== attendu.s || a?.n !== attendu.a || q?.n !== attendu.q) {
    console.error('  ✗ Les comptes ne correspondent pas à la source.')
    process.exit(1)
  }
  console.log('\n  ✓ Copie terminée. Le site en ligne se met à jour au prochain rendu (cache : une heure au plus, ou un enregistrement dans l’admin).\n')
}

main().catch((error) => {
  console.error('\n  ✗ Échec :', error instanceof Error ? error.message : error, '\n')
  process.exit(1)
})
