import { expect, test, type Page } from '@playwright/test'

import { MESSAGE_VALIDE } from '../support/fixtures'

/*
 * Le formulaire de contact, vu du navigateur.
 *
 * C'est la seule chose qu'une visiteuse ÉCRIT sur ce site, et le seul
 * chemin par lequel elle entre en relation avec la praticienne. Un champ
 * qui refuse sans dire pourquoi, un envoi qui part deux fois, une erreur
 * serveur affichée en langage technique : chacun coûte un rendez-vous.
 *
 * Le contrat de validation lui-même (bornes, adresses, consentement) est
 * vérifié côté serveur dans `e2e/api/contact.spec.ts` ; ici on vérifie ce
 * que la personne VOIT.
 *
 * Un seul test envoie réellement : le limiteur compte cinq envois par
 * heure et par adresse, et les trois profils d'écran partagent l'adresse
 * du navigateur.
 */
test.use({ storageState: { cookies: [], origins: [] } })

async function ouvrirLeFormulaire(page: Page) {
  await page.goto('/')
  const formulaire = page.locator('#contact form')
  await expect(formulaire).toBeVisible()
  return formulaire
}

type Champs = {
  name: string
  email: string
  phone: string
  message: string
  consent: boolean
}

async function remplir(page: Page, champs: Partial<Champs> = {}) {
  const valeurs: Champs = { ...MESSAGE_VALIDE, ...champs }
  await page.getByLabel('Nom', { exact: true }).fill(valeurs.name)
  await page.getByLabel('E-mail').fill(valeurs.email)
  await page.getByLabel('Téléphone').fill(valeurs.phone)
  await page.getByLabel('Votre message').fill(valeurs.message)
  if (valeurs.consent) {
    await page.getByRole('checkbox').check()
  }
}

const envoyer = (page: Page) =>
  page.getByRole('button', { name: 'Envoyer le message' })

test.describe('Formulaire de contact — validation devant la personne', () => {
  test('un envoi à vide signale les champs manquants sans appeler le serveur', async ({
    page,
  }) => {
    await ouvrirLeFormulaire(page)

    /* Aucune requête ne doit partir : la validation est locale. */
    let appels = 0
    await page.route('**/api/contact', async (route) => {
      appels += 1
      await route.abort()
    })

    await envoyer(page).click()

    await expect(page.getByText('Merci d’indiquer votre nom.')).toBeVisible()
    await expect(page.getByText('Adresse e-mail invalide.')).toBeVisible()
    await expect(
      page.getByText(/Merci de détailler un peu votre demande/),
    ).toBeVisible()
    await expect(
      page.getByText('Merci d’accepter le traitement de vos données.'),
    ).toBeVisible()

    expect(appels, 'Un formulaire vide ne doit pas atteindre le serveur.').toBe(0)
  })

  test('chaque erreur est rattachée à son champ', async ({ page }) => {
    await ouvrirLeFormulaire(page)
    await envoyer(page).click()

    /* Sans `aria-describedby`, une personne au lecteur d'écran entend
       « Adresse e-mail invalide » sans savoir quel champ est en cause. */
    const courriel = page.getByLabel('E-mail')
    await expect(courriel).toHaveAttribute('aria-invalid', 'true')
    await expect(courriel).toHaveAttribute('aria-describedby', 'email-error')
    await expect(page.locator('#email-error')).toHaveText(
      'Adresse e-mail invalide.',
    )
  })

  test('une adresse mal formée est refusée avant l’envoi', async ({ page }) => {
    await ouvrirLeFormulaire(page)
    await remplir(page, { email: 'pas-une-adresse' })
    await envoyer(page).click()

    await expect(page.getByText('Adresse e-mail invalide.')).toBeVisible()
    await expect(page.getByText('Message envoyé.')).toHaveCount(0)
  })

  test('un message trop court est refusé avant l’envoi', async ({ page }) => {
    await ouvrirLeFormulaire(page)
    await remplir(page, { message: 'Bonjour' })
    await envoyer(page).click()

    await expect(
      page.getByText(/Merci de détailler un peu votre demande/),
    ).toBeVisible()
  })

  test('le consentement non coché bloque l’envoi', async ({ page }) => {
    await ouvrirLeFormulaire(page)
    await remplir(page, { consent: false })
    await envoyer(page).click()

    await expect(
      page.getByText('Merci d’accepter le traitement de vos données.'),
    ).toBeVisible()
  })

  test('corriger un champ fait disparaître son erreur', async ({ page }) => {
    await ouvrirLeFormulaire(page)
    await envoyer(page).click()
    await expect(page.getByText('Adresse e-mail invalide.')).toBeVisible()

    await page.route('**/api/contact', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) }),
    )
    await remplir(page)
    await envoyer(page).click()

    await expect(page.getByText('Adresse e-mail invalide.')).toHaveCount(0)
  })
})

test.describe('Formulaire de contact — le serveur répond mal', () => {
  test('une erreur serveur est dite en français, pas en code', async ({
    page,
  }) => {
    await ouvrirLeFormulaire(page)

    await page.route('**/api/contact', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Envoi impossible pour le moment.' }),
      }),
    )

    await remplir(page)
    await envoyer(page).click()

    await expect(
      page.getByText('Envoi impossible pour le moment.'),
    ).toBeVisible()
    /* Le formulaire reste rempli : on ne fait pas retaper son message à
       quelqu'un parce que le serveur a hoqueté. */
    await expect(page.getByLabel('Votre message')).toHaveValue(
      MESSAGE_VALIDE.message,
    )
  })

  test('une limitation de débit est expliquée', async ({ page }) => {
    await ouvrirLeFormulaire(page)

    await page.route('**/api/contact', (route) =>
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Trop de messages envoyés. Réessayez dans une heure.',
        }),
      }),
    )

    await remplir(page)
    await envoyer(page).click()

    await expect(
      page.getByText('Trop de messages envoyés. Réessayez dans une heure.'),
    ).toBeVisible()
  })

  test('une coupure réseau est dite en français, pas « Failed to fetch »', async ({
    page,
  }) => {
    await ouvrirLeFormulaire(page)
    await page.route('**/api/contact', (route) => route.abort('failed'))

    await remplir(page)
    await envoyer(page).click()

    /* Le message brut du navigateur est trois mots d'anglais technique :
       il ne dit rien à la personne, et lui laisse croire que c'est SON
       message qui est fautif. */
    await expect(
      page.getByText(/Connexion impossible\. Vérifiez votre réseau/),
    ).toBeVisible()
    await expect(page.getByText(/Failed to fetch/i)).toHaveCount(0)
  })

  test('un double clic n’envoie pas deux fois', async ({ page }) => {
    await ouvrirLeFormulaire(page)

    let appels = 0
    await page.route('**/api/contact', async (route) => {
      appels += 1
      /* Réponse lente : c'est pendant l'attente qu'on clique deux fois. */
      await new Promise((r) => setTimeout(r, 900))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await remplir(page)
    await envoyer(page).dblclick()
    await expect(page.getByText('Message envoyé.')).toBeVisible()

    expect(appels, 'Deux clics ne doivent produire qu’un message.').toBe(1)
  })
})

test.describe('Formulaire de contact — envoi réel', () => {
  test('un message complet aboutit, et on peut en écrire un autre', async ({
    page,
  }) => {
    await ouvrirLeFormulaire(page)
    await remplir(page)
    await envoyer(page).click()

    await expect(page.getByText('Message envoyé.')).toBeVisible()

    await page.getByRole('button', { name: 'Écrire un autre message' }).click()

    /* Le formulaire revient VIDE : garder l'ancien message ferait
       renvoyer deux fois la même demande. */
    await expect(page.getByLabel('Votre message')).toHaveValue('')
    await expect(page.getByLabel('Nom', { exact: true })).toHaveValue('')
  })
})

test.describe('Formulaire de contact — piège à robots', () => {
  test('le champ piège est hors de portée d’un humain', async ({ page }) => {
    await ouvrirLeFormulaire(page)

    const piege = page.locator('#website')
    await expect(piege).toHaveCount(1)

    /*
     * Un piège à robots N'EST PAS `display:none` — un robot un peu sérieux
     * ignore ce qui est masqué. Il doit rester dans le flux et dans le
     * DOM, tout en étant inatteignable pour un humain : rejeté hors de
     * l'écran, hors de la tabulation, hors de la lecture d'écran.
     * Le manquer, c'est jeter silencieusement le message d'une visiteuse.
     */
    await expect(piege).not.toBeInViewport()
    await expect(piege).toHaveAttribute('tabindex', '-1')

    const contenant = page.locator('[aria-hidden="true"]').filter({ has: piege })
    await expect(contenant).toHaveCount(1)

    const gauche = await piege.evaluate(
      (element) => element.getBoundingClientRect().left,
    )
    expect(gauche, 'Le piège doit être rejeté hors de l’écran.').toBeLessThan(0)
  })
})
