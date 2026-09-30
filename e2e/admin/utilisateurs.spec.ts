import { expect, test, type Page } from '@playwright/test'

import { attendreNotification } from '../support/aides'
import { COMPTE } from '../support/fixtures'

/*
 * Utilisateurs de l'administration.
 *
 * On invite une personne, on obtient un LIEN ; sur ce lien, elle choisit
 * son mot de passe ; elle peut alors se connecter — et le lien ne sert
 * plus. Tout le parcours est joué, de bout en bout, jusqu'à la connexion
 * de la personne invitée : c'est la seule preuve que l'invitation vaut
 * quelque chose.
 *
 * Le fichier crée sa propre personne et la supprime en sortant.
 */

const INVITEE = { nom: 'Invitée E2E', email: 'invitee@anasawi.test' }
const MOT_DE_PASSE = 'une-phrase-longue-pour-e2e'

async function ouvrirUtilisateurs(page: Page) {
  await page.goto('/admin/utilisateurs', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Utilisateurs', level: 1 })).toBeVisible({
    timeout: 20_000,
  })
}

const ligne = (page: Page, nom: string) => page.getByRole('listitem').filter({ hasText: nom })

/** Supprime la personne de test si elle existe — tolérant. */
async function supprimerSiPresente(page: Page) {
  await ouvrirUtilisateurs(page)
  const bouton = page.getByRole('button', { name: `Supprimer ${INVITEE.nom}` })
  if ((await bouton.count()) === 0) return
  await bouton.click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Supprimer', exact: true }).click()
  await attendreNotification(page, 'Utilisateur supprimé.')
  await expect(ligne(page, INVITEE.nom)).toHaveCount(0)
}

/** Invite la personne de test et rend le lien affiché. */
async function inviter(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Inviter une personne' }).click()
  const dialogue = page.getByRole('dialog')
  await dialogue.getByLabel('Nom').fill(INVITEE.nom)
  await dialogue.getByLabel('Adresse e-mail').fill(INVITEE.email)
  await dialogue.getByRole('button', { name: 'Créer le lien d’invitation' }).click()
  await attendreNotification(page, `${INVITEE.nom} a été ajouté·e`)

  const lien = page.getByRole('textbox', { name: 'Lien d’invitation' })
  await expect(lien).toBeVisible()
  const url = await lien.inputValue()
  expect(url).toMatch(/\/invitation\/[A-Za-z0-9_-]{20,}$/)
  await page.getByRole('button', { name: 'J’ai copié le lien' }).click()
  return url
}

test.describe('Utilisateurs', () => {
  test.beforeEach(async ({ page }) => {
    await supprimerSiPresente(page)
  })
  test.afterEach(async ({ page }) => {
    await supprimerSiPresente(page)
  })

  test('la liste montre les comptes, et le mien ne se supprime pas', async ({ page }) => {
    await ouvrirUtilisateurs(page)
    const moi = ligne(page, COMPTE.nom)
    await expect(moi).toHaveCount(1)
    await expect(moi.getByText('(vous)')).toBeVisible()
    await expect(moi.getByText('Actif')).toBeVisible()
    /* Se supprimer soi-même fermerait la porte derrière soi. */
    await expect(page.getByRole('button', { name: `Supprimer ${COMPTE.nom}` })).toHaveCount(0)
  })

  test('une adresse déjà prise est refusée, sous le champ', async ({ page }) => {
    await ouvrirUtilisateurs(page)
    await page.getByRole('button', { name: 'Inviter une personne' }).click()
    const dialogue = page.getByRole('dialog')
    await dialogue.getByLabel('Nom').fill('Doublon')
    await dialogue.getByLabel('Adresse e-mail').fill(COMPTE.email)
    await dialogue.getByRole('button', { name: 'Créer le lien d’invitation' }).click()
    await attendreNotification(page, 'Un compte existe déjà avec cette adresse e-mail.')
    await expect(dialogue.getByLabel('Adresse e-mail')).toHaveAttribute('aria-invalid', 'true')
    await expect(dialogue).toBeVisible()
  })

  test('inviter, choisir son mot de passe, se connecter — et le lien ne sert qu’une fois', async ({
    page,
    browser,
  }) => {
    test.slow()
    await ouvrirUtilisateurs(page)
    const url = await inviter(page)
    await expect(ligne(page, INVITEE.nom).getByText('Invitation en attente')).toBeVisible()

    /* La personne invitée n'a pas de session : un contexte vierge — sans
       l'état de connexion que la configuration donne à tous les autres. */
    const contexte = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const invitee = await contexte.newPage()
    try {
      await invitee.goto(url, { waitUntil: 'domcontentloaded' })
      await expect(invitee.getByRole('heading', { name: `Bienvenue, ${INVITEE.nom}.` })).toBeVisible({
        timeout: 20_000,
      })
      await expect(invitee.getByText(INVITEE.email)).toBeVisible()

      /* Trop court, puis deux mots différents : refusés, avec la raison. */
      await invitee.getByLabel('Mot de passe', { exact: true }).fill('court')
      await invitee.getByLabel('Le même, une seconde fois').fill('court')
      await invitee.getByRole('button', { name: 'Enregistrer mon mot de passe' }).click()
      await expect(invitee.getByRole('alert').filter({ hasText: /./ })).toContainText('au moins 10 caractères')

      await invitee.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE)
      await invitee.getByLabel('Le même, une seconde fois').fill(`${MOT_DE_PASSE}x`)
      await invitee.getByRole('button', { name: 'Enregistrer mon mot de passe' }).click()
      await expect(invitee.getByRole('alert').filter({ hasText: /./ })).toContainText('ne sont pas identiques')

      await invitee.getByLabel('Le même, une seconde fois').fill(MOT_DE_PASSE)
      await invitee.getByRole('button', { name: 'Enregistrer mon mot de passe' }).click()
      await expect(invitee.getByText('Votre mot de passe est enregistré.')).toBeVisible({ timeout: 15_000 })

      /* Le lien a servi : il ne vaut plus rien. */
      await invitee.goto(url, { waitUntil: 'domcontentloaded' })
      await expect(invitee.getByRole('heading', { name: 'Ce lien n’est plus valable.' })).toBeVisible()

      /* Et la connexion marche, avec CE mot de passe. */
      await invitee.goto('/login')
      await invitee.getByLabel('E-mail').fill(INVITEE.email)
      await invitee.getByLabel('Mot de passe').fill(MOT_DE_PASSE)
      await invitee.getByRole('button', { name: 'Se connecter' }).click()
      await invitee.waitForURL(/\/admin/, { timeout: 20_000 })
      await expect(invitee.getByRole('button', { name: `Compte — ${INVITEE.nom}` })).toBeVisible({
        timeout: 20_000,
      })
    } finally {
      await contexte.close()
    }

    /* Côté administration, la personne est devenue active. */
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(ligne(page, INVITEE.nom).getByText('Actif')).toBeVisible({ timeout: 20_000 })
  })

  test('avant le choix du mot de passe, la connexion est refusée', async ({ page, browser }) => {
    await ouvrirUtilisateurs(page)
    await inviter(page)

    const contexte = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const invitee = await contexte.newPage()
    try {
      await invitee.goto('/login')
      await invitee.getByLabel('E-mail').fill(INVITEE.email)
      await invitee.getByLabel('Mot de passe').fill('n-importe-quoi-de-long')
      await invitee.getByRole('button', { name: 'Se connecter' }).click()
      await expect(invitee.getByRole('alert').filter({ hasText: /./ })).toBeVisible({ timeout: 15_000 })
      await expect(invitee).toHaveURL(/\/login/)
    } finally {
      await contexte.close()
    }
  })

  test('« Nouveau lien » périme le précédent', async ({ page, browser }) => {
    await ouvrirUtilisateurs(page)
    const ancien = await inviter(page)

    await ligne(page, INVITEE.nom).getByRole('button', { name: 'Nouveau lien' }).click()
    const lien = page.getByRole('textbox', { name: 'Lien d’invitation' })
    await expect(lien).toBeVisible()
    const nouveau = await lien.inputValue()
    expect(nouveau).not.toBe(ancien)
    await page.getByRole('button', { name: 'J’ai copié le lien' }).click()

    const contexte = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const invitee = await contexte.newPage()
    try {
      await invitee.goto(ancien, { waitUntil: 'domcontentloaded' })
      await expect(invitee.getByRole('heading', { name: 'Ce lien n’est plus valable.' })).toBeVisible()
      await invitee.goto(nouveau, { waitUntil: 'domcontentloaded' })
      await expect(invitee.getByRole('heading', { name: `Bienvenue, ${INVITEE.nom}.` })).toBeVisible()
    } finally {
      await contexte.close()
    }
  })
})
