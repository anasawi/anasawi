import { expect, test, type Page } from '@playwright/test'

import { attendreNotification, persisteApresRechargement } from '../support/aides'
import { MESSAGE_VALIDE } from '../support/fixtures'

/*
 * Messages reçus.
 *
 * Le seul écran où arrive quelque chose que le CMS n'a pas produit : une
 * personne a écrit depuis le site, et attend une réponse. Un message qui
 * n'arriverait pas jusqu'ici serait perdu sans que personne le sache —
 * ni l'expéditrice, qui a vu « Message envoyé », ni Anne, qui ne voit
 * rien.
 *
 * Ce fichier envoie ses propres messages, avec un nom reconnaissable, et
 * les supprime ensuite.
 */

const EXPEDITEUR = 'Expéditrice de test E2E'

let compteur = 0

/** Dépose un message par l'API, comme le ferait le formulaire du site. */
async function envoyerUnMessage(page: Page, suffixe = '') {
  compteur += 1

  const reponse = await page.request.post('/api/contact', {
    headers: {
      'Content-Type': 'application/json',
      /* UNE ADRESSE PAR ENVOI. Le formulaire n'accepte que cinq messages
         par heure et par adresse : avec une adresse fixe, les derniers
         tests de ce fichier se heurtaient à un 429 — un échec qui ne
         parlait pas du tout de ce qu'ils vérifiaient. */
      'X-Forwarded-For': `198.51.100.${compteur % 250}`,
    },
    data: {
      ...MESSAGE_VALIDE,
      name: `${EXPEDITEUR}${suffixe}`,
      email: 'expeditrice@exemple-test.fr',
    },
    failOnStatusCode: false,
  })

  expect(reponse.status(), 'Le dépôt du message de test a échoué.').toBe(200)
}

async function ouvrirMessages(page: Page) {
  await page.goto('/admin/messages', { waitUntil: 'domcontentloaded' })
  await expect(
    page.getByRole('heading', { name: 'Messages' }).first(),
  ).toBeVisible({ timeout: 20_000 })
}

const ligne = (page: Page, nom: string) =>
  page.getByRole('listitem').filter({ hasText: nom })

/**
 * Le bouton qui DÉPLIE un message — et pas un autre.
 *
 * `.first()` sur « n'importe quel bouton » désignait tantôt le dépliage,
 * tantôt la commande de suppression, selon l'état de la ligne : un test
 * ouvrait alors une confirmation qu'il n'attendait pas, et restait
 * bloqué devant un dialogue qu'il ne savait pas fermer. Le dépliage
 * porte le nom de l'expéditrice EN TÊTE ; la suppression, en queue.
 */
const depliage = (entree: ReturnType<typeof ligne>) =>
  entree.getByRole('button', { name: new RegExp(`^${EXPEDITEUR}`) })

/** Confirme la suppression et attend que le dialogue se ferme. */
async function confirmerLaSuppression(page: Page) {
  const dialogue = page.getByRole('alertdialog')
  await dialogue.getByRole('button', { name: 'Supprimer', exact: true }).click()
  /* Tant que le dialogue est là, le reste de la page est inerte : y
     chercher quoi que ce soit attendrait pour rien. */
  await expect(dialogue).toBeHidden({ timeout: 20_000 })
}

async function supprimerLesMessagesDeTest(page: Page) {
  await ouvrirMessages(page)

  const entrees = ligne(page, EXPEDITEUR)
  for (let reste = await entrees.count(); reste > 0 && reste < 30; reste -= 1) {
    const premiere = entrees.first()
    await depliage(premiere).click()
    await premiere.getByRole('button', { name: /^Supprimer le message/ }).click()
    await confirmerLaSuppression(page)
    await expect(entrees).toHaveCount(reste - 1, { timeout: 15_000 })
  }
}

test.describe('Messages reçus', () => {
  test.afterEach(async ({ page }) => {
    await supprimerLesMessagesDeTest(page)
  })

  test('un message envoyé depuis le site arrive dans l’administration', async ({
    page,
  }) => {
    await envoyerUnMessage(page)
    await ouvrirMessages(page)

    /* La chaîne complète : formulaire public → base → écran d'Anne. */
    await expect(ligne(page, EXPEDITEUR)).toHaveCount(1)
    await expect(page.getByText('Nouveau').first()).toBeVisible()
  })

  test('l’ouvrir le marque comme lu, et ça tient', async ({ page }) => {
    await envoyerUnMessage(page)
    await ouvrirMessages(page)

    const entree = ligne(page, EXPEDITEUR).first()
    await depliage(entree).click()

    /* Le corps du message apparaît — dans le PARAGRAPHE déplié, pas dans
       l'aperçu tronqué du bouton, qui porte le même texte. */
    await expect(
      entree.getByRole('paragraph').filter({ hasText: MESSAGE_VALIDE.message }),
    ).toBeVisible()
    await expect(entree.getByText('Nouveau')).toHaveCount(0)

    await persisteApresRechargement(page, async () => {
      await expect(ligne(page, EXPEDITEUR).first().getByText('Nouveau'))
        .toHaveCount(0)
    })
  })

  test('on peut le remettre en non lu', async ({ page }) => {
    await envoyerUnMessage(page)
    await ouvrirMessages(page)

    const entree = ligne(page, EXPEDITEUR).first()
    await depliage(entree).click()

    /* L'ouverture écrit « lu » en base. Enchaîner sans attendre lancerait
       deux écritures concurrentes sur la même ligne, et la dernière
       arrivée gagnerait — pas forcément la dernière demandée. */
    await expect(entree.getByText('Nouveau')).toHaveCount(0)

    await entree.getByRole('button', { name: 'Marquer comme non lu' }).click()

    /* La pastille revient APRÈS la réponse du serveur : c'est l'accusé de
       réception, et recharger sans l'attendre annulerait la requête. */
    await expect(ligne(page, EXPEDITEUR).first().getByText('Nouveau'))
      .toBeVisible()

    /* Utile quand on ouvre un message sans avoir le temps d'y répondre :
       sans cela, il se perd dans la liste des lus. */
    await persisteApresRechargement(page, async () => {
      await expect(
        ligne(page, EXPEDITEUR).first().getByText('Nouveau'),
      ).toBeVisible()
    })
  })

  test('les coordonnées de l’expéditrice sont actionnables', async ({
    page,
  }) => {
    await envoyerUnMessage(page)
    await ouvrirMessages(page)

    const entree = ligne(page, EXPEDITEUR).first()
    await depliage(entree).click()

    /* Répondre en un clic, sans recopier une adresse à la main. */
    await expect(
      entree.getByRole('link', { name: 'Répondre par e-mail' }),
    ).toHaveAttribute('href', 'mailto:expeditrice@exemple-test.fr')

    await expect(
      entree.getByRole('link', { name: MESSAGE_VALIDE.phone }),
    ).toHaveAttribute('href', `tel:+33${MESSAGE_VALIDE.phone.replace(/\D/g, '').slice(1)}`)
  })

  test('la suppression demande confirmation et nomme l’expéditrice', async ({
    page,
  }) => {
    await envoyerUnMessage(page)
    await ouvrirMessages(page)

    const entree = ligne(page, EXPEDITEUR).first()
    await depliage(entree).click()
    await entree.getByRole('button', { name: /^Supprimer le message/ }).click()

    await expect(
      page
        .getByRole('alertdialog')
        .getByText(`Supprimer « le message de ${EXPEDITEUR} » ?`),
    ).toBeVisible()
  })

  test('supprimer un message le retire de la base', async ({ page }) => {
    await envoyerUnMessage(page)
    await ouvrirMessages(page)

    const entree = ligne(page, EXPEDITEUR).first()
    await depliage(entree).click()
    await entree.getByRole('button', { name: /^Supprimer le message/ }).click()
    await confirmerLaSuppression(page)
    await attendreNotification(page, 'Supprimé.')

    await persisteApresRechargement(page, async () => {
      await expect(ligne(page, EXPEDITEUR)).toHaveCount(0)
    })
  })

  test('les messages les plus récents viennent en premier', async ({ page }) => {
    await envoyerUnMessage(page, ' — un')
    await envoyerUnMessage(page, ' — deux')
    await ouvrirMessages(page)

    /* Un message récent noyé en bas de liste est un message auquel on
       répond trois jours trop tard. */
    const noms = await page.getByRole('listitem').allTextContents()
    const positionUn = noms.findIndex((t) => t.includes(`${EXPEDITEUR} — un`))
    const positionDeux = noms.findIndex((t) => t.includes(`${EXPEDITEUR} — deux`))

    expect(positionDeux).toBeGreaterThanOrEqual(0)
    expect(positionDeux).toBeLessThan(positionUn)
  })
})
