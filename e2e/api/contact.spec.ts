import { expect, test, type APIRequestContext } from '@playwright/test'

import {
  CARACTERES_SPECIAUX,
  EMAILS_INVALIDES,
  LIMITE_CONTACT,
  MESSAGES,
  MESSAGE_VALIDE,
  TROP_LONG,
} from '../support/fixtures'

/*
 * `POST /api/contact` — le seul chemin d'écriture ouvert au public.
 *
 * Il mérite donc le traitement le plus dur : ce qu'il accepte finit dans
 * la base de la praticienne, et ce qu'il refuse doit être refusé de la
 * même façon à chaque fois.
 *
 * La limitation de débit compte par adresse IP (5 envois par heure) et
 * vit en mémoire du serveur : deux tests qui partageraient une IP se
 * gêneraient, et le dernier échouerait pour une raison sans rapport avec
 * ce qu'il vérifie. Chaque cas prend donc SA propre IP, via
 * `X-Forwarded-For` — que `clientIp()` lit en premier.
 */

let compteur = 0

/** Une adresse IP à soi, pour ne partager le compteur avec personne. */
function ipUnique(): string {
  compteur += 1
  return `203.0.113.${compteur % 250}`
}

async function envoyer(
  request: APIRequestContext,
  corps: unknown,
  options: { ip?: string } = {},
) {
  return request.post('/api/contact', {
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': options.ip ?? ipUnique(),
    },
    data: corps as Record<string, unknown>,
    failOnStatusCode: false,
  })
}

test.describe('API contact — ce qui est accepté', () => {
  test('un message complet est enregistré et répond 200', async ({ request }) => {
    const reponse = await envoyer(request, MESSAGE_VALIDE)

    expect(reponse.status()).toBe(200)
    expect(await reponse.json()).toEqual({ ok: true })
  })

  test('le téléphone est facultatif', async ({ request }) => {
    /* `undefined` disparaît à la sérialisation : le champ est bel et bien
       absent du corps envoyé. */
    const reponse = await envoyer(request, {
      ...MESSAGE_VALIDE,
      phone: undefined,
    })

    expect(reponse.status()).toBe(200)
  })

  test('un téléphone vide vaut un téléphone absent', async ({ request }) => {
    const reponse = await envoyer(request, { ...MESSAGE_VALIDE, phone: '' })
    expect(reponse.status()).toBe(200)
  })

  test('les caractères spéciaux traversent sans casser', async ({ request }) => {
    /* Balises, apostrophes, commentaires SQL, accents, idéogrammes,
       émojis : rien de tout cela ne doit provoquer d'erreur serveur. */
    const reponse = await envoyer(request, {
      ...MESSAGE_VALIDE,
      name: CARACTERES_SPECIAUX.slice(0, 100),
      message: `${CARACTERES_SPECIAUX} ${MESSAGE_VALIDE.message}`,
    })

    expect(reponse.status()).toBe(200)
  })
})

test.describe('API contact — ce qui est refusé', () => {
  const refus = async (
    request: APIRequestContext,
    corps: unknown,
  ): Promise<void> => {
    const reponse = await envoyer(request, corps)
    expect(reponse.status()).toBe(400)
    expect(await reponse.json()).toEqual({ error: MESSAGES.contactInvalide })
  }

  test('un corps vide est refusé', async ({ request }) => {
    await refus(request, {})
  })

  test('un corps qui n’est pas du JSON est refusé', async ({ request }) => {
    const reponse = await request.post('/api/contact', {
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': ipUnique(),
      },
      data: 'ceci n’est pas du JSON',
      failOnStatusCode: false,
    })

    /* Le `catch(() => null)` de la route doit rattraper : 400, pas 500. */
    expect(reponse.status()).toBe(400)
  })

  test('un nom d’une seule lettre est refusé', async ({ request }) => {
    await refus(request, { ...MESSAGE_VALIDE, name: 'A' })
  })

  test('un message trop court est refusé', async ({ request }) => {
    /* Vingt caractères minimum : « Bonjour » ne dit rien à personne. */
    await refus(request, { ...MESSAGE_VALIDE, message: 'Bonjour' })
  })

  test('le consentement est obligatoire', async ({ request }) => {
    await refus(request, { ...MESSAGE_VALIDE, consent: false })
  })

  for (const email of EMAILS_INVALIDES) {
    test(`l’adresse « ${email || '(vide)'} » est refusée`, async ({ request }) => {
      await refus(request, { ...MESSAGE_VALIDE, email })
    })
  }

  test('un nom démesuré est refusé', async ({ request }) => {
    /* 120 caractères maximum : sans borne, un champ texte devient un
       vecteur de saturation de la base. */
    await refus(request, { ...MESSAGE_VALIDE, name: TROP_LONG })
  })

  test('un message démesuré est refusé', async ({ request }) => {
    await refus(request, { ...MESSAGE_VALIDE, message: TROP_LONG.repeat(20) })
  })
})

test.describe('API contact — piège à robots', () => {
  test('un champ piège rempli répond 200 sans rien enregistrer', async ({
    request,
  }) => {
    /* Répondre 400 apprendrait au robot à vider le champ. On lui rend
       donc un succès — et on n'écrit rien. */
    const reponse = await envoyer(request, {
      ...MESSAGE_VALIDE,
      website: 'https://spam.example',
    })

    expect(reponse.status()).toBe(200)
    expect(await reponse.json()).toEqual({ ok: true })
  })
})

test.describe('API contact — limitation de débit', () => {
  test('bloque au-delà de cinq envois par heure et par adresse', async ({
    request,
  }) => {
    const ip = ipUnique()

    for (let essai = 1; essai <= LIMITE_CONTACT; essai += 1) {
      const reponse = await envoyer(request, MESSAGE_VALIDE, { ip })
      expect(reponse.status(), `Envoi ${essai} sur ${LIMITE_CONTACT}`).toBe(200)
    }

    const suivant = await envoyer(request, MESSAGE_VALIDE, { ip })
    expect(suivant.status()).toBe(429)
    expect(await suivant.json()).toEqual({
      error: MESSAGES.contactTropDeMessages,
    })
  })

  test('une autre adresse n’est pas pénalisée', async ({ request }) => {
    /* Un compteur global aurait fait taire tout un immeuble, tout un
       cabinet, toute une salle d'attente en Wi-Fi partagé. */
    const reponse = await envoyer(request, MESSAGE_VALIDE)
    expect(reponse.status()).toBe(200)
  })
})
