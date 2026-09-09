import './load-env'

import { eq } from 'drizzle-orm'

import { db } from './index'
import { media, sections, services, type Media } from './schema'

/**
 * Insère des images de substitution et les rattache aux sections.
 *
 *   npm run db:seed-images
 *
 * Pourquoi Picsum et pas Unsplash : l'endpoint `/seed/<chaîne>` accepte
 * n'importe quel identifiant et renvoie toujours une image. Les URLs Unsplash
 * exigent un identifiant de photo exact — un identifiant erroné produit une
 * image cassée, ce qui est pire que pas d'image du tout.
 *
 * Les visuels sont demandés en noir et blanc : sur une palette ivoire et bleu
 * pâle, des photos couleur arbitraires se battent avec la direction
 * artistique et faussent le jugement. En gris, elles s'intègrent et laissent
 * lire la composition — ce qu'on cherche à évaluer.
 *
 * Script idempotent : relançable sans créer de doublons.
 */

const GRAYSCALE = true

function picsum(seed: string, width: number, height: number): string {
  const url = `https://picsum.photos/seed/${seed}/${width}/${height}`
  return GRAYSCALE ? `${url}?grayscale` : url
}

type Placeholder = {
  key: string
  alt: string
  width: number
  height: number
}

const PLACEHOLDERS = {
  hero: {
    key: 'amaswi-hero',
    alt: 'Image de substitution — à remplacer par la photographie du hero',
    width: 1400,
    height: 1750,
  },
  portrait: {
    key: 'amaswi-portrait',
    alt: 'Image de substitution — à remplacer par le portrait d’Anne Winzeried',
    width: 1200,
    height: 1500,
  },
  approach: {
    key: 'amaswi-approche',
    alt: 'Image de substitution — à remplacer par le visuel de la section Approche',
    width: 1200,
    height: 1600,
  },
  service1: {
    key: 'amaswi-accompagnement-1',
    alt: 'Image de substitution — premier accompagnement',
    width: 1200,
    height: 900,
  },
  service2: {
    key: 'amaswi-accompagnement-2',
    alt: 'Image de substitution — deuxième accompagnement',
    width: 1200,
    height: 900,
  },
  service3: {
    key: 'amaswi-accompagnement-3',
    alt: 'Image de substitution — troisième accompagnement',
    width: 1200,
    height: 900,
  },
} as const satisfies Record<string, Placeholder>

type PlaceholderName = keyof typeof PLACEHOLDERS

/** Crée le média s'il n'existe pas encore, sinon renvoie l'existant. */
async function ensureMedia(placeholder: Placeholder): Promise<Media> {
  const pathname = `placeholder/${placeholder.key}`

  const [existing] = await db
    .select()
    .from(media)
    .where(eq(media.pathname, pathname))
    .limit(1)

  if (existing) return existing

  const [created] = await db
    .insert(media)
    .values({
      url: picsum(placeholder.key, placeholder.width, placeholder.height),
      pathname,
      filename: `${placeholder.key}.jpg`,
      alt: placeholder.alt,
      width: placeholder.width,
      height: placeholder.height,
      mimeType: 'image/jpeg',
      size: 0,
    })
    .returning()

  if (!created) throw new Error(`Création impossible : ${placeholder.key}`)
  return created
}

/** Écrit `mediaId` dans le payload d'une section, sans toucher au reste. */
async function attachToSection(type: string, mediaId: string) {
  const rows = await db.select().from(sections).where(eq(sections.type, type))

  for (const row of rows) {
    const payload = (row.payload ?? {}) as Record<string, unknown>
    if (payload.mediaId) continue // déjà renseignée à la main : on n'écrase pas

    await db
      .update(sections)
      .set({ payload: { ...payload, mediaId }, updatedAt: new Date() })
      .where(eq(sections.id, row.id))
  }
}

async function main() {
  console.log('→ Création des médias')

  const created = {} as Record<PlaceholderName, Media>
  for (const [name, placeholder] of Object.entries(PLACEHOLDERS)) {
    created[name as PlaceholderName] = await ensureMedia(placeholder)
    console.log(`  · ${placeholder.key}`)
  }

  console.log('→ Rattachement aux sections')

  await attachToSection('hero', created.hero.id)
  await attachToSection('about', created.portrait.id)
  await attachToSection('approach', created.approach.id)

  console.log('→ Rattachement aux accompagnements')

  const allServices = await db.select().from(services)
  const serviceImages = [created.service1, created.service2, created.service3]

  for (const [index, service] of allServices.entries()) {
    if (service.mediaId) continue

    const image = serviceImages[index % serviceImages.length]
    if (!image) continue

    await db
      .update(services)
      .set({ mediaId: image.id, updatedAt: new Date() })
      .where(eq(services.id, service.id))
  }

  console.log('\n✓ Images en place.')
  console.log(
    '  Ce sont des substituts en noir et blanc. Remplacez-les depuis',
  )
  console.log('  /admin/medias dès que les vraies photos sont disponibles.\n')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
