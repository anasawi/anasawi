import { expect, test } from '@playwright/test'

import { VIDEO_CINEMA } from '../support/fixtures'

/*
 * La vidéo « cinéma ».
 *
 * Une image qui bouge, pas un lecteur : muette, en boucle, sans commande
 * ni pause possible, et un cadre qui s'ouvre jusqu'aux bords de l'écran
 * quand on descend. Ce fichier vérifie ce que le visiteur obtient — pas
 * ce que le code déclare : la vidéo JOUE vraiment, le cadre S'OUVRE
 * vraiment, et rien ne permet de l'arrêter.
 */
test.use({ storageState: { cookies: [], origins: [] } })

const section = (page: import('@playwright/test').Page) =>
  page.locator(`[id="${VIDEO_CINEMA.ancre}"]`)

test.describe('Vidéo — Cinéma', () => {
  test('est muette, en boucle, sans commande, et le clic ne l’arrête pas', async ({
    page,
  }) => {
    await page.goto('/')
    const video = section(page).locator('video')
    await expect(video).toHaveCount(1)

    const etat = await video.evaluate((v: HTMLVideoElement) => ({
      muted: v.muted,
      loop: v.loop,
      controls: v.controls,
      playsInline: v.playsInline,
      pip: v.disablePictureInPicture,
      pointeur: getComputedStyle(v).pointerEvents,
      src: v.currentSrc || v.src,
    }))
    expect(etat.muted, 'Pas de son.').toBe(true)
    expect(etat.loop, 'En boucle.').toBe(true)
    expect(etat.controls, 'Aucune commande.').toBe(false)
    expect(etat.playsInline, 'Lecture en place sur mobile.').toBe(true)
    expect(etat.pip, 'Pas d’image-dans-l’image.').toBe(true)
    expect(etat.pointeur, 'Le clic passe à travers : rien à cliquer.').toBe('none')
    expect(etat.src).toContain(`/api/media/${VIDEO_CINEMA.cle}`)
  })

  test('joue réellement une fois à l’écran', async ({ page }) => {
    await page.goto('/')
    const video = section(page).locator('video')
    await video.scrollIntoViewIfNeeded()

    /* Pas « `paused` est faux » : `currentTime` avance. Un lecteur bloqué
       sur une image se dirait en lecture. */
    await expect
      .poll(
        () => video.evaluate((v: HTMLVideoElement) => v.currentTime),
        { timeout: 10_000, message: 'La vidéo ne joue pas.' },
      )
      .toBeGreaterThan(0.3)
    const erreur = await video.evaluate((v: HTMLVideoElement) => v.error?.code ?? 0)
    expect(erreur, 'Le navigateur signale une erreur de lecture.').toBe(0)
  })

  test('le serveur sert la vidéo par plages d’octets', async ({ request }) => {
    /* Safari refuse de lire une vidéo sans réponse 206 aux `Range` : il
       demande d'abord deux octets, et attend un 206 avec Content-Range. */
    const reponse = await request.get(`/api/media/${VIDEO_CINEMA.cle}`, {
      headers: { Range: 'bytes=0-1' },
    })
    expect(reponse.status()).toBe(206)
    expect(reponse.headers()['content-range']).toMatch(/^bytes 0-1\/\d+$/)
    expect(reponse.headers()['accept-ranges']).toBe('bytes')
    expect((await reponse.body()).byteLength).toBe(2)
  })

  test('le cadre s’ouvre jusqu’aux bords en descendant', async ({ page }) => {
    await page.goto('/')
    const cadre = section(page).locator('video').locator('..').locator('..')
    const ecran = page.viewportSize()!

    /* Cadre au bas de l'écran : resserré, coins doux. */
    await cadre.evaluate((el, hauteur) => {
      const y = el.getBoundingClientRect().top + window.scrollY
      window.scrollTo({ top: y - hauteur + 40, behavior: 'instant' })
    }, ecran.height)
    await page.waitForTimeout(400)
    const entree = await cadre.evaluate((el) => ({
      largeur: el.getBoundingClientRect().width,
      rayon: parseFloat(getComputedStyle(el).borderRadius),
    }))
    expect(entree.largeur, 'À l’entrée, le cadre est resserré.').toBeLessThan(
      ecran.width * 0.75,
    )
    expect(entree.rayon, 'À l’entrée, les coins sont doux.').toBeGreaterThan(20)

    /* Cadre au centre de l'écran : pleine largeur, coins droits. */
    await cadre.evaluate((el, hauteur) => {
      const r = el.getBoundingClientRect()
      window.scrollTo({
        top: r.top + window.scrollY - hauteur / 2 + r.height / 2,
        behavior: 'instant',
      })
    }, ecran.height)
    await page.waitForTimeout(400)
    const centre = await cadre.evaluate((el) => ({
      largeur: el.getBoundingClientRect().width,
      rayon: parseFloat(getComputedStyle(el).borderRadius),
    }))
    expect(centre.largeur, 'Au centre, le cadre touche les bords.').toBeGreaterThan(
      ecran.width - 2,
    )
    expect(centre.rayon, 'Au centre, les coins sont droits.').toBeLessThan(1)
  })
})
