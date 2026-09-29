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

  test('« Voir le site » ouvre le site à côté, sans quitter le CMS', async ({
    page,
    context,
  }) => {
    await page.goto('/admin/medias', { waitUntil: 'domcontentloaded' })
    await expect(
      page.getByRole('heading', { name: 'Médias', level: 1 }),
    ).toBeVisible({ timeout: 20_000 })

    const nouvelOnglet = context.waitForEvent('page')
    await page
      .getByRole('navigation', { name: 'Raccourcis d’administration' })
      .getByRole('link', { name: 'Voir le site' })
      .click()

    const site = await nouvelOnglet
    await site.waitForLoadState('domcontentloaded')
    expect(new URL(site.url()).pathname).toBe('/')

    /* Le CMS n'a pas bougé : même adresse, même écran. */
    expect(new URL(page.url()).pathname).toBe('/admin/medias')
    await expect(
      page.getByRole('heading', { name: 'Médias', level: 1 }),
    ).toBeVisible()
    await site.close()
  })

  test('le tableau de bord aussi ouvre le site à côté', async ({
    page,
    context,
  }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' })
    /* La carte « Aperçu » — pas la pilule du bas, qui dit aussi « Voir le
       site » et que le test précédent couvre. */
    const carte = page.getByRole('link', { name: /Aperçu/ })
    await expect(carte).toBeVisible({ timeout: 20_000 })

    const nouvelOnglet = context.waitForEvent('page')
    await carte.click()
    const site = await nouvelOnglet
    await site.waitForLoadState('domcontentloaded')
    expect(new URL(site.url()).pathname).toBe('/')
    expect(new URL(page.url()).pathname).toBe('/admin')
    await site.close()
  })
})
