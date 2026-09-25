import { expect, test } from '@playwright/test'

/*
 * `POST /api/upload` — la seule route qui écrit des octets sur le disque.
 *
 * Elle mérite le même soin que le formulaire de contact, pour une raison
 * différente : un dépôt ouvert, c'est un hébergement de fichiers gratuit
 * pour n'importe qui, sur le nom de domaine de la praticienne.
 *
 * Chaque refus doit porter SON code : un 500 générique là où il fallait
 * un 415 empêche l'interface de dire à Anne ce qui ne va pas, et fait
 * remonter une fausse alerte de panne.
 */

/** Une image PNG valide, minimale — un pixel transparent. */
const PNG_MINIMAL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test.describe('Dépôt de fichier — sans session', () => {
  /* Contexte déconnecté : c'est l'état de n'importe quel visiteur. */
  test.use({ storageState: { cookies: [], origins: [] } })

  test('un dépôt anonyme est refusé en 401', async ({ request }) => {
    const reponse = await request.post('/api/upload', {
      multipart: {
        file: {
          name: 'pixel.png',
          mimeType: 'image/png',
          buffer: PNG_MINIMAL,
        },
      },
      failOnStatusCode: false,
    })

    /* 401 et pas 403 : il n'y a pas de session, ce n'est pas une
       question de droits. */
    expect(reponse.status()).toBe(401)
    expect(await reponse.json()).toEqual({ error: 'Non autorisé.' })
  })

  test('aucun fichier n’est écrit sans session', async ({ request }) => {
    /* Corollaire du précédent : le refus doit intervenir AVANT toute
       écriture, sinon le disque se remplit quand même. */
    const reponse = await request.post('/api/upload', {
      multipart: { file: { name: 'x.png', mimeType: 'image/png', buffer: PNG_MINIMAL } },
      failOnStatusCode: false,
    })

    const corps = await reponse.text()
    expect(corps).not.toContain('"url"')
    expect(corps).not.toContain('"key"')
  })
})

test.describe('Dépôt de fichier — connectée', () => {
  test('un corps qui n’est pas un formulaire est refusé en 400', async ({
    request,
  }) => {
    const reponse = await request.post('/api/upload', {
      headers: { 'Content-Type': 'application/json' },
      data: { pas: 'un formulaire' },
      failOnStatusCode: false,
    })

    /* Erreur du client, pas panne du serveur. */
    expect(reponse.status()).toBe(400)
  })

  test('un formulaire sans fichier est refusé en 400', async ({ request }) => {
    const reponse = await request.post('/api/upload', {
      multipart: { filename: 'sans-fichier.png' },
      failOnStatusCode: false,
    })

    expect(reponse.status()).toBe(400)
    expect(await reponse.json()).toEqual({ error: 'Aucun fichier reçu.' })
  })

  test('un type non pris en charge est refusé en 415', async ({ request }) => {
    const reponse = await request.post('/api/upload', {
      multipart: {
        file: {
          name: 'script.svg',
          /* Le SVG est refusé à dessein : c'est un document exécutable
             qui peut porter du script, servi depuis notre domaine. */
          mimeType: 'image/svg+xml',
          buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
        },
      },
      failOnStatusCode: false,
    })

    expect(reponse.status()).toBe(415)
    expect((await reponse.json()).error).toContain('Format non pris en charge')
  })

  test('un exécutable déguisé en image est refusé', async ({ request }) => {
    const reponse = await request.post('/api/upload', {
      multipart: {
        file: {
          name: 'innocent.png',
          mimeType: 'application/x-msdownload',
          buffer: Buffer.from('MZ'),
        },
      },
      failOnStatusCode: false,
    })

    expect(reponse.status()).toBe(415)
  })

  test('un fichier trop lourd est refusé en 413', async ({ request }) => {
    /* Le navigateur recompresse avant d'envoyer ; la route doit quand
       même tenir sa borne, car rien n'oblige à passer par le navigateur. */
    const reponse = await request.post('/api/upload', {
      multipart: {
        file: {
          name: 'enorme.png',
          mimeType: 'image/png',
          buffer: Buffer.alloc(5 * 1024 * 1024, 1),
        },
      },
      failOnStatusCode: false,
    })

    expect(reponse.status()).toBe(413)
  })

  test('une image valide est acceptée et servie', async ({ request }) => {
    const reponse = await request.post('/api/upload', {
      multipart: {
        file: {
          name: 'pixel-de-test.png',
          mimeType: 'image/png',
          buffer: PNG_MINIMAL,
        },
      },
      failOnStatusCode: false,
    })

    expect(reponse.status()).toBe(200)
    const corps = (await reponse.json()) as { key: string; url: string }
    expect(corps.key).toBeTruthy()
    expect(corps.url).toMatch(/^\/api\/media\//)

    /* Le fichier doit être RELISIBLE : une route de dépôt qui répond 200
       sans rien stocker laisserait des images cassées dans le CMS. */
    const relecture = await request.get(corps.url)
    expect(relecture.status()).toBe(200)
    expect(relecture.headers()['content-type']).toContain('image/png')

    /* Les médias portent un cache immuable : leur clé change à chaque
       dépôt, donc rien ne peut rester périmé. */
    expect(relecture.headers()['cache-control']).toContain('immutable')
  })
})

test.describe('Lecture des médias', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('une clé inconnue répond 404, pas 500', async ({ request }) => {
    const reponse = await request.get('/api/media/inexistant-abc123.png', {
      failOnStatusCode: false,
    })
    expect(reponse.status()).toBe(404)
  })

  test('une extension inconnue répond 404', async ({ request }) => {
    const reponse = await request.get('/api/media/fichier.exe', {
      failOnStatusCode: false,
    })
    expect(reponse.status()).toBe(404)
  })

  test('une tentative de remontée de dossier ne sort pas du stockage', async ({
    request,
  }) => {
    /* `../` encodé : si la route concaténait naïvement, on lirait des
       fichiers du serveur. */
    const reponse = await request.get(
      '/api/media/..%2F..%2F..%2Fetc%2Fpasswd',
      { failOnStatusCode: false },
    )

    expect(reponse.status()).not.toBe(200)
    expect(await reponse.text()).not.toContain('root:')
  })
})
