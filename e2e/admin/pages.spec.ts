import { expect, test, type Page } from '@playwright/test'

import { attendreNotification, persisteApresRechargement } from '../support/aides'
import { PAGE_ACCUEIL, PAGE_CASSEE } from '../support/fixtures'

/*
 * Pages du site.
 *
 * Une page créée ici devient une adresse publique. Deux erreurs y
 * coûteraient cher : publier par accident quelque chose d'inachevé, et
 * donner à une page un slug que l'application se réserve — `/admin`,
 * `/api`… — ce qui masquerait l'administration derrière du contenu.
 *
 * Ce fichier crée sa propre page et la supprime ensuite.
 */

const NOUVELLE = {
  titre: 'Page de passage (test)',
  slug: 'page-de-passage-test',
}

async function ouvrirPages(page: Page) {
  await page.goto('/admin/pages', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Pages' }).first()).toBeVisible({
    timeout: 20_000,
  })
  /* Ancre : l'accueil est toujours là. Sans elle, un décompte fait sur une
     liste encore vide conclurait à tort. */
  await expect(ligne(page, PAGE_ACCUEIL.titre)).toHaveCount(1, {
    timeout: 20_000,
  })
}

const ligne = (page: Page, titre: string) =>
  page.getByRole('listitem').filter({ hasText: titre })

/**
 * Crée la page et suit l'application jusqu'à l'éditeur.
 *
 * Créer une page ouvre son éditeur : on vient de la créer pour la
 * remplir, rester sur la liste n'aurait pas de sens. Le test doit donc
 * revenir à la liste lui-même quand c'est elle qu'il examine.
 */
async function creerLaPage(page: Page, titre = NOUVELLE.titre) {
  await page.getByRole('button', { name: 'Nouvelle page' }).click()
  await page.getByLabel('Titre de la page').fill(titre)
  await page.getByRole('button', { name: 'Créer la page' }).click()
  await attendreNotification(page, 'Page créée — en brouillon.')
}

async function supprimerLaPage(page: Page, titre = NOUVELLE.titre) {
  await ouvrirPages(page)

  const entree = ligne(page, titre)
  for (let reste = await entree.count(); reste > 0 && reste < 20; reste -= 1) {
    const premiere = entree.first()
    await premiere.hover()
    await premiere.getByRole('button', { name: 'Supprimer' }).click()
    await premiere
      .getByRole('alertdialog')
      .getByRole('button')
      .first()
      .click()
    await expect(entree).toHaveCount(reste - 1, { timeout: 15_000 })
  }
}

test.describe('Pages — création', () => {
  test.afterEach(async ({ page }) => {
    await supprimerLaPage(page)
  })

  test('une page créée naît en BROUILLON, pas en ligne', async ({ page }) => {
    await ouvrirPages(page)
    await creerLaPage(page)

    /* L'éditeur s'ouvre sur la page neuve, et le dit. */
    await expect(page.getByText('Jamais publiée')).toBeVisible({
      timeout: 20_000,
    })

    /* Rien ne doit partir en ligne sans un geste explicite : une page
       vide publiée, c'est une adresse vide indexée par Google. */
    const reponse = await page.request.get(`/${NOUVELLE.slug}`, {
      failOnStatusCode: false,
    })
    expect(reponse.status(), 'Un brouillon doit répondre 404.').toBe(404)

    await ouvrirPages(page)
    await expect(
      ligne(page, NOUVELLE.titre).getByText('Brouillon'),
    ).toBeVisible()
  })

  test('l’adresse se déduit du titre', async ({ page }) => {
    await ouvrirPages(page)
    await page.getByRole('button', { name: 'Nouvelle page' }).click()
    await page.getByLabel('Titre de la page').fill(NOUVELLE.titre)

    await expect(page.getByLabel('Adresse')).toHaveValue(NOUVELLE.slug)
  })

  test('sans titre ni adresse, on ne peut pas créer', async ({ page }) => {
    await ouvrirPages(page)
    await page.getByRole('button', { name: 'Nouvelle page' }).click()

    await expect(
      page.getByRole('button', { name: 'Créer la page' }),
    ).toBeDisabled()
  })

  test('une adresse déjà prise est refusée', async ({ page }) => {
    await ouvrirPages(page)
    await page.getByRole('button', { name: 'Nouvelle page' }).click()
    await page.getByLabel('Titre de la page').fill(NOUVELLE.titre)
    await page.getByLabel('Adresse').fill(PAGE_CASSEE.slug)
    await page.getByRole('button', { name: 'Créer la page' }).click()

    await attendreNotification(page, /déjà utilisé/i)
  })

  for (const reserve of ['admin', 'api', 'login', 'preview', 'templates']) {
    test(`l’adresse réservée « ${reserve} » est refusée`, async ({ page }) => {
      await ouvrirPages(page)
      await page.getByRole('button', { name: 'Nouvelle page' }).click()
      await page.getByLabel('Titre de la page').fill(NOUVELLE.titre)
      await page.getByLabel('Adresse').fill(reserve)
      await page.getByRole('button', { name: 'Créer la page' }).click()

      /*
       * Une page du CMS à l'adresse `/admin` masquerait l'administration
       * derrière du contenu. Le refus ne suffit pas : il faut DIRE
       * pourquoi. « Formulaire invalide. » sur un champ qui obéit à des
       * règles précises ne dit pas quoi corriger.
       */
      await attendreNotification(page, 'Ce slug est réservé par l’application.')
    })
  }

  test('annuler la création ne crée rien', async ({ page }) => {
    await ouvrirPages(page)
    await page.getByRole('button', { name: 'Nouvelle page' }).click()
    await page.getByLabel('Titre de la page').fill(NOUVELLE.titre)
    await page.getByRole('button', { name: 'Annuler' }).click()

    await persisteApresRechargement(page, async () => {
      await expect(ligne(page, NOUVELLE.titre)).toHaveCount(0)
    })
  })
})

test.describe('Pages — suppression', () => {
  test.afterEach(async ({ page }) => {
    await supprimerLaPage(page)
  })

  test('l’accueil ne peut pas être supprimé', async ({ page }) => {
    await ouvrirPages(page)

    const accueil = ligne(page, PAGE_ACCUEIL.titre).first()
    await accueil.hover()

    /* Supprimer l'accueil laisserait un site sans racine : l'action ne
       doit même pas être proposée. */
    await expect(
      accueil.getByRole('button', { name: 'Supprimer' }),
    ).toHaveCount(0)
  })

  test('la suppression demande confirmation, en clair', async ({ page }) => {
    await ouvrirPages(page)
    await creerLaPage(page)

    /* La création a ouvert l'éditeur : on revient à la liste. */
    await ouvrirPages(page)

    const entree = ligne(page, NOUVELLE.titre).first()
    await entree.hover()
    await entree.getByRole('button', { name: 'Supprimer' }).click()

    /* Pas de corbeille « armée » qui semble ne rien faire au premier
       clic : la question est posée dans la ligne. */
    await expect(
      entree.getByText('Supprimer cette page et son contenu ?'),
    ).toBeVisible()
  })

  test('supprimer une page la retire de la base', async ({ page }) => {
    await ouvrirPages(page)
    await creerLaPage(page)
    await supprimerLaPage(page)

    await persisteApresRechargement(page, async () => {
      await expect(ligne(page, NOUVELLE.titre)).toHaveCount(0)
    })
  })
})

test.describe('Pages — état publié', () => {
  test('la page secondaire du jeu de test est publiée et servie', async ({
    page,
  }) => {
    await ouvrirPages(page)

    await expect(
      ligne(page, PAGE_CASSEE.titre).getByText('Publiée'),
    ).toBeVisible()

    const reponse = await page.request.get(`/${PAGE_CASSEE.slug}`)
    expect(reponse.status()).toBe(200)
  })

  test('dépublier une page la retire du site', async ({ page }) => {
    await ouvrirPages(page)

    const entree = ligne(page, PAGE_CASSEE.titre).first()
    await entree.hover()
    await entree.getByRole('button', { name: /Dépublier/ }).click()
    await attendreNotification(page, 'Page dépubliée.')

    /* Dépublier, c'est retirer une adresse du web : elle doit répondre
       404, pas afficher une page vide. */
    const reponse = await page.request.get(`/${PAGE_CASSEE.slug}`, {
      failOnStatusCode: false,
    })
    expect(reponse.status()).toBe(404)

    /*
     * Et on doit pouvoir la remettre en ligne — ce qui était impossible :
     * son instantané publié étant identique à son brouillon, l'éditeur la
     * disait « En ligne » et « Publier » restait inerte. Aucune issue,
     * sinon modifier la page au hasard pour réveiller le bouton.
     */
    await ouvrirPages(page)
    const ligneEditeur = ligne(page, PAGE_CASSEE.titre).first()
    await ligneEditeur.getByRole('link', { name: 'Modifier' }).click()
    await page.waitForURL(/\/admin\/pages\/[0-9a-f-]{36}/, { timeout: 20_000 })

    await expect(page.getByText('Dépubliée')).toBeVisible({ timeout: 20_000 })

    const publier = page.getByRole('button', { name: 'Publier' })
    await expect(publier, 'Une page dépubliée doit pouvoir repartir en ligne.')
      .toBeEnabled()
    await publier.click()
    await attendreNotification(page, 'En ligne ✓')

    const apres = await page.request.get(`/${PAGE_CASSEE.slug}`)
    expect(apres.status()).toBe(200)
  })
})
