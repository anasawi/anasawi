import { expect, test, type Page } from '@playwright/test'

import { attendreNotification, ouvrirLeMenu } from '../support/aides'
import { SERVICES } from '../support/fixtures'

/*
 * Brouillon et publication — la promesse centrale du CMS.
 *
 * Anne édite une page en direct ; le site, lui, continue de servir la
 * dernière version PUBLIÉE. C'est ce qui lui permet de travailler sans
 * crainte : tant qu'elle n'a pas cliqué « Publier », personne ne voit
 * rien. Une fuite de brouillon vers le site public serait le pire défaut
 * possible de cette application — pire qu'une panne, parce qu'invisible.
 *
 * Chaque test remet donc la page dans l'état publié avant de rendre la
 * main : la suite entière s'appuie sur l'accueil du jeu de test.
 */

const SECTION_ACCOMPAGNEMENTS = 'Accompagnements'

/** L'unique indicateur d'état de la barre du haut. */
const etat = (page: Page) =>
  page
    .getByText(/^(En ligne|Modifications à publier|Jamais publiée)$/)
    .first()

const publier = (page: Page) => page.getByRole('button', { name: 'Publier' })

/**
 * Ouvre l'éditeur de l'accueil et attend que sa barre du haut réponde.
 *
 * Pas de titre de page à attendre ici : l'éditeur occupe tout l'écran et
 * n'a pas d'en-tête d'administration. Son ancre, c'est « Publier ».
 */
async function ouvrirEditeur(page: Page) {
  await page.goto('/admin/accueil', { waitUntil: 'domcontentloaded' })
  await expect(publier(page)).toBeVisible({ timeout: 25_000 })
  await expect(etat(page)).toBeVisible({ timeout: 20_000 })
}

/** Ligne de la liste des sections, par son intitulé. */
const rangee = (page: Page, nom: string) =>
  page.getByRole('listitem').filter({ hasText: nom }).first()

/**
 * Masque une section depuis la liste — geste simple, effet net : le
 * brouillon diffère alors de la version en ligne.
 */
async function basculerVisibilite(page: Page, nom: string) {
  const ligne = rangee(page, nom)
  await ligne.hover()
  await ligne.getByTitle(/^(Masquer|Afficher)$/).click()
}

/** Jette le brouillon courant et revient à la version en ligne. */
async function annulerLeBrouillon(page: Page) {
  await page.getByRole('button', { name: 'Autres actions' }).click()
  await page
    .getByRole('menuitem', { name: /Annuler les modifications non publiées/ })
    .click()

  /* Une confirmation garde ce geste : il jette du travail. */
  await page
    .getByRole('button', { name: 'Revenir à la version en ligne' })
    .click()

  await attendreNotification(page, 'Retour à la version en ligne.')
  await expect(etat(page)).toHaveText('En ligne')
}

/**
 * Rend l'accueil du jeu de test exactement tel qu'on l'a trouvé.
 *
 * Indispensable, et pas seulement par politesse : cette suite PUBLIE.
 * Une section laissée masquée en ligne ne se répare pas toute seule au
 * test suivant — elle ferait échouer les suites publiques de trois
 * fichiers plus loin, sans rapport apparent.
 */
async function retablirAccueil(page: Page) {
  await ouvrirEditeur(page)

  if ((await etat(page).textContent()) !== 'En ligne') {
    await annulerLeBrouillon(page)
  }

  /* La version EN LIGNE elle-même peut porter la section masquée : il
     faut alors la remontrer, puis republier. */
  const masquee = rangee(page, SECTION_ACCOMPAGNEMENTS).getByText('masquée')
  if ((await masquee.count()) > 0) {
    await basculerVisibilite(page, SECTION_ACCOMPAGNEMENTS)
    await expect(etat(page)).toHaveText('Modifications à publier')
    await publier(page).click()
    await attendreNotification(page, 'En ligne ✓')
  }

  await expect(etat(page)).toHaveText('En ligne')
  await expect(masquee).toHaveCount(0)
}

test.describe('Brouillon et publication', () => {
  test.afterEach(async ({ page }) => {
    await retablirAccueil(page)
  })

  test('une page fraîchement publiée se dit « En ligne »', async ({ page }) => {
    await ouvrirEditeur(page)
    await expect(etat(page)).toHaveText('En ligne')

    /* Rien à publier : le bouton est inerte. Un bouton actif alors que
       tout est en ligne invite à des publications à vide. */
    await expect(publier(page)).toBeDisabled()
  })

  test('une modification bascule l’état, sans toucher au site', async ({
    page,
  }) => {
    await ouvrirEditeur(page)
    await basculerVisibilite(page, SECTION_ACCOMPAGNEMENTS)

    await expect(etat(page)).toHaveText('Modifications à publier')
    await expect(publier(page)).toBeEnabled()

    /*
     * LE POINT CENTRAL : le site public sert toujours l'instantané
     * publié. Tant qu'Anne n'a pas cliqué « Publier », ses visiteurs ne
     * voient rien du travail en cours.
     */
    await page.goto('/')
    for (const service of SERVICES) {
      await expect(
        page.getByRole('heading', { name: service.titre }),
      ).toBeVisible()
    }
  })

  test('publier met le brouillon en ligne', async ({ page }) => {
    await ouvrirEditeur(page)
    await basculerVisibilite(page, SECTION_ACCOMPAGNEMENTS)
    await expect(etat(page)).toHaveText('Modifications à publier')

    await publier(page).click()
    await attendreNotification(page, 'En ligne ✓')
    await expect(etat(page)).toHaveText('En ligne')

    /* Et MAINTENANT le site a changé. */
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: SERVICES[0].titre }),
    ).toHaveCount(0)
  })

  test('annuler les modifications rend la page à sa version en ligne', async ({
    page,
  }) => {
    await ouvrirEditeur(page)
    await basculerVisibilite(page, SECTION_ACCOMPAGNEMENTS)
    await expect(etat(page)).toHaveText('Modifications à publier')

    await annulerLeBrouillon(page)

    /* La section masquée est redevenue visible dans l'éditeur. */
    await expect(
      rangee(page, SECTION_ACCOMPAGNEMENTS).getByText('masquée'),
    ).toHaveCount(0)
  })

  test('l’état survit à un rechargement', async ({ page }) => {
    await ouvrirEditeur(page)
    await basculerVisibilite(page, SECTION_ACCOMPAGNEMENTS)
    await expect(etat(page)).toHaveText('Modifications à publier')

    /* L'enregistrement du brouillon est automatique : quitter la page
       sans publier ne doit rien perdre. */
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(etat(page)).toHaveText('Modifications à publier', {
      timeout: 20_000,
    })
  })

  test('« Annuler les modifications » est inerte quand tout est en ligne', async ({
    page,
  }) => {
    await ouvrirEditeur(page)
    await expect(etat(page)).toHaveText('En ligne')

    await page.getByRole('button', { name: 'Autres actions' }).click()

    /* Proposer d'annuler ce qui n'existe pas ne peut qu'inquiéter. */
    await expect(
      page.getByRole('menuitem', {
        name: /Annuler les modifications non publiées/,
      }),
    ).toBeDisabled()
    await expect(
      page.getByText('Le brouillon est identique à la version en ligne.'),
    ).toBeVisible()
  })
})

/*
 * L'ancre d'une section, changée depuis l'admin.
 *
 * Le menu du site est dérivé des sections : renommer « accompagnements »
 * en « nos-accompagnements » doit déplacer l'entrée du menu — mais SEULEMENT
 * quand c'est publié. Avant, le menu lisait les sections vivantes pendant
 * que la page servait l'instantané : un lien du menu visait un `id` qui
 * n'existait plus dans la page — mort, jusqu'à la publication.
 */
const ANCRE_ORIGINE = 'accompagnements'
const ANCRE_ESSAI = 'nos-accompagnements'

/** Ouvre l'inspecteur de la section et son groupe « Options avancées ». */
async function ouvrirLesOptionsAvancees(page: Page, nom: string) {
  await rangee(page, nom).click()
  const avancees = page.getByRole('button', { name: 'Options avancées' })
  await expect(avancees).toBeVisible()
  if ((await avancees.getAttribute('aria-expanded')) !== 'true') {
    await avancees.click()
  }
  return page.getByLabel('Lien d’ancrage')
}

/** Donne à l'ancre la valeur voulue et attend qu'elle soit écrite. */
async function renommerLAncre(page: Page, valeur: string) {
  const champ = await ouvrirLesOptionsAvancees(page, SECTION_ACCOMPAGNEMENTS)
  if ((await champ.inputValue()) === valeur) return false
  await champ.fill(valeur)
  /* L'écriture est automatique, après une courte accalmie de frappe :
     l'état de la page en témoigne. */
  await expect(etat(page)).toHaveText('Modifications à publier', {
    timeout: 10_000,
  })
  return true
}

test.describe('Ancre modifiée depuis l’admin', () => {
  test.afterEach(async ({ page }) => {
    /* Quoi qu'il soit arrivé : l'ancre d'origine, en ligne. */
    await ouvrirEditeur(page)
    const changee = await renommerLAncre(page, ANCRE_ORIGINE)
    if (changee || (await etat(page).textContent()) !== 'En ligne') {
      await publier(page).click()
      await attendreNotification(page, 'En ligne ✓')
    }
    await expect(etat(page)).toHaveText('En ligne')
  })

  test('le menu suit l’ancre renommée — après publication seulement', async ({
    page,
  }) => {
    await ouvrirEditeur(page)
    await renommerLAncre(page, ANCRE_ESSAI)

    /* Pas encore publié : le site — menu COMPRIS — est celui d'avant.
       Un menu qui pointerait déjà vers la nouvelle ancre viserait un
       identifiant absent de la page servie. */
    await page.goto('/')
    const menuAvant = await ouvrirLeMenu(page)
    await expect(menuAvant.locator(`a[href$="#${ANCRE_ORIGINE}"]`)).toHaveCount(1)
    await expect(menuAvant.locator(`a[href$="#${ANCRE_ESSAI}"]`)).toHaveCount(0)
    await expect(page.locator(`[id="${ANCRE_ORIGINE}"]`)).toHaveCount(1)

    await ouvrirEditeur(page)
    await publier(page).click()
    await attendreNotification(page, 'En ligne ✓')

    /* Publié : menu et page ont changé ENSEMBLE. */
    await page.goto('/')
    const menu = await ouvrirLeMenu(page)
    await expect(menu.locator(`a[href$="#${ANCRE_ORIGINE}"]`)).toHaveCount(0)
    const lien = menu.locator(`a[href$="#${ANCRE_ESSAI}"]`)
    await expect(lien).toHaveCount(1)
    const cible = page.locator(`[id="${ANCRE_ESSAI}"]`)
    await expect(cible).toHaveCount(1)

    /* Et le lien fait son travail, pile au bord haut de la section — la
       même règle que pour les ancres d'origine (voir accueil.spec). */
    await lien.click()
    await page.waitForTimeout(1200)
    const attendu = await cible.evaluate((section) => {
      const marge = parseFloat(getComputedStyle(section).paddingTop) || 0
      return Math.max(0, 80 - marge)
    })
    const position = await cible.boundingBox()
    expect(
      Math.abs((position?.y ?? 9999) - attendu),
      `Arrivée à ${position?.y}px, attendu ${attendu}px.`,
    ).toBeLessThanOrEqual(2)
  })
})

test.describe('Aperçu du brouillon', () => {
  test.afterEach(async ({ page }) => {
    await retablirAccueil(page)
  })

  test('bascule entre édition et aperçu sans rien publier', async ({ page }) => {
    await ouvrirEditeur(page)

    await page.getByRole('button', { name: 'Aperçu' }).click()
    await expect(page.getByRole('button', { name: 'Éditer' })).toBeVisible()

    /* L'aperçu ne publie rien : l'état ne bouge pas. */
    await expect(etat(page)).toHaveText('En ligne')

    await page.getByRole('button', { name: 'Éditer' }).click()
    await expect(page.getByRole('button', { name: 'Aperçu' })).toBeVisible()
  })
})
