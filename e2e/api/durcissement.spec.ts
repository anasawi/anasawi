import { expect, test } from '@playwright/test'

import { MESSAGE_VALIDE, PHOTO } from '../support/fixtures'

/*
 * Durcissement des routes — ce qui a été ajouté après la revue de sécurité.
 *
 * Chaque test vérifie UN garde-fou : les en-têtes des écrans privés, le
 * refus d'une origine étrangère, les plages d'octets en suffixe, la
 * signature des octets à l'envoi, les anciennes adresses de
 * l'administration. Ils complètent `upload.spec.ts` et `contact.spec.ts`
 * sans les modifier.
 */

/** Une adresse IP à part : le formulaire de contact compte par adresse. */
const IP = '203.0.113.251'

test.describe('Écrans privés — en-têtes', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('/login n’est ni mis en cache ni indexé', async ({ request }) => {
    const reponse = await request.get('/login')
    expect(reponse.status()).toBe(200)
    expect(reponse.headers()['cache-control']).toContain('no-store')
    expect(reponse.headers()['x-robots-tag']).toContain('noindex')
  })

  test('un lien d’invitation ne transmet aucun referer', async ({ request }) => {
    const reponse = await request.get('/invitation/un-jeton-quelconque')
    expect(reponse.headers()['referrer-policy']).toBe('no-referrer')
    expect(reponse.headers()['cache-control']).toContain('no-store')
  })

  test('les anciennes adresses de l’administration redirigent de façon permanente (308)', async ({ request }) => {
    const anciennes: [string, string][] = [
      ['/admin/navigation', '/admin/reglages'],
      ['/admin/seo', '/admin/reglages'],
      ['/admin/parametres', '/admin/reglages'],
      ['/admin/identite', '/admin/reglages'],
      ['/admin/edit', '/admin/accueil'],
    ]
    for (const [ancienne, nouvelle] of anciennes) {
      const reponse = await request.get(ancienne, { maxRedirects: 0 })
      expect(reponse.status(), ancienne).toBe(308)
      expect(reponse.headers()['location'], ancienne).toContain(nouvelle)
    }
  })
})

test.describe('Médias — lecture', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('HEAD répond comme GET, sans corps', async ({ request }) => {
    const tete = await request.head(`/api/media/${PHOTO.cle}`)
    expect(tete.status()).toBe(200)
    expect(tete.headers()['content-type']).toContain('image/webp')
    expect(Number(tete.headers()['content-length'])).toBeGreaterThan(0)
    expect((await tete.body()).length).toBe(0)
  })

  test('les médias portent une politique qui interdit toute exécution', async ({ request }) => {
    const reponse = await request.get(`/api/media/${PHOTO.cle}`)
    expect(reponse.status()).toBe(200)
    expect(reponse.headers()['content-security-policy']).toContain("default-src 'none'")
    expect(reponse.headers()['content-security-policy']).toContain('sandbox')
    expect(reponse.headers()['cross-origin-resource-policy']).toBe('same-origin')
    expect(reponse.headers()['x-content-type-options']).toBe('nosniff')
  })

  test('une plage en suffixe rend les derniers octets', async ({ request }) => {
    const entier = await request.get(`/api/media/${PHOTO.cle}`)
    const total = Number(entier.headers()['content-length'])

    const reponse = await request.get(`/api/media/${PHOTO.cle}`, {
      headers: { Range: 'bytes=-10' },
    })
    expect(reponse.status()).toBe(206)
    expect(reponse.headers()['content-length']).toBe('10')
    expect(reponse.headers()['content-range']).toBe(`bytes ${total - 10}-${total - 1}/${total}`)
    expect((await reponse.body()).length).toBe(10)
  })

  test('une plage hors du fichier répond 416', async ({ request }) => {
    const reponse = await request.get(`/api/media/${PHOTO.cle}`, {
      headers: { Range: 'bytes=99999999-' },
      failOnStatusCode: false,
    })
    expect(reponse.status()).toBe(416)
  })
})

test.describe('Dépôt de fichier — origine et signature', () => {
  /** Un PNG valide, minimal — un pixel transparent. */
  const PNG_MINIMAL = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )

  test('une origine étrangère est refusée, même avec une session', async ({ request }) => {
    const reponse = await request.post('/api/upload', {
      headers: { Origin: 'https://autre-site.example' },
      multipart: { file: { name: 'pixel.png', mimeType: 'image/png', buffer: PNG_MINIMAL } },
      failOnStatusCode: false,
    })
    expect(reponse.status()).toBe(403)
  })

  test('un type d’image annoncé mais des octets qui n’en sont pas : 415', async ({ request }) => {
    /* Le type MIME est celui d'un PNG ; les octets, ceux d'un exécutable
       Windows. La liste blanche seule laissait passer. */
    const reponse = await request.post('/api/upload', {
      multipart: {
        file: { name: 'innocent.png', mimeType: 'image/png', buffer: Buffer.from('MZ\u0090\u0000\u0003') },
      },
      failOnStatusCode: false,
    })
    expect(reponse.status()).toBe(415)
    expect((await reponse.json()).error).toContain('Format non pris en charge')
  })

  test('le message de refus cite les formats vidéo', async ({ request }) => {
    const reponse = await request.post('/api/upload', {
      multipart: {
        file: { name: 'x.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') },
      },
      failOnStatusCode: false,
    })
    expect(reponse.status()).toBe(415)
    expect((await reponse.json()).error).toContain('WebM')
  })
})

test.describe('API contact — type de contenu et origine', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('un corps qui n’est pas annoncé en JSON est refusé en 400', async ({ request }) => {
    const reponse = await request.post('/api/contact', {
      headers: { 'Content-Type': 'text/plain', 'X-Forwarded-For': IP },
      data: JSON.stringify(MESSAGE_VALIDE),
      failOnStatusCode: false,
    })
    expect(reponse.status()).toBe(400)
    expect(await reponse.json()).toEqual({ error: 'Formulaire invalide.' })
  })

  test('une origine étrangère est refusée en 403', async ({ request }) => {
    const reponse = await request.post('/api/contact', {
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': IP,
        Origin: 'https://autre-site.example',
      },
      data: MESSAGE_VALIDE,
      failOnStatusCode: false,
    })
    expect(reponse.status()).toBe(403)
  })
})
