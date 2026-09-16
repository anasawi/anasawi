import './load-env'

import { eq } from 'drizzle-orm'

import { db } from './index'
import {
  faqItems,
  media,
  pages,
  sections,
  seoMeta,
  services,
  settings,
} from './schema'

/**
 * Renommage de la marque et correction du nom, en base.
 *
 *   npm run db:rename-brand
 *
 * Le code source dit déjà ANASAWI / Anne Winzenried, mais tout le contenu
 * déjà saisi (réglages, sections, SEO, accompagnements, questions, alt
 * des médias) vit en base : il faut le réécrire. Ce script remplace
 * uniquement les chaînes concernées — il ne touche à aucune structure et
 * ne détruit aucun contenu. Relançable sans effet de bord.
 */

const RULES: [RegExp, string][] = [
  [/AMASWI/g, 'ANASAWI'],
  [/Amaswi/g, 'Anasawi'],
  [/amaswi\.com/g, 'anasawi.com'],
  [/annewinzeried@orange\.fr/g, 'annewinzenried@orange.fr'],
  [/Winzeried/g, 'Winzenried'],
  [/winzeried/g, 'winzenried'],
  [/amaswi/g, 'anasawi'],
]

/** Applique les règles à une chaîne ; renvoie null si rien ne change. */
function fix(input: string | null): string | null {
  if (!input) return null
  let out = input
  for (const [pattern, replacement] of RULES) out = out.replace(pattern, replacement)
  return out === input ? null : out
}

/** Même chose sur une valeur JSON quelconque (payloads, snapshots). */
function fixJson<T>(value: T): T | null {
  if (value === null || value === undefined) return null
  const before = JSON.stringify(value)
  const after = fix(before)
  if (after === null) return null
  return JSON.parse(after) as T
}

let changes = 0

async function main() {
  console.log('→ Réglages')
  const [s] = await db.select().from(settings).limit(1)
  if (s) {
    const patch: Record<string, unknown> = {}
    const textual = [
      'siteName',
      'practitionerName',
      'practitionerTitle',
      'contactEmail',
      'defaultSeoTitle',
      'defaultSeoDescription',
      'tagline',
      'practicalInfo',
      'bookingUrl',
    ] as const

    for (const key of textual) {
      const current = (s as Record<string, unknown>)[key]
      if (typeof current === 'string') {
        const next = fix(current)
        if (next !== null) patch[key] = next
      }
    }

    for (const key of ['navigation', 'identity', 'socialLinks', 'openingHours'] as const) {
      const next = fixJson((s as Record<string, unknown>)[key])
      if (next !== null) patch[key] = next
    }

    if (Object.keys(patch).length > 0) {
      await db.update(settings).set(patch).where(eq(settings.id, s.id))
      changes += Object.keys(patch).length
      console.log(`  · ${Object.keys(patch).join(', ')}`)
    }
  }

  console.log('→ Pages (titres et instantanés publiés)')
  for (const page of await db.select().from(pages)) {
    const patch: Record<string, unknown> = {}
    const title = fix(page.title)
    if (title !== null) patch.title = title
    const snapshot = fixJson(page.publishedSnapshot)
    if (snapshot !== null) patch.publishedSnapshot = snapshot
    if (Object.keys(patch).length > 0) {
      await db.update(pages).set(patch).where(eq(pages.id, page.id))
      changes++
      console.log(`  · ${page.title}`)
    }
  }

  console.log('→ Sections')
  for (const section of await db.select().from(sections)) {
    const patch: Record<string, unknown> = {}
    const payload = fixJson(section.payload)
    if (payload !== null) patch.payload = payload
    const name = fix(section.name)
    if (name !== null) patch.name = name
    const navLabel = fix(section.navLabel)
    if (navLabel !== null) patch.navLabel = navLabel
    if (Object.keys(patch).length > 0) {
      patch.updatedAt = new Date()
      await db.update(sections).set(patch).where(eq(sections.id, section.id))
      changes++
    }
  }

  console.log('→ SEO')
  for (const row of await db.select().from(seoMeta)) {
    const patch: Record<string, unknown> = {}
    for (const key of ['title', 'description', 'canonical'] as const) {
      const next = fix(row[key])
      if (next !== null) patch[key] = next
    }
    if (Object.keys(patch).length > 0) {
      await db.update(seoMeta).set(patch).where(eq(seoMeta.id, row.id))
      changes++
    }
  }

  console.log('→ Accompagnements, questions, médias')
  for (const row of await db.select().from(services)) {
    const patch: Record<string, unknown> = {}
    for (const key of ['title', 'excerpt', 'body', 'duration'] as const) {
      const current = (row as Record<string, unknown>)[key]
      if (typeof current === 'string') {
        const next = fix(current)
        if (next !== null) patch[key] = next
      }
    }
    if (Object.keys(patch).length > 0) {
      await db.update(services).set(patch).where(eq(services.id, row.id))
      changes++
    }
  }

  for (const row of await db.select().from(faqItems)) {
    const patch: Record<string, unknown> = {}
    for (const key of ['question', 'answer'] as const) {
      const current = (row as Record<string, unknown>)[key]
      if (typeof current === 'string') {
        const next = fix(current)
        if (next !== null) patch[key] = next
      }
    }
    if (Object.keys(patch).length > 0) {
      await db.update(faqItems).set(patch).where(eq(faqItems.id, row.id))
      changes++
    }
  }

  for (const row of await db.select().from(media)) {
    const patch: Record<string, unknown> = {}
    for (const key of ['alt', 'caption', 'filename'] as const) {
      const current = (row as Record<string, unknown>)[key]
      if (typeof current === 'string') {
        const next = fix(current)
        if (next !== null) patch[key] = next
      }
    }
    if (Object.keys(patch).length > 0) {
      await db.update(media).set(patch).where(eq(media.id, row.id))
      changes++
    }
  }

  console.log(`\n✓ ${changes} enregistrement(s) mis à jour.`)
  console.log('  Le site dit désormais ANASAWI et Anne Winzenried.')
  console.log('  Republiez les pages depuis l’éditeur pour propager au public.\n')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
