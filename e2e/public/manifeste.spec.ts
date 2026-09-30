import { expect, test } from '@playwright/test'

/*
 * Le manifeste d'application et la page introuvable — deux surfaces que
 * personne ne regarde, et que les moteurs et les téléphones lisent.
 */
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Manifeste', () => {
  test('la page le déclare, et il répond avec des icônes qui existent', async ({
    page,
    request,
  }) => {
    await page.goto('/')

    const lien = page.locator('link[rel="manifest"]')
    await expect(lien).toHaveCount(1)
    const href = await lien.evaluate((l) => (l as HTMLLinkElement).href)

    const reponse = await request.get(href)
    expect(reponse.status()).toBe(200)

    const manifeste = (await reponse.json()) as {
      name?: string
      lang?: string
      theme_color?: string
      icons?: { src: string }[]
    }
    expect(manifeste.name).toBeTruthy()
    expect(manifeste.lang).toBe('fr')
    expect(manifeste.theme_color).toBe('#fbf8f2')

    /* Chaque icône déclarée doit être une vraie image : une icône en
       404 donne une pastille grise sur l'écran d'accueil. */
    expect(manifeste.icons?.length ?? 0).toBeGreaterThanOrEqual(2)
    for (const icone of manifeste.icons ?? []) {
      const image = await request.get(icone.src, { failOnStatusCode: false })
      expect(image.status(), icone.src).toBe(200)
      expect(image.headers()['content-type']).toContain('image')
    }
  })
})

test.describe('Page introuvable', () => {
  test('n’est pas indexable et porte un contenu principal', async ({ page }) => {
    await page.goto('/page-qui-nexiste-pas')

    /* Une 404 indexée est une page de plus offerte à Google, avec un
       titre qui n'a rien à voir avec le cabinet. */
    const robots = page.locator('meta[name="robots"]')
    await expect(robots).toHaveCount(1)
    expect(await robots.getAttribute('content')).toContain('noindex')

    /* Un `<main>` : le lecteur d'écran y saute directement. */
    await expect(page.getByRole('main')).toBeVisible()
  })
})
