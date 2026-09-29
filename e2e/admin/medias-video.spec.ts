import { expect, test } from '@playwright/test'

import { attendreNotification } from '../support/aides'

/*
 * Ajouter une vidéo depuis l'écran Médias — la chaîne entière.
 *
 * Un fichier vidéo choisi depuis le téléphone ou l'ordinateur d'Anne est
 * RECOMPRESSÉ dans son navigateur (durée bornée, taille bornée, sans
 * son), envoyé, enregistré dans la médiathèque, et montré comme une
 * vidéo — pas comme une image cassée. Ce test le fait vraiment, avec un
 * vrai fichier, et laisse la médiathèque comme il l'a trouvée.
 */

const DESCRIPTION = 'Vidéo d’essai E2E — à supprimer'

test.describe('Médias — vidéo', () => {
  test('un fichier vidéo est recompressé, envoyé et rangé comme vidéo', async ({
    page,
  }) => {
    await page.goto('/admin/medias', { waitUntil: 'domcontentloaded' })
    await expect(
      page.getByRole('heading', { name: 'Médias', level: 1 }),
    ).toBeVisible({ timeout: 20_000 })

    await page.getByRole('button', { name: 'Une vidéo' }).click()
    /* Le champ accepte les vidéos — la caméra et la pellicule, sur un
       téléphone — et pas seulement des images. */
    const champ = page.locator('#upload-file-video')
    await expect(champ).toHaveAttribute('accept', /video\/\*/)

    await champ.setInputFiles('e2e/support/fichiers/boucle.webm')
    await page.getByLabel(/^Description/).fill(DESCRIPTION)

    const envois: { size: number; type: string }[] = []
    page.on('request', (r) => {
      if (r.url().endsWith('/api/upload') && r.method() === 'POST') {
        const corps = r.postDataBuffer()
        envois.push({ size: corps?.byteLength ?? 0, type: r.headers()['content-type'] ?? '' })
      }
    })

    await page.getByRole('button', { name: 'Ajouter' }).click()
    /* La recompression est en temps réel : trois secondes de vidéo,
       trois secondes d'attente, plus l'envoi. */
    await attendreNotification(page, 'Vidéo ajoutée.')

    /* Ce qui est parti au serveur tient sous la limite d'envoi. */
    expect(envois.length).toBe(1)
    expect(envois[0]!.size).toBeLessThan(4 * 1024 * 1024)
    expect(envois[0]!.size).toBeGreaterThan(1000)

    /* Dans la médiathèque, c'est une VIDÉO : un lecteur muet, pas une
       image cassée. */
    const vignette = page.locator('li[title="' + DESCRIPTION + '"]')
    await expect(vignette).toHaveCount(1)
    const video = vignette.locator('video')
    await expect(video).toHaveCount(1)
    await expect(video).toHaveAttribute('src', /\/api\/media\/.+\.(webm|mp4)$/)
    expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true)

    /* Et le fichier servi est bien une vidéo, par plages d'octets. */
    const src = (await video.getAttribute('src'))!
    const reponse = await page.request.get(src, { headers: { Range: 'bytes=0-1' } })
    expect(reponse.status()).toBe(206)
    expect(reponse.headers()['content-type']).toMatch(/^video\//)

    /* Rangement : on la supprime, et elle disparaît. */
    await vignette.hover()
    await vignette.getByRole('button', { name: 'Supprimer' }).click()
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Supprimer', exact: true })
      .click()
    await expect(vignette).toHaveCount(0, { timeout: 15_000 })
  })

  test('sans description, rien ne part', async ({ page }) => {
    await page.goto('/admin/medias', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Une vidéo' }).click()
    await page.locator('#upload-file-video').setInputFiles('e2e/support/fichiers/boucle.webm')

    let parti = false
    page.on('request', (r) => {
      if (r.url().endsWith('/api/upload')) parti = true
    })
    await page.getByRole('button', { name: 'Ajouter' }).click()
    await attendreNotification(page, 'La description de la vidéo est obligatoire.')
    expect(parti, 'Un envoi sans description ne doit jamais partir.').toBe(false)
  })
})
