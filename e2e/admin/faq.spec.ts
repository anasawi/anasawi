import { expect, test, type Page } from '@playwright/test'

import {
  attendreNotification,
  ouvrirAdmin,
  persisteApresRechargement,
} from '../support/aides'
import { CARACTERES_SPECIAUX, QUESTIONS, TROP_LONG } from '../support/fixtures'

/*
 * Questions fréquentes.
 *
 * Elles ne servent pas qu'à rassurer : elles alimentent le JSON-LD
 * `FAQPage`, donc ce qui s'affiche sous le lien du site dans Google. Une
 * question enregistrée qui n'arrive pas jusqu'au site est une occasion
 * perdue deux fois.
 *
 * Même règle que pour les accompagnements : ce fichier ne touche qu'à ce
 * qu'il a créé. Les questions du jeu initial servent d'ancrage aux suites
 * publiques.
 */

const NOUVELLE = {
  question: 'Combien de temps dure un accompagnement (test) ?',
  reponse:
    'Cela dépend de ce que vous traversez. Certaines personnes viennent quelques mois, d’autres plus longtemps.',
}

const MODIFIEE = 'Question modifiée par les tests ?'

const ligne = (page: Page, question: string) =>
  page.getByRole('listitem').filter({ hasText: question })

/** Ouvre la liste et attend qu'elle soit RÉELLEMENT rendue. */
async function listeChargee(page: Page) {
  await page.goto('/admin/faq', { waitUntil: 'domcontentloaded' })
  await expect(
    page.getByRole('button', { name: `Supprimer ${QUESTIONS[0].question}` }),
  ).toHaveCount(1, { timeout: 20_000 })
}

async function supprimerSiPresente(page: Page, question: string) {
  await listeChargee(page)

  const bouton = page.getByRole('button', { name: `Supprimer ${question}` })
  for (let reste = await bouton.count(); reste > 0 && reste < 20; reste -= 1) {
    await bouton.first().click()
    await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
    await expect(bouton).toHaveCount(reste - 1, { timeout: 15_000 })
  }
}

async function ouvrirNouvelle(page: Page) {
  await page.getByRole('button', { name: 'Nouvelle question' }).click()
  const dialogue = page.getByRole('dialog')
  await expect(
    dialogue.getByRole('heading', { name: 'Nouvelle question' }),
  ).toBeVisible()
  return dialogue
}

test.describe('FAQ — création', () => {
  test.afterEach(async ({ page }) => {
    await supprimerSiPresente(page, NOUVELLE.question)
  })

  test('une question créée apparaît, et survit au rechargement', async ({
    page,
  }) => {
    await ouvrirAdmin(page, '/admin/faq', 'Questions fréquentes')

    const dialogue = await ouvrirNouvelle(page)
    await dialogue.getByLabel('Question').fill(NOUVELLE.question)
    await dialogue.getByLabel('Réponse').fill(NOUVELLE.reponse)
    await dialogue.getByRole('button', { name: 'Enregistrer' }).click()

    await attendreNotification(page, 'Question enregistrée.')
    await expect(ligne(page, NOUVELLE.question)).toHaveCount(1)

    await persisteApresRechargement(page, async () => {
      await expect(ligne(page, NOUVELLE.question)).toHaveCount(1)
    })
  })

  test('une question sans réponse n’est pas enregistrable', async ({ page }) => {
    await ouvrirAdmin(page, '/admin/faq', 'Questions fréquentes')

    const dialogue = await ouvrirNouvelle(page)
    const enregistrer = dialogue.getByRole('button', { name: 'Enregistrer' })

    await expect(enregistrer).toBeDisabled()

    /* Une question sans réponse n'aide personne — et Google l'afficherait. */
    await dialogue.getByLabel('Question').fill(NOUVELLE.question)
    await expect(enregistrer).toBeDisabled()

    await dialogue.getByLabel('Réponse').fill('   ')
    await expect(enregistrer).toBeDisabled()
  })

  test('une question démesurée est refusée par le serveur', async ({ page }) => {
    await ouvrirAdmin(page, '/admin/faq', 'Questions fréquentes')

    const dialogue = await ouvrirNouvelle(page)
    await dialogue.getByLabel('Question').fill(TROP_LONG)
    await dialogue.getByLabel('Réponse').fill(NOUVELLE.reponse)
    await dialogue.getByRole('button', { name: 'Enregistrer' }).click()

    /* 300 caractères maximum côté schéma. */
    await attendreNotification(page, 'Formulaire invalide.')
  })

  test('les caractères spéciaux sont conservés tels quels', async ({ page }) => {
    await ouvrirAdmin(page, '/admin/faq', 'Questions fréquentes')

    const dialogue = await ouvrirNouvelle(page)
    await dialogue.getByLabel('Question').fill(NOUVELLE.question)
    await dialogue.getByLabel('Réponse').fill(CARACTERES_SPECIAUX)
    await dialogue.getByRole('button', { name: 'Enregistrer' }).click()
    await attendreNotification(page, 'Question enregistrée.')

    /* Une balise doit rester du TEXTE, sur le site comme dans le CMS :
       ni exécutée, ni échappée deux fois. */
    await persisteApresRechargement(page, async () => {
      await page
        .getByRole('button', { name: `Modifier « ${NOUVELLE.question} »` })
        .click()
      await expect(page.getByLabel('Réponse')).toHaveValue(CARACTERES_SPECIAUX)
    })
  })

  test('annuler ne crée rien', async ({ page }) => {
    await ouvrirAdmin(page, '/admin/faq', 'Questions fréquentes')

    const dialogue = await ouvrirNouvelle(page)
    await dialogue.getByLabel('Question').fill(NOUVELLE.question)
    await dialogue.getByLabel('Réponse').fill(NOUVELLE.reponse)
    await dialogue.getByRole('button', { name: 'Annuler' }).click()

    await persisteApresRechargement(page, async () => {
      await expect(ligne(page, NOUVELLE.question)).toHaveCount(0)
    })
  })
})

test.describe('FAQ — modification, visibilité, suppression', () => {
  test.beforeEach(async ({ page }) => {
    await supprimerSiPresente(page, NOUVELLE.question)
    await supprimerSiPresente(page, MODIFIEE)

    const dialogue = await ouvrirNouvelle(page)
    await dialogue.getByLabel('Question').fill(NOUVELLE.question)
    await dialogue.getByLabel('Réponse').fill(NOUVELLE.reponse)
    await dialogue.getByRole('button', { name: 'Enregistrer' }).click()
    await attendreNotification(page, 'Question enregistrée.')
  })

  test.afterEach(async ({ page }) => {
    await supprimerSiPresente(page, NOUVELLE.question)
    await supprimerSiPresente(page, MODIFIEE)
  })

  test('modifier une question change la base', async ({ page }) => {
    await page
      .getByRole('button', { name: `Modifier « ${NOUVELLE.question} »` })
      .click()

    const dialogue = page.getByRole('dialog')
    await dialogue.getByLabel('Question').fill(MODIFIEE)
    await dialogue.getByRole('button', { name: 'Enregistrer' }).click()
    await attendreNotification(page, 'Question enregistrée.')

    await persisteApresRechargement(page, async () => {
      await expect(ligne(page, MODIFIEE)).toHaveCount(1)
      await expect(ligne(page, NOUVELLE.question)).toHaveCount(0)
    })
  })

  test('masquer une question la retire du site, pas de l’administration', async ({
    page,
  }) => {
    /* Sens aller : la question créée est déjà sur le site. Sans cette
       assertion, la suivante passerait toute seule. */
    await page.goto('/')
    await expect(page.getByText(NOUVELLE.question)).toHaveCount(1)

    await ouvrirAdmin(page, '/admin/faq', 'Questions fréquentes')
    const interrupteur = page.getByRole('switch', {
      name: `Afficher « ${NOUVELLE.question} »`,
    })
    await interrupteur.click()

    /* L'interrupteur ne bascule qu'après la réponse du serveur : c'est
       lui, l'accusé de réception. Recharger sans l'attendre annulerait la
       requête en vol. */
    await expect(interrupteur).not.toBeChecked()

    await persisteApresRechargement(page, async () => {
      await expect(
        page.getByRole('switch', { name: `Afficher « ${NOUVELLE.question} »` }),
      ).not.toBeChecked()
    })

    await page.goto('/')
    await expect(page.getByText(NOUVELLE.question)).toHaveCount(0)
  })

  test('la confirmation de suppression nomme la question', async ({ page }) => {
    await page
      .getByRole('button', { name: `Supprimer ${NOUVELLE.question}` })
      .click()

    await expect(
      page
        .getByRole('alertdialog')
        .getByText(`Supprimer « ${NOUVELLE.question} » ?`),
    ).toBeVisible()
  })

  test('annuler la suppression conserve la question', async ({ page }) => {
    await page
      .getByRole('button', { name: `Supprimer ${NOUVELLE.question}` })
      .click()
    await page.getByRole('button', { name: 'Annuler' }).click()

    await persisteApresRechargement(page, async () => {
      await expect(ligne(page, NOUVELLE.question)).toHaveCount(1)
    })
  })

  test('confirmer la suppression la retire de la base', async ({ page }) => {
    await page
      .getByRole('button', { name: `Supprimer ${NOUVELLE.question}` })
      .click()
    await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
    await attendreNotification(page, 'Supprimé.')

    await persisteApresRechargement(page, async () => {
      await expect(ligne(page, NOUVELLE.question)).toHaveCount(0)
      /* Les questions du jeu initial sont intactes. */
      for (const q of QUESTIONS) {
        await expect(ligne(page, q.question)).toHaveCount(1)
      }
    })
  })
})

test.describe('FAQ — chaque commande nomme sa question', () => {
  test('les libellés distinguent les lignes entre elles', async ({ page }) => {
    await ouvrirAdmin(page, '/admin/faq', 'Questions fréquentes')

    /*
     * Dix boutons « Modifier » identiques ne disent rien à qui navigue au
     * lecteur d'écran. Chaque commande doit nommer la question sur
     * laquelle elle agit — sans quoi la liste est inutilisable au clavier.
     */
    for (const q of QUESTIONS) {
      await expect(
        page.getByRole('button', { name: `Modifier « ${q.question} »` }),
      ).toHaveCount(1)
      await expect(
        page.getByRole('switch', { name: `Afficher « ${q.question} »` }),
      ).toHaveCount(1)
      await expect(
        page.getByRole('button', { name: `Supprimer ${q.question}` }),
      ).toHaveCount(1)
    }
  })
})
