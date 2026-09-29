import { expect, test } from '@playwright/test'

import { PHOTO } from '../support/fixtures'

/*
 * Les images et leur rideau d'apparition.
 *
 * Une image lointaine dans la page n'est demandée qu'à l'approche. Le
 * rideau, lui, s'ouvrait dès l'entrée dans l'écran — sur une image
 * encore en route : on voyait le flou, puis la photo apparaissait d'un
 * coup APRÈS l'animation. Le rideau doit attendre l'image, et s'ouvrir
 * sur elle.
 */
test.use({ storageState: { cookies: [], origins: [] } })

const section = (page: import('@playwright/test').Page) =>
  page.locator(`[id="${PHOTO.ancre}"]`)

test.describe('Images', () => {
  test('le rideau attend que l’image soit chargée', async ({ page }, infos) => {
    test.skip(
      infos.project.name !== 'desktop',
      'Le rideau est le même partout ; on le mesure une fois, avec le réseau ralenti.',
    )

    /* L'image met deux secondes à arriver : pendant ce temps, le rideau
       doit rester fermé, même l'image à l'écran. */
    let liberer: () => void = () => undefined
    const retenue = new Promise<void>((r) => (liberer = r))
    await page.route(/\/_next\/image\?|\/api\/media\/photo-e2e/, async (route) => {
      await retenue
      await route.continue()
    })

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const rideau = section(page).locator('[data-veil]')
    await rideau.scrollIntoViewIfNeeded()
    await page.waitForTimeout(1200)

    await expect(rideau, 'Le rideau s’est ouvert sur une image pas encore là.')
      .toHaveAttribute('data-veil', 'ferme')

    /* L'image arrive : le rideau s'ouvre, et sur la vraie image. */
    liberer()
    await expect(rideau).toHaveAttribute('data-veil', 'ouvert', { timeout: 10_000 })
    const img = section(page).locator('img')
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
      .toBe(true)
  })

  test('le rideau s’ouvre bien une fois l’image là', async ({ page }) => {
    await page.goto('/')
    const rideau = section(page).locator('[data-veil]')
    await rideau.scrollIntoViewIfNeeded()
    await expect(rideau).toHaveAttribute('data-veil', 'ouvert', { timeout: 10_000 })

    /* Ouvert pour de vrai : le découpage est retiré (l'image entière est
       visible), pas seulement un attribut posé. */
    await page.waitForTimeout(1600)
    const clip = await rideau
      .locator(':scope > div')
      .first()
      .evaluate((el) => getComputedStyle(el).clipPath)
    expect(clip).toMatch(/inset\(0(px|%)? 0(px|%)? 0(px|%)? 0(px|%)?\)|none/)
  })
})
