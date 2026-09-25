import { expect, test } from '@playwright/test'

/*
 * Routes publiques : ce qui doit répondre, ce qui doit refuser.
 *
 * On vérifie les codes HTTP autant que l'affichage : une 404 qui renvoie 200
 * avec une jolie page d'erreur est un défaut de référencement — les moteurs
 * indexeraient la page d'erreur.
 *
 * Contexte déconnecté : un visiteur n'a pas de session. Avec celle du projet,
 * `/login` redirigerait vers l'administration et la barre d'édition
 * s'ajouterait au site — on ne testerait plus ce que voit le public.
 */
test.use({ storageState: { cookies: [], origins: [] } })
test.describe('Pages existantes', () => {
  const pagesPubliques = [
    { chemin: '/', titre: /Anne Winzenried/ },
    { chemin: '/templates', titre: /Bibliothèque de templates/ },
    { chemin: '/login', titre: /Connexion/ },
  ]

  for (const { chemin, titre } of pagesPubliques) {
    test(`${chemin} répond en 200 avec le bon titre`, async ({ page }) => {
      const reponse = await page.goto(chemin)
      expect(reponse?.status()).toBe(200)
      await expect(page).toHaveTitle(titre)
    })
  }
})

test.describe('Pages inexistantes', () => {
  const introuvables = [
    '/page-qui-nexiste-pas',
    '/a-propos',
    '/contact',
    '/2024/un/chemin/profond',
    '/Accueil',
  ]

  for (const chemin of introuvables) {
    test(`${chemin} renvoie un vrai 404`, async ({ page }) => {
      const reponse = await page.goto(chemin)
      expect(
        reponse?.status(),
        'Un contenu absent doit répondre 404, sans quoi les moteurs indexent la page d’erreur.',
      ).toBe(404)
    })
  }

  test('la page 404 propose un retour à l’accueil qui fonctionne', async ({
    page,
  }) => {
    await page.goto('/page-qui-nexiste-pas')

    /* La 404 vit hors du chrome du site : ni en-tête ni pied de page, un
       seul lien. On le nomme exactement pour ne pas viser autre chose. */
    await expect(
      page.getByRole('heading', { name: /Cette page n’existe plus/ }),
    ).toBeVisible()

    const retour = page.getByRole('link', { name: 'Retour à l’accueil' })
    await retour.click()

    await page.waitForURL(/127\.0\.0\.1:\d+\/$/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

test.describe('Slugs réservés', () => {
  /* Ces chemins appartiennent à l'application : une page du CMS qui
     porterait un de ces slugs les masquerait. */
  const reserves = ['/admin', '/api', '/login', '/preview']

  for (const chemin of reserves) {
    test(`${chemin} n’est jamais servi comme page du CMS`, async ({ page }) => {
      const reponse = await page.goto(chemin)
      const statut = reponse?.status() ?? 0
      /* 200 sur /login, redirection ou 404 ailleurs — jamais une page de
         contenu rendue par le moteur de blocs. */
      expect(statut).not.toBe(500)
      await expect(page.locator('[data-section-id]')).toHaveCount(0)
    })
  }
})

test.describe('Navigation du navigateur', () => {
  test('le retour arrière ramène à la page précédente', async ({ page }) => {
    await page.goto('/')
    await page.goto('/templates')
    await expect(page).toHaveTitle(/Bibliothèque/)

    await page.goBack()
    await expect(page).toHaveTitle(/Anne Winzenried/)

    await page.goForward()
    await expect(page).toHaveTitle(/Bibliothèque/)
  })

  test('un rechargement conserve la page', async ({ page }) => {
    await page.goto('/templates')
    await page.reload()
    await expect(page).toHaveTitle(/Bibliothèque/)
  })
})
