import { expect, test } from '@playwright/test'

import { PAGE_CASSEE, REGLAGES, SERVICES } from '../support/fixtures'

/*
 * Référencement — ce que voient les moteurs, jamais les visiteurs.
 *
 * Un cabinet de thérapie vit de ce que Google affiche : le titre, la
 * description, l'adresse et le téléphone du bloc local. Une coordonnée
 * fausse dans le JSON-LD ne se voit sur aucune page, et se corrige des
 * mois plus tard, quand quelqu'un a déjà appelé le mauvais numéro.
 *
 * Rien n'est écrit ici : ces tests lisent.
 */
test.use({ storageState: { cookies: [], origins: [] } })

/** Le graphe Schema.org de la page courante, déjà décodé. */
async function graphe(page: import('@playwright/test').Page) {
  const brut = await page
    .locator('script[type="application/ld+json"]')
    .first()
    .textContent()

  expect(brut, 'Aucun JSON-LD sur la page.').toBeTruthy()

  /* Un JSON-LD mal formé est invisible à l'œil et ignoré par Google :
     c'est exactement le genre de panne qu'on ne découvre jamais seul. */
  const decode = JSON.parse(brut ?? '{}') as {
    '@graph'?: Record<string, unknown>[]
  }
  return decode['@graph'] ?? []
}

const typeDe = (noeud: Record<string, unknown>) => String(noeud['@type'] ?? '')

test.describe('robots.txt', () => {
  test('existe, et ferme l’administration aux moteurs', async ({ request }) => {
    const reponse = await request.get('/robots.txt')
    expect(reponse.status()).toBe(200)

    const texte = await reponse.text()

    /* Une page d'administration indexée, c'est un formulaire de connexion
       dans les résultats de recherche. */
    for (const chemin of ['/admin', '/api/', '/login']) {
      expect(texte, `« ${chemin} » doit être interdit.`).toContain(
        `Disallow: ${chemin}`,
      )
    }
  })

  test('désigne le plan du site', async ({ request }) => {
    const texte = await (await request.get('/robots.txt')).text()
    expect(texte).toMatch(/Sitemap:\s*https?:\/\/\S+\/sitemap\.xml/)
  })
})

test.describe('sitemap.xml', () => {
  test('est un XML valide qui liste les pages publiées', async ({ request }) => {
    const reponse = await request.get('/sitemap.xml')
    expect(reponse.status()).toBe(200)
    expect(reponse.headers()['content-type']).toContain('xml')

    const xml = await reponse.text()
    expect(xml).toContain('<urlset')

    /* L'accueil et la page secondaire publiée y sont ; rien d'autre ne
       doit s'y glisser. */
    expect(xml).toMatch(/<loc>https?:\/\/[^<]+\/<\/loc>/)
    expect(xml).toContain(`/${PAGE_CASSEE.slug}`)
  })

  test('n’expose ni l’administration ni les brouillons', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text()

    for (const interdit of ['/admin', '/login', '/api/', '/preview']) {
      expect(xml, `« ${interdit} » n’a rien à faire dans le plan du site.`)
        .not.toContain(interdit)
    }
  })
})

test.describe('Métadonnées de l’accueil', () => {
  test('le titre est celui des réglages, pas « Accueil »', async ({ page }) => {
    await page.goto('/')

    /* « Accueil — ANASAWI » ne dit rien à quelqu'un qui cherche une
       thérapeute à Cesson-Sévigné. */
    await expect(page).toHaveTitle(REGLAGES.titreSeo)
  })

  test('la description est présente et lisible', async ({ page }) => {
    await page.goto('/')

    const description = page.locator('meta[name="description"]')
    await expect(description).toHaveCount(1)

    const contenu = (await description.getAttribute('content')) ?? ''
    expect(contenu.length, 'Une description vide vaut pas de description.')
      .toBeGreaterThan(50)
    /* Au-delà de ~160 caractères Google tronque ; la borne du schéma est
       à 300, on vérifie surtout qu'elle n'est pas démesurée. */
    expect(contenu.length).toBeLessThanOrEqual(300)
  })

  test('l’URL canonique est absolue', async ({ page }) => {
    await page.goto('/')

    const canonique = page.locator('link[rel="canonical"]')
    await expect(canonique).toHaveCount(1)
    await expect(canonique).toHaveAttribute('href', /^https?:\/\//)
  })

  test('les métadonnées de partage sont complètes', async ({ page }) => {
    await page.goto('/')

    /* Un lien partagé sans image ni titre s'affiche comme une URL nue —
       personne ne clique. */
    for (const propriete of ['og:title', 'og:description', 'og:image', 'og:url']) {
      await expect(
        page.locator(`meta[property="${propriete}"]`),
        `« ${propriete} » manque.`,
      ).toHaveCount(1)
    }
  })

  test('la page est indexable', async ({ page }) => {
    await page.goto('/')

    const robots = page.locator('meta[name="robots"]')
    if ((await robots.count()) > 0) {
      const contenu = (await robots.getAttribute('content')) ?? ''
      expect(contenu, 'L’accueil ne doit jamais porter « noindex ».')
        .not.toContain('noindex')
    }
  })
})

test.describe('JSON-LD', () => {
  test('est un JSON valide, en un seul graphe', async ({ page }) => {
    await page.goto('/')
    const noeuds = await graphe(page)
    expect(noeuds.length).toBeGreaterThan(0)
  })

  test('décrit le cabinet avec les vraies coordonnées', async ({ page }) => {
    await page.goto('/')
    const noeuds = await graphe(page)

    const cabinet = noeuds.find((n) => /Business|LocalBusiness/.test(typeDe(n)))
    expect(cabinet, 'Aucun nœud décrivant le cabinet.').toBeTruthy()

    /* Ces valeurs partent chez Google : une erreur ici envoie quelqu'un
       à la mauvaise adresse ou sur le mauvais numéro. */
    expect(String(cabinet?.telephone)).toContain('33670894497')

    const adresse = cabinet?.address as Record<string, string> | undefined
    expect(adresse?.streetAddress).toBe(REGLAGES.rue)
    expect(adresse?.postalCode).toBe(REGLAGES.codePostal)
    expect(adresse?.addressLocality).toBe(REGLAGES.ville)
  })

  test('décrit la praticienne', async ({ page }) => {
    await page.goto('/')
    const noeuds = await graphe(page)

    const personne = noeuds.find((n) => typeDe(n) === 'Person')
    expect(personne?.name).toBe(REGLAGES.praticienne)
  })

  test('reprend les questions fréquentes', async ({ page }) => {
    await page.goto('/')
    const noeuds = await graphe(page)

    const faq = noeuds.find((n) => typeDe(n) === 'FAQPage')
    expect(faq, 'Le bloc « questions fréquentes » n’alimente pas le JSON-LD.')
      .toBeTruthy()

    const questions = (faq?.mainEntity ?? []) as Record<string, unknown>[]
    expect(questions.length).toBeGreaterThan(0)
  })

  test('chaque nœud porte un @type et un @id', async ({ page }) => {
    await page.goto('/')
    const noeuds = await graphe(page)

    /* Sans @id, les nœuds ne se lient pas entre eux et Google les lit
       comme des fiches séparées. */
    for (const noeud of noeuds) {
      expect(typeDe(noeud), `Nœud sans @type : ${JSON.stringify(noeud).slice(0, 80)}`)
        .not.toBe('')
      expect(noeud['@id'], `Nœud sans @id : ${typeDe(noeud)}`).toBeTruthy()
    }
  })
})

test.describe('Image de partage', () => {
  test('la vignette de repli est un PNG de 1200×630', async ({ request }) => {
    /*
     * C'est l'image que voient les gens à qui l'on envoie le lien — dans
     * un message, sur un réseau. Elle est COMPOSÉE à la volée : une
     * erreur dedans ne casse aucune page du site et ne se voit donc
     * jamais, jusqu'au jour où quelqu'un partage le lien et reçoit un
     * rectangle gris.
     */
    const reponse = await request.get('/opengraph-image')
    expect(reponse.status()).toBe(200)
    expect(reponse.headers()['content-type']).toContain('image/png')

    const octets = await reponse.body()
    expect(octets.byteLength).toBeGreaterThan(5_000)

    /* Les dimensions vivent dans l'en-tête IHDR d'un PNG : octets 16 à 23,
       en gros-boutiste. Les réseaux sociaux attendent 1200×630 ; une
       vignette carrée se fait recadrer n'importe comment. */
    expect(octets.readUInt32BE(16)).toBe(1200)
    expect(octets.readUInt32BE(20)).toBe(630)
  })

  test('l’icône d’écran d’accueil existe et est carrée', async ({ request }) => {
    const reponse = await request.get('/apple-icon.png', {
      failOnStatusCode: false,
    })
    expect(reponse.status()).toBe(200)

    const octets = await reponse.body()
    expect(octets.readUInt32BE(16)).toBe(180)
    expect(octets.readUInt32BE(20)).toBe(180)
  })
})

test.describe('Structure de titres', () => {
  test('l’accueil suit une hiérarchie sans saut', async ({ page }) => {
    await page.goto('/')

    const niveaux = await page.evaluate(() =>
      Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((h) =>
        Number(h.tagName.slice(1)),
      ),
    )

    expect(niveaux.length).toBeGreaterThan(0)
    expect(niveaux[0], 'La page doit commencer par son H1.').toBe(1)

    /* Passer de h2 à h4 casse le plan de lecture d'un lecteur d'écran
       comme celui d'un moteur. */
    for (let i = 1; i < niveaux.length; i += 1) {
      const precedent = niveaux[i - 1] ?? 1
      const courant = niveaux[i] ?? 1
      expect(
        courant,
        `Saut de titre : h${precedent} suivi de h${courant}.`,
      ).toBeLessThanOrEqual(precedent + 1)
    }
  })

  test('chaque accompagnement est un titre de niveau 3', async ({ page }) => {
    await page.goto('/')

    for (const service of SERVICES) {
      await expect(
        page.getByRole('heading', { name: service.titre, level: 3 }),
      ).toHaveCount(1)
    }
  })
})
