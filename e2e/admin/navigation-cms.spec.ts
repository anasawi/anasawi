import { expect, test } from '@playwright/test'

/*
 * Se déplacer dans le CMS.
 *
 * Chaque écran charge ses données depuis Neon avant de s'afficher. Entre
 * le clic et l'arrivée, il DOIT se passer quelque chose à l'écran : un
 * bouton muet pendant une seconde est un bouton qu'on reclique, puis une
 * application qu'on croit en panne. Et « Voir le site » RAMÈNE sur le
 * site, dans le même onglet — jamais un autre onglet, jamais une autre
 * fenêtre : on va et vient entre le site et son administration.
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

  test('« Voir le site » revient sur le site, dans le même onglet', async ({
    page,
    context,
  }) => {
    await page.goto('/admin/medias', { waitUntil: 'domcontentloaded' })
    await expect(
      page.getByRole('heading', { name: 'Médias', level: 1 }),
    ).toBeVisible({ timeout: 20_000 })

    const ongletsAvant = context.pages().length
    await page
      .getByRole('navigation', { name: 'Raccourcis d’administration' })
      .getByRole('link', { name: 'Voir le site' })
      .click()

    /* Le site, ICI — pas dans un nouvel onglet. */
    await expect(page).toHaveURL(/\/$/, { timeout: 20_000 })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(context.pages().length).toBe(ongletsAvant)

    /* Et de là, la pilule du site ramène dans le CMS — même onglet. */
    const pilule = page.getByRole('navigation', {
      name: 'Raccourcis d’administration',
    })
    await expect(pilule.getByRole('link', { name: 'Modifier' })).toBeVisible({
      timeout: 10_000,
    })
    await pilule.getByRole('link', { name: 'Modifier' }).click()
    await expect(page).toHaveURL(/\/admin\//, { timeout: 20_000 })
    expect(context.pages().length).toBe(ongletsAvant)
  })

  test('le tableau de bord aussi revient sur le site, sans autre onglet', async ({
    page,
    context,
  }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' })
    const carte = page.getByRole('link', { name: /Aperçu/ })
    await expect(carte).toBeVisible({ timeout: 20_000 })

    const ongletsAvant = context.pages().length
    await carte.click()
    await expect(page).toHaveURL(/\/$/, { timeout: 20_000 })
    expect(context.pages().length).toBe(ongletsAvant)
  })

  test('depuis l’éditeur, « Voir le site » revient sur le site', async ({
    page,
    context,
  }) => {
    await page.goto('/admin/accueil', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: 'Publier' })).toBeVisible({
      timeout: 25_000,
    })

    const ongletsAvant = context.pages().length
    await page
      .getByRole('navigation', { name: 'Raccourcis d’administration' })
      .getByRole('link', { name: 'Voir le site' })
      .click()
    await expect(page).toHaveURL(/\/$/, { timeout: 20_000 })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(context.pages().length).toBe(ongletsAvant)
  })
})
