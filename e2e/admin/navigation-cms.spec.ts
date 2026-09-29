import { expect, test } from '@playwright/test'

/*
 * Se déplacer dans le CMS.
 *
 * Chaque écran charge ses données depuis Neon avant de s'afficher. Entre
 * le clic et l'arrivée, il DOIT se passer quelque chose à l'écran : un
 * bouton muet pendant une seconde est un bouton qu'on reclique, puis une
 * application qu'on croit en panne. Et « Voir le site » regarde, il ne
 * quitte pas : le CMS reste là où on l'a laissé.
 */

/** Retarde la réponse d'un écran : le temps de VOIR ce qui se passe
    pendant l'attente, au lieu de parier sur la lenteur de la base. */
async function ralentir(page: import('@playwright/test').Page, motif: string) {
  await page.route(motif, async (route) => {
    await new Promise((r) => setTimeout(r, 1200))
    await route.continue()
  })
}

const rail = (page: import('@playwright/test').Page) =>
  page.getByRole('navigation', { name: 'Administration' })

test.describe('Navigation dans le CMS', () => {
  test('un clic dans la barre latérale répond tout de suite', async ({
    page,
  }) => {
    await page.goto('/admin/medias', { waitUntil: 'domcontentloaded' })
    await expect(
      page.getByRole('heading', { name: 'Médias', level: 1 }),
    ).toBeVisible({ timeout: 20_000 })

    await ralentir(page, '**/admin/reglages*')
    await rail(page).getByRole('link', { name: 'Réglages' }).click()

    /* Immédiatement : le fil de progression court en haut de l'écran… */
    const fil = page.getByRole('progressbar', { name: 'Chargement de la page' })
    await expect(fil).toHaveAttribute('data-actif', '', { timeout: 500 })

    /* …et pendant l'attente, l'écran montre un squelette à la place du
       contenu — pas l'ancien écran figé, pas une page blanche. */
    await expect(
      page.getByRole('status', { name: 'Chargement' }),
    ).toBeVisible({ timeout: 2000 })

    /* Puis l'écran arrive, et le fil s'efface. */
    await expect(
      page.getByRole('heading', { name: 'Réglages', level: 1 }),
    ).toBeVisible({ timeout: 20_000 })
    await expect(fil).not.toHaveAttribute('data-actif', '')
  })

  test('« Voir le site » montre le site par-dessus le CMS, sans le quitter', async ({
    page,
  }) => {
    await page.goto('/admin/medias', { waitUntil: 'domcontentloaded' })
    await expect(
      page.getByRole('heading', { name: 'Médias', level: 1 }),
    ).toBeVisible({ timeout: 20_000 })

    await page
      .getByRole('navigation', { name: 'Raccourcis d’administration' })
      .getByRole('button', { name: 'Voir le site' })
      .click()

    const cadre = page.getByRole('dialog', { name: 'Le site en ligne' })
    await expect(cadre).toBeVisible()
    /* Pendant le chargement, on le dit ; puis le site est là. */
    const site = cadre.frameLocator('iframe[title="Le site en ligne"]')
    await expect(site.getByRole('heading', { level: 1 })).toBeVisible({
      timeout: 20_000,
    })
    await expect(cadre.getByRole('status', { name: 'Chargement du site' }))
      .toHaveCount(0)

    /* Le site dans le cadre ne porte PAS la pilule « Modifier » : on est
       déjà dans le CMS. */
    await expect(
      site.getByRole('navigation', { name: 'Raccourcis d’administration' }),
    ).toHaveCount(0)

    /* Le CMS n'a pas bougé : même adresse, même écran derrière. */
    expect(new URL(page.url()).pathname).toBe('/admin/medias')

    /* Échap referme, et on retrouve l'écran tel quel. */
    await page.keyboard.press('Escape')
    await expect(cadre).toBeHidden()
    await expect(
      page.getByRole('heading', { name: 'Médias', level: 1 }),
    ).toBeVisible()
  })

  test('depuis le cadre, « Ouvrir dans un onglet » ouvre le site à côté', async ({
    page,
    context,
  }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' })
    /* La carte « Aperçu » du tableau de bord ouvre le même cadre. */
    const carte = page.getByRole('button', { name: /Aperçu/ })
    await expect(carte).toBeVisible({ timeout: 20_000 })
    await carte.click()

    const cadre = page.getByRole('dialog', { name: 'Le site en ligne' })
    await expect(cadre).toBeVisible()

    const nouvelOnglet = context.waitForEvent('page')
    await cadre.getByRole('link', { name: 'Ouvrir dans un onglet' }).click()
    const site = await nouvelOnglet
    await site.waitForLoadState('domcontentloaded')
    expect(new URL(site.url()).pathname).toBe('/')
    expect(new URL(page.url()).pathname).toBe('/admin')
    await site.close()
  })

  test('dans l’éditeur aussi, « Voir le site » ne quitte pas le brouillon', async ({
    page,
  }) => {
    await page.goto('/admin/accueil', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: 'Publier' })).toBeVisible({
      timeout: 25_000,
    })

    await page
      .getByRole('navigation', { name: 'Raccourcis d’administration' })
      .getByRole('button', { name: 'Voir le site' })
      .click()

    const cadre = page.getByRole('dialog', { name: 'Le site en ligne' })
    await expect(cadre).toBeVisible()
    await expect(
      cadre
        .frameLocator('iframe[title="Le site en ligne"]')
        .getByRole('heading', { level: 1 }),
    ).toBeVisible({ timeout: 20_000 })

    await cadre.getByRole('button', { name: 'Fermer' }).click()
    await expect(cadre).toBeHidden()
    expect(new URL(page.url()).pathname).toBe('/admin/accueil')
    await expect(page.getByRole('button', { name: 'Publier' })).toBeVisible()
  })
})
