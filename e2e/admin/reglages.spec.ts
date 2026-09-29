import { expect, test, type Page } from '@playwright/test'

import { attendreNotification, persisteApresRechargement } from '../support/aides'
import { REGLAGES, TROP_LONG } from '../support/fixtures'

/*
 * Réglages du site.
 *
 * Une seule page, mais c'est la source unique des coordonnées : le pied
 * de page, la section contact, les liens `tel:` et `mailto:`, et surtout
 * le JSON-LD envoyé à Google y puisent tous. Une faute de frappe ici se
 * propage partout à la fois — c'est sa force, et c'est pourquoi il faut
 * vérifier qu'elle se propage VRAIMENT.
 *
 * Ce fichier écrit dans les réglages du jeu de test : il remet donc les
 * valeurs d'origine avant de rendre la main. Les suites publiques
 * s'appuient dessus.
 */

const enregistrer = (page: Page) =>
  page.getByRole('button', { name: 'Enregistrer' })

async function ouvrirReglages(page: Page) {
  await page.goto('/admin/reglages', { waitUntil: 'domcontentloaded' })
  await expect(
    page.getByRole('heading', { name: 'Réglages', level: 1 }),
  ).toBeVisible({ timeout: 20_000 })
}

/** Remet les valeurs du jeu de test, quoi qu'il se soit passé. */
async function retablirLesReglages(page: Page) {
  await ouvrirReglages(page)

  const champs: [string, string][] = [
    ['Nom du site', REGLAGES.nomDuSite],
    ['Votre nom', REGLAGES.praticienne],
    ['Téléphone', REGLAGES.telephone],
    ['Adresse e-mail', REGLAGES.email],
    ['Rue', REGLAGES.rue],
    ['Code postal', REGLAGES.codePostal],
    ['Ville', REGLAGES.ville],
    ['Titre pour Google', REGLAGES.titreSeo],
  ]

  let aChanger = false
  for (const [libelle, valeur] of champs) {
    const champ = page.getByLabel(libelle, { exact: true })
    if ((await champ.inputValue()) !== valeur) {
      await champ.fill(valeur)
      aChanger = true
    }
  }

  if (!aChanger) return

  await enregistrer(page).click()
  await attendreNotification(page, 'Réglages enregistrés — tout le site est à jour.')
}

test.describe('Réglages — écriture et propagation', () => {
  test.afterEach(async ({ page }) => {
    await retablirLesReglages(page)
  })

  test('les valeurs du jeu de test sont bien celles affichées', async ({
    page,
  }) => {
    await ouvrirReglages(page)

    await expect(page.getByLabel('Nom du site', { exact: true })).toHaveValue(
      REGLAGES.nomDuSite,
    )
    await expect(page.getByLabel('Téléphone', { exact: true })).toHaveValue(
      REGLAGES.telephone,
    )
    await expect(page.getByLabel('Ville', { exact: true })).toHaveValue(
      REGLAGES.ville,
    )
  })

  test('le logo se choisit depuis les Réglages', async ({ page }) => {
    await ouvrirReglages(page)

    /* Le logo vivait dans le code : en changer demandait un
       déploiement. Il se choisit maintenant comme une photo. */
    await expect(page.getByText('Logo du site')).toBeVisible()
    await expect(
      page.getByText(/Sans choix, le logo livré avec le site est utilisé/),
    ).toBeVisible()

    /*
     * ET SON APERÇU AUX VRAIES TAILLES. Un sélecteur d'image montre
     * l'image en grand — justement la taille où un logo ne pose jamais
     * problème. Le piège est à 16 px, et rien dans l'admin ne permettait
     * de le voir : Anne aurait enregistré une tache sans le savoir.
     */
    await expect(page.getByText('Ce que verront vos visiteurs')).toBeVisible()
    for (const taille of ['Onglet', 'En-tête', 'Écran d’accueil']) {
      await expect(page.getByText(taille, { exact: true })).toBeVisible()
    }
  })

  test('un téléphone modifié atteint le site ET le JSON-LD', async ({
    page,
  }) => {
    await ouvrirReglages(page)
    await page.getByLabel('Téléphone', { exact: true }).fill('01 23 45 67 89')
    await enregistrer(page).click()
    await attendreNotification(
      page,
      'Réglages enregistrés — tout le site est à jour.',
    )

    await persisteApresRechargement(page, async () => {
      await expect(page.getByLabel('Téléphone', { exact: true })).toHaveValue(
        '01 23 45 67 89',
      )
    })

    await page.goto('/')

    /* Le lien d'appel, au format international. */
    await expect(
      page.getByRole('link', { name: '01 23 45 67 89' }).first(),
    ).toHaveAttribute('href', 'tel:+33123456789')

    /* Et le JSON-LD, que personne ne relit jamais à l'œil. */
    const brut = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .textContent()
    expect(brut).toContain('+33123456789')
    expect(brut).not.toContain('+33670894497')
  })

  test('une adresse modifiée atteint le pied de page', async ({ page }) => {
    await ouvrirReglages(page)
    await page.getByLabel('Rue', { exact: true }).fill('12 avenue des Tests')
    await enregistrer(page).click()
    await attendreNotification(
      page,
      'Réglages enregistrés — tout le site est à jour.',
    )

    await page.goto('/')
    await expect(
      page.getByRole('contentinfo').getByText('12 avenue des Tests'),
    ).toBeVisible()
  })

  test('une adresse e-mail invalide est refusée, champ par champ', async ({
    page,
  }) => {
    await ouvrirReglages(page)
    await page
      .getByLabel('Adresse e-mail', { exact: true })
      .fill('pas-une-adresse')
    await enregistrer(page).click()

    /* Le message doit être SOUS le champ fautif : un toast seul laisse
       chercher lequel des vingt champs pose problème. */
    const champ = page.getByLabel('Adresse e-mail', { exact: true })
    await expect(champ).toHaveAttribute('aria-invalid', 'true')

    await page.goto('/')
    await expect(page.getByText('pas-une-adresse')).toHaveCount(0)
  })

  test('un nom de site démesuré est refusé', async ({ page }) => {
    await ouvrirReglages(page)
    await page.getByLabel('Nom du site', { exact: true }).fill(TROP_LONG)
    await enregistrer(page).click()

    /* Refus en français courant, et la raison sous le champ. */
    await attendreNotification(page, 'Certains champs sont à corriger.')
    const champ = page.getByLabel('Nom du site', { exact: true })
    await expect(champ).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Le nom du site est trop long (120 caractères maximum).')).toBeVisible()
  })

  test('quitter sans enregistrer prévient, puis ne change rien', async ({ page }) => {
    await ouvrirReglages(page)
    await page.getByLabel('Nom du site', { exact: true }).fill('NOM JAMAIS ENREGISTRÉ')

    /* Une saisie non enregistrée : le navigateur demande confirmation
       avant de quitter — c'est la garde contre le travail perdu. On
       confirme le départ (sans elle, Playwright « annulerait » le
       rechargement et le test attendrait pour rien). */
    const avertissements: string[] = []
    page.on('dialog', (dialogue) => {
      avertissements.push(dialogue.type())
      void dialogue.accept()
    })

    await persisteApresRechargement(page, async () => {
      expect(avertissements).toContain('beforeunload')
      await expect(page.getByLabel('Nom du site', { exact: true })).toHaveValue(
        REGLAGES.nomDuSite,
      )
    })
  })
})
