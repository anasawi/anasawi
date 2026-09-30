import { expect, test } from '@playwright/test'

/*
 * Le rideau d'ouverture — et surtout ce qu'il ne doit JAMAIS faire :
 * cacher le site à quelqu'un.
 *
 * Il jouait autrefois dans le HTML rendu par le serveur, et n'était levé
 * que par le JavaScript une fois hydraté : sur une connexion lente, un
 * visiteur regardait un rideau figé ; sans JavaScript, il ne voyait
 * jamais la page. Désormais la page est visible par défaut, et un script
 * de quelques octets demande le rideau seulement s'il doit jouer.
 */
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Rideau d’ouverture', () => {
  test('sans JavaScript, le rideau ne recouvre pas la page', async ({
    browser,
  }) => {
    const contexte = await browser.newContext({ javaScriptEnabled: false })
    const page = await contexte.newPage()
    await page.goto('/')

    /* Le rideau est bien dans le HTML (c'est le serveur qui le rend),
       mais masqué : sans script, personne ne le lèverait. */
    const rideau = page.locator('[data-anasawi-preloader]')
    await expect(rideau).toHaveCount(1)
    await expect(rideau).toBeHidden()

    /* Et la page se lit : le contenu est là, avec son titre principal.
       (Les lettres du titre attendent leur animation : on vérifie leur
       présence, pas leur opacité.) */
    await expect(page.locator('#contenu')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await contexte.close()
  })

  test('joue une fois par visite, puis laisse la page tranquille', async ({
    page,
  }) => {
    await page.goto('/')

    /* Premier chargement : le script d'amorçage a demandé le rideau. */
    expect(
      await page.evaluate(
        () => sessionStorage.getItem('anasawi:rideau'),
      ),
      'La visite doit être marquée après le premier chargement.',
    ).toBe('1')

    /* Rechargement : plus de rideau — ni l'attribut qui le montre, ni
       l'élément dans la page une fois hydratée. */
    await page.reload()
    await expect(page.locator('html')).not.toHaveAttribute('data-rideau', '1')
    await expect(page.locator('[data-anasawi-preloader]')).toHaveCount(0)

    /* Et la capsule est entrée : elle attendait le signal du rideau, qui
       doit être émis même quand il ne joue pas. */
    const capsule = await page.getByRole('banner').boundingBox()
    expect(capsule?.y ?? -9999).toBeGreaterThanOrEqual(0)
  })

  test('sous prefers-reduced-motion, aucun rideau', async ({ browser }) => {
    const contexte = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await contexte.newPage()
    await page.goto('/')

    await expect(page.locator('html')).not.toHaveAttribute('data-rideau', '1')
    await expect(page.locator('[data-anasawi-preloader]')).toBeHidden()
    await contexte.close()
  })
})
