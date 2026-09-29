import { expect, test, type Page } from '@playwright/test'

import { scene } from '../support/aides'

/*
 * Ordinateur, tablette, mobile dans l'éditeur.
 *
 * Ce qu'Anne voit en choisissant « Mobile » doit être ce qu'elle verrait
 * sur son téléphone une fois la page publiée — pas la version bureau
 * écrasée dans un rectangle étroit. Le seul juge honnête, c'est la
 * comparaison : le même titre, mesuré dans l'éditeur et sur le site
 * public ouvert à la même largeur, doit avoir la même taille.
 */

const LARGEURS = { Ordinateur: 1280, Tablette: 834, Mobile: 414 } as const

async function ouvrirEditeur(page: Page) {
  await page.goto('/admin/accueil', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Publier' })).toBeVisible({
    timeout: 25_000,
  })
  await expect(scene(page).getByRole('heading', { level: 1 })).toBeVisible({
    timeout: 20_000,
  })
}

/** Taille de police calculée du H1, et largeur de la fenêtre qui le rend. */
async function mesurerLeTitre(cible: ReturnType<typeof scene> | Page) {
  return cible.locator('h1').first().evaluate((h1) => ({
    taille: getComputedStyle(h1).fontSize,
    largeur: h1.ownerDocument.defaultView?.innerWidth ?? 0,
    /* Le style de bureau `lg:` s'applique-t-il ? (`lg` = 1024 px) */
    largeEcran: h1.ownerDocument.defaultView?.matchMedia('(min-width: 1024px)')
      .matches,
  }))
}

test.describe('Éditeur — écrans simulés', () => {
  for (const [nom, largeur] of Object.entries(LARGEURS)) {
    test(`« ${nom} » rend la page comme un écran de ${largeur} px`, async ({
      page,
      browser,
    }) => {
      await ouvrirEditeur(page)
      await page.getByRole('button', { name: nom }).click()

      /* La page de l'éditeur a une vraie fenêtre de cette largeur : les
         media queries et les unités `vw` s'y calculent dessus. */
      await expect
        .poll(async () => (await mesurerLeTitre(scene(page))).largeur)
        .toBe(largeur)
      const editeur = await mesurerLeTitre(scene(page))
      expect(editeur.largeEcran).toBe(largeur >= 1024)

      /* Le site public, ouvert à la même largeur, sans session : la
         référence de ce qu'un visiteur verra. */
      const contexte = await browser.newContext({
        viewport: { width: largeur, height: 900 },
        storageState: { cookies: [], origins: [] },
      })
      const site = await contexte.newPage()
      await site.goto('/')
      await expect(site.getByRole('heading', { level: 1 })).toBeVisible()
      const reference = await mesurerLeTitre(site)
      await contexte.close()

      expect(
        editeur.taille,
        `Titre à ${editeur.taille} dans l'éditeur, ${reference.taille} sur le site à ${largeur} px.`,
      ).toBe(reference.taille)
    })
  }

  test('la police du CMS ne déteint pas sur la page', async ({ page }) => {
    await ouvrirEditeur(page)
    /* Le CMS se lit en 13 px ; la page, en 16 px comme sur le site. Avant
       le cadre, la page héritait des 13 px de l'admin. */
    const taille = await scene(page)
      .locator('body')
      .evaluate((b) => getComputedStyle(b).fontSize)
    expect(taille).toBe('16px')
  })

  test('on sélectionne et on survole toujours une section dans la page', async ({
    page,
  }) => {
    await ouvrirEditeur(page)

    /* Le cadre ne coupe pas l'édition : un clic dans la page sélectionne
       la section (l'inspecteur s'ouvre), et le survol la nomme. */
    const sections = scene(page).locator('[data-block-root]')
    await expect(sections.first()).toBeVisible()
    await sections.nth(1).hover()
    await expect(page.getByRole('button', { name: 'Modifier' })).toBeVisible()

    await sections.nth(1).click({ position: { x: 10, y: 10 } })
    await expect(page.getByRole('button', { name: 'Options avancées' }))
      .toBeVisible()

    /* Échap depuis la page — le clavier est dans le cadre — referme. */
    await sections.nth(1).click({ position: { x: 10, y: 10 } })
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Options avancées' }))
      .toHaveCount(0)
  })
})
