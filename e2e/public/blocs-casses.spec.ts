import { expect, test } from '@playwright/test'

import { BLOCS_CASSES } from '../support/fixtures'

/*
 * Blocs qui ne peuvent pas être rendus — le défaut le plus coûteux du
 * projet.
 *
 * Deux accidents empêchent le rendu d'une section : son type a disparu du
 * registre (bloc renommé, retiré), ou son payload ne satisfait plus son
 * schéma (champ ajouté, migration oubliée). Les deux rendaient `null` SANS
 * LA MOINDRE TRACE en production : la section s'évaporait, le reste de la
 * page se décalait, et rien n'indiquait la cause. Un hero entier a disparu
 * ainsi, et il a fallu démonter la chaîne de rendu jusqu'au HTML prérendu
 * pour comprendre qu'un type ne figurait plus au registre.
 *
 * Ce que ces tests exigent désormais :
 *   — la page RÉPOND, et ses sections saines s'affichent quand même ;
 *   — le visiteur ne voit aucun message technique ;
 *   — l'éditeur, lui, montre un cartouche nommant la section fautive.
 *
 * `reset-db.ts` sème exprès les deux accidents sur l'accueil — la seule
 * page du site.
 */

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Accueil portant des blocs cassés', () => {
  test('répond en 200 malgré deux sections irrécupérables', async ({ page }) => {
    const reponse = await page.goto('/')
    expect(
      reponse?.status(),
      'Une section cassée ne doit jamais faire tomber la page entière.',
    ).toBe(200)
  })

  test('affiche quand même les sections saines', async ({ page }) => {
    await page.goto('/')

    /* Le contenu valide passe : l'échec d'une section n'emporte pas ses
       voisines — celle juste avant, en particulier. */
    await expect(page.getByText(BLOCS_CASSES.texteValide)).toBeVisible()
  })

  test('garde son en-tête et son pied de page', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('contentinfo')).toBeVisible()
  })

  test('ne montre aucun message technique au visiteur', async ({ page }) => {
    await page.goto('/')

    /* Le cartouche de diagnostic est réservé à l'éditeur : un visiteur ne
       doit jamais lire un nom de type ni un mot d'erreur. */
    await expect(page.locator('[data-block-error]')).toHaveCount(0)
    await expect(page.getByText(BLOCS_CASSES.typeInconnu)).toHaveCount(0)
    await expect(
      page.getByText(/ne peut pas être affichée/i),
    ).toHaveCount(0)
  })

  test('les sections cassées ne laissent aucune coquille vide', async ({
    page,
  }) => {
    await page.goto('/')

    /* Huit sections en base, six rendables : le DOM doit en compter
       six, pas huit dont deux vides qui trouent la mise en page. */
    const sections = page.locator('main > section')
    await expect(sections).toHaveCount(BLOCS_CASSES.sectionsRendues)
  })
})
