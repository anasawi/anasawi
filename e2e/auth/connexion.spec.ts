import { expect, test } from '@playwright/test'

import { collecterErreursConsole } from '../support/aides'
import { COMPTE, EMAILS_INVALIDES, MESSAGES } from '../support/fixtures'

/*
 * Authentification.
 *
 * Contexte vierge pour tout ce fichier : la session partagée des autres
 * suites ferait passer ces tests sans rien prouver.
 */
test.use({ storageState: { cookies: [], origins: [] } })

/**
 * L'alerte du formulaire, et elle seule.
 *
 * Next ajoute à chaque page un annonceur de navigation invisible qui porte
 * lui aussi `role="alert"` : `getByRole('alert')` en trouverait deux et
 * échouerait en mode strict, sans qu'aucun défaut n'existe.
 */
const alerte = (page: import('@playwright/test').Page) =>
  page.locator('form [role="alert"]')

test.describe('Connexion', () => {
  test('le formulaire s’affiche et n’est pas indexable', async ({ page }) => {
    const reponse = await page.goto('/login')
    expect(reponse?.status()).toBe(200)

    await expect(page.getByLabel('E-mail')).toBeVisible()
    await expect(page.getByLabel('Mot de passe')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible()

    /* Une page de connexion indexée expose la surface d'attaque et pollue
       les résultats de recherche de la cliente. */
    const robots = await page
      .locator('meta[name="robots"]')
      .getAttribute('content')
    expect(robots).toContain('noindex')
  })

  test('des identifiants corrects ouvrent l’administration', async ({ page }) => {
    const erreurs = collecterErreursConsole(page)

    await page.goto('/login')
    await page.getByLabel('E-mail').fill(COMPTE.email)
    await page.getByLabel('Mot de passe').fill(COMPTE.motDePasse)
    await page.getByRole('button', { name: 'Se connecter' }).click()

    await page.waitForURL(/\/admin/, { timeout: 20_000 })
    await expect(
      page.getByRole('heading', { name: /^Bonjour/ }),
    ).toBeVisible()

    expect(erreurs, erreurs.join('\n')).toEqual([])
  })

  test('un mot de passe faux est refusé, sans révéler la cause', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail').fill(COMPTE.email)
    await page.getByLabel('Mot de passe').fill('ce-mot-de-passe-est-faux')
    await page.getByRole('button', { name: 'Se connecter' }).click()

    await expect(alerte(page)).toHaveText(MESSAGES.identifiantsIncorrects)

    /* Le message ne doit pas trahir que le compte existe. */
    await expect(alerte(page)).not.toContainText(/mot de passe/i)
    await expect(alerte(page)).not.toContainText(/inconnu|introuvable|existe/i)
    await expect(page).toHaveURL(/\/login/)
  })

  test('une adresse inconnue donne exactement le même message', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail').fill('personne@anasawi.test')
    await page.getByLabel('Mot de passe').fill('un-mot-de-passe-quelconque')
    await page.getByRole('button', { name: 'Se connecter' }).click()

    await expect(alerte(page)).toHaveText(MESSAGES.identifiantsIncorrects)
  })

  test('les champs vides sont bloqués par le navigateur', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Se connecter' }).click()

    /* `required` : la soumission n'a pas lieu, on reste sur /login sans
       qu'aucune requête ne parte. */
    await expect(page).toHaveURL(/\/login/)
    const valide = await page
      .getByLabel('E-mail')
      .evaluate((el: HTMLInputElement) => el.validity.valid)
    expect(valide).toBe(false)
  })

  for (const email of EMAILS_INVALIDES.filter(Boolean)) {
    test(`l’adresse « ${email} » est rejetée`, async ({ page }) => {
      await page.goto('/login')
      await page.getByLabel('E-mail').fill(email)
      await page.getByLabel('Mot de passe').fill('un-mot-de-passe-quelconque')
      await page.getByRole('button', { name: 'Se connecter' }).click()

      /* Soit le navigateur refuse la saisie (type=email), soit le serveur
         répond son message muet. Dans les deux cas : pas d'accès. */
      await expect(page).toHaveURL(/\/login/)
      await expect(page.getByRole('heading', { name: /^Bonjour/ })).toHaveCount(0)
    })
  }

  test('un double clic n’ouvre pas deux sessions ni ne casse la page', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail').fill(COMPTE.email)
    await page.getByLabel('Mot de passe').fill(COMPTE.motDePasse)

    const bouton = page.getByRole('button', { name: 'Se connecter' })
    await bouton.click()
    /* Le bouton se désactive pendant l'envoi : le second clic ne part pas.
       On le tente quand même, c'est le geste réel d'un utilisateur pressé. */
    await bouton.click({ force: true, timeout: 2000 }).catch(() => {})

    await page.waitForURL(/\/admin/, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: /^Bonjour/ })).toBeVisible()
  })
})

test.describe('Protection des routes', () => {
  const routesProtegees = [
    '/admin',
    '/admin/accueil',
    '/admin/accompagnements',
    '/admin/faq',
    '/admin/medias',
    '/admin/messages',
    '/admin/navigation',
    '/admin/reglages',
    '/admin/seo',
  ]

  for (const route of routesProtegees) {
    test(`${route} renvoie vers la connexion sans session`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/)
      await expect(page.getByLabel('Mot de passe')).toBeVisible()
    })
  }

  test('la redirection conserve la destination demandée', async ({ page }) => {
    await page.goto('/admin/reglages')
    const url = new URL(page.url())
    expect(url.pathname).toBe('/login')
    /* NextAuth passe la cible en `callbackUrl` : sans elle, on retombe sur
       le tableau de bord après connexion, ce qui perd l'intention. */
    expect(url.searchParams.get('callbackUrl')).toContain('/admin/reglages')
  })
})

test.describe('Déconnexion', () => {
  test('ferme la session et reverrouille l’administration', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail').fill(COMPTE.email)
    await page.getByLabel('Mot de passe').fill(COMPTE.motDePasse)
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await page.waitForURL(/\/admin/, { timeout: 20_000 })

    /* « Se déconnecter » est un bouton nommé de la barre latérale — pas
       un menu à ouvrir d'abord. */
    await page
      .getByRole('navigation', { name: 'Administration' })
      .getByRole('button', { name: 'Se déconnecter' })
      .click()

    await page.waitForURL(/\/login/, { timeout: 20_000 })

    /* La vraie vérification : la route protégée redirige de nouveau. */
    await page.goto('/admin/reglages')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Session ouverte', () => {
  test('/login renvoie vers l’administration', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail').fill(COMPTE.email)
    await page.getByLabel('Mot de passe').fill(COMPTE.motDePasse)
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await page.waitForURL(/\/admin/, { timeout: 20_000 })

    await page.goto('/login')
    await expect(page).toHaveURL(/\/admin/)
  })
})

/* Placé en dernier : il consomme le quota de tentatives de l'adresse IP, et
   ferait échouer les tests de connexion qui le suivraient. */
test.describe('Limitation de débit', () => {
  test('bloque après huit tentatives, sans l’annoncer', async ({ page }) => {
    await page.goto('/login')

    for (let i = 0; i < 9; i += 1) {
      await page.getByLabel('E-mail').fill(COMPTE.email)
      await page.getByLabel('Mot de passe').fill(`faux-${i}`)
      await page.getByRole('button', { name: 'Se connecter' }).click()
      await expect(alerte(page)).toBeVisible()
    }

    /* Au-delà du seuil, le bon mot de passe doit lui aussi être refusé —
       c'est la preuve que le blocage précède la vérification. Et le message
       reste le même : révéler le blocage indiquerait le seuil à contourner. */
    await page.getByLabel('E-mail').fill(COMPTE.email)
    await page.getByLabel('Mot de passe').fill(COMPTE.motDePasse)
    await page.getByRole('button', { name: 'Se connecter' }).click()

    await expect(alerte(page)).toHaveText(MESSAGES.identifiantsIncorrects)
    await expect(page).toHaveURL(/\/login/)
  })
})
