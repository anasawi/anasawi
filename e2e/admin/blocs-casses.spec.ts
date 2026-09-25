import { expect, test } from '@playwright/test'

import { PAGE_CASSEE } from '../support/fixtures'

/*
 * L'éditeur face à une section irrécupérable.
 *
 * Pendant à `e2e/public/blocs-casses.spec.ts` : le visiteur ne doit rien
 * voir, mais l'administratrice doit tout savoir. Sans cartouche, une
 * section disparaît de son canvas comme du site, et elle n'a aucun moyen
 * de comprendre pourquoi — ni même de s'apercevoir qu'il en manque une.
 */

/** Ouvre l'éditeur de la page semée avec deux sections cassées. */
async function ouvrirLaPageCassee(page: import('@playwright/test').Page) {
  await page.goto('/admin/pages', { waitUntil: 'domcontentloaded' })

  /* La liste nomme ses actions (« Modifier »), pas ses cibles : on part de
     la LIGNE qui porte le titre, sinon on clique sur une autre page. */
  const ligne = page
    .getByRole('listitem')
    .filter({ hasText: PAGE_CASSEE.titre })
  await expect(ligne).toHaveCount(1, { timeout: 20_000 })

  await ligne.getByRole('link', { name: 'Modifier' }).click()
  await page.waitForURL(/\/admin\/pages\/[0-9a-f-]{36}/, { timeout: 20_000 })
}

test.describe('Éditeur — diagnostic des blocs cassés', () => {
  test('nomme chaque section irrécupérable et son motif', async ({ page }) => {
    await ouvrirLaPageCassee(page)

    /* Une section par accident : type inconnu, puis payload invalide. */
    await expect(page.locator('[data-block-error]')).toHaveCount(2, {
      timeout: 20_000,
    })

    /* Le type fautif est écrit noir sur blanc : sans lui, le cartouche
       signale un problème sans dire QUOI réparer. */
    await expect(
      page.locator(`[data-block-error="${PAGE_CASSEE.typeInconnu}"]`),
    ).toHaveCount(1)

    await expect(
      page.getByText('Type inconnu au registre').first(),
    ).toBeVisible()
    await expect(page.getByText('Contenu invalide').first()).toBeVisible()
  })

  test('la section saine de la même page reste affichée', async ({ page }) => {
    await ouvrirLaPageCassee(page)

    await expect(page.getByText(PAGE_CASSEE.texteValide).first()).toBeVisible({
      timeout: 20_000,
    })
  })
})
