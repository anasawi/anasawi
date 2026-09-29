import { expect, test } from '@playwright/test'

import { scene } from '../support/aides'
import { BLOCS_CASSES } from '../support/fixtures'

/*
 * L'éditeur face à une section irrécupérable.
 *
 * Pendant à `e2e/public/blocs-casses.spec.ts` : le visiteur ne doit rien
 * voir, mais l'administratrice doit tout savoir. Sans cartouche, une
 * section disparaît de son canvas comme du site, et elle n'a aucun moyen
 * de comprendre pourquoi — ni même de s'apercevoir qu'il en manque une.
 */

async function ouvrirEditeur(page: import('@playwright/test').Page) {
  await page.goto('/admin/accueil', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Publier' })).toBeVisible({
    timeout: 25_000,
  })
}

test.describe('Éditeur — diagnostic des blocs cassés', () => {
  test('nomme chaque section irrécupérable et son motif', async ({ page }) => {
    await ouvrirEditeur(page)
    const page_ = scene(page)

    /* Une section par accident : type inconnu, puis payload invalide. */
    await expect(page_.locator('[data-block-error]')).toHaveCount(
      BLOCS_CASSES.sectionsCassees,
      { timeout: 20_000 },
    )

    /* Le type fautif est écrit noir sur blanc : sans lui, le cartouche
       signale un problème sans dire QUOI réparer. */
    await expect(
      page_.locator(`[data-block-error="${BLOCS_CASSES.typeInconnu}"]`),
    ).toHaveCount(1)

    await expect(
      page_.getByText('Type inconnu au registre').first(),
    ).toBeVisible()
    await expect(page_.getByText('Contenu invalide').first()).toBeVisible()
  })

  test('les sections saines de la même page restent affichées', async ({
    page,
  }) => {
    await ouvrirEditeur(page)

    await expect(
      scene(page).getByText(BLOCS_CASSES.texteValide).first(),
    ).toBeVisible({ timeout: 20_000 })
  })
})
