import { expect, test } from '@playwright/test'

import {
  collecterErreursConsole,
  imagesSaines,
  ouvrirLeMenu,
  pasDeDebordementHorizontal,
} from '../support/aides'
import { REGLAGES, SERVICES } from '../support/fixtures'

/*
 * Page d'accueil — ce que voit un visiteur qui arrive.
 *
 * Le site public sert l'INSTANTANÉ PUBLIÉ de la page, pas ses sections
 * vivantes : ces tests valident donc la chaîne complète jusqu'à la
 * publication, et pas seulement ce que contient la base.
 *
 * Contexte déconnecté : avec une session, la barre d'édition s'ajoute au
 * site et on ne testerait plus ce que voit un visiteur.
 */
test.use({ storageState: { cookies: [], origins: [] } })
test.describe('Accueil', () => {
  test('répond en 200 et affiche les sections publiées', async ({ page }) => {
    const erreurs = collecterErreursConsole(page)
    const reponse = await page.goto('/')

    expect(reponse?.status()).toBe(200)

    /* Le hero et la liste d'accompagnements sont les deux sections du jeu
       de test — leur présence prouve que l'instantané a été lu. */
    await expect(
      page.getByRole('heading', { level: 1 }).filter({ hasText: /Retrouver/ }),
    ).toBeVisible()

    for (const service of SERVICES) {
      await expect(
        page.getByRole('heading', { name: service.titre }),
      ).toBeVisible()
    }

    expect(erreurs, erreurs.join('\n')).toEqual([])
  })

  test('n’a qu’un seul H1', async ({ page }) => {
    await page.goto('/')
    /* Plusieurs H1 brouillent la hiérarchie pour les lecteurs d'écran
       comme pour les moteurs. */
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  })

  test('toutes les images chargent et portent un alt', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' })
    /* Le rendu différé des images demande un temps de grâce. */
    await page.waitForTimeout(1500)
    await imagesSaines(page, { altObligatoire: true })
  })

  test('ne déborde pas horizontalement', async ({ page }) => {
    await page.goto('/')
    await pasDeDebordementHorizontal(page)
  })

  test('affiche les coordonnées réelles de la praticienne', async ({ page }) => {
    await page.goto('/')

    /* Ces valeurs alimentent aussi le JSON-LD : une coordonnée fausse sur la
       page est une coordonnée fausse pour Google. */
    await expect(page.getByRole('link', { name: REGLAGES.email })).toBeVisible()
    await expect(
      page.getByRole('link', { name: REGLAGES.telephone }),
    ).toBeVisible()
    await expect(page.getByText(REGLAGES.rue, { exact: false }).first())
      .toBeVisible()
  })

  test('les liens de contact portent les bons protocoles', async ({ page }) => {
    await page.goto('/')

    const mail = page.getByRole('link', { name: REGLAGES.email }).first()
    await expect(mail).toHaveAttribute('href', `mailto:${REGLAGES.email}`)

    /* Le téléphone doit être au format E.164, sinon l'appel échoue depuis
       un mobile étranger. */
    const tel = page.getByRole('link', { name: REGLAGES.telephone }).first()
    await expect(tel).toHaveAttribute('href', /^tel:\+33/)
  })
})

/*
 * Le menu existe en deux exemplaires — capsule au-delà de 1024px, panneau
 * déplié par un bouton en dessous. `ouvrirLeMenu` rend le bon, ouvert :
 * ces tests valent donc pour les trois profils d'écran, et non pour le
 * seul desktop.
 */
test.describe('Ancres de navigation', () => {
  test('chaque ancre du menu désigne une section existante', async ({ page }) => {
    await page.goto('/')

    const nav = await ouvrirLeMenu(page)
    const liens = await nav.getByRole('link').all()
    expect(liens.length).toBeGreaterThan(0)

    for (const lien of liens) {
      const href = await lien.getAttribute('href')
      if (!href?.startsWith('#') || href === '#') continue

      /* Sélecteur par attribut : `CSS.escape` n'existe que dans le
         navigateur, pas dans le processus de test qui construit le
         localisateur. Un identifiant ne contient jamais de guillemet. */
      const cible = page.locator(`[id="${href.slice(1)}"]`)
      await expect(
        cible,
        `L'ancre ${href} du menu ne désigne aucune section.`,
      ).toHaveCount(1)
    }
  })

  test('un clic sur une entrée du menu amène à la section', async ({ page }) => {
    await page.goto('/')

    const nav = await ouvrirLeMenu(page)
    const lien = nav.getByRole('link').first()
    const href = await lien.getAttribute('href')
    test.skip(!href?.startsWith('#'), 'Le menu ne contient pas d’ancre.')

    /* Point de départ : la section visée n'est PAS déjà sous les yeux,
       sans quoi le test passerait sans qu'aucun défilement ait lieu. */
    const cible = page.locator(`[id="${href!.slice(1)}"]`)
    await expect(
      cible,
      'La cible est déjà visible au chargement : ce test ne prouverait rien.',
    ).not.toBeInViewport()

    await lien.click()
    /* Le défilement inertiel met environ une seconde à se poser. */
    await page.waitForTimeout(1200)

    await expect(cible).toBeInViewport({ ratio: 0.05 })
  })

  test('le lien d’évitement donne le focus au contenu', async ({ page }) => {
    await page.goto('/')

    /*
     * Premier arrêt de tabulation : c'est toute la raison d'être d'un lien
     * d'évitement. On interroge le DOM plutôt que d'envoyer une touche
     * `Tab` — sous émulation tactile, le navigateur ne déplace pas le
     * focus au clavier, et le test mesurerait alors l'émulateur, pas le
     * site.
     */
    const premier = await page.evaluate(() => {
      const candidats = Array.from(
        document.querySelectorAll<HTMLElement>(
          'a[href], button, input, select, textarea, [tabindex]',
        ),
      ).filter(
        (element) =>
          element.tabIndex >= 0 &&
          !element.hasAttribute('disabled') &&
          !element.closest('[inert]') &&
          element.checkVisibility({ checkVisibilityCSS: true }),
      )
      return candidats[0]?.textContent?.trim() ?? null
    })
    expect(
      premier,
      'Le lien d’évitement doit être le tout premier élément atteignable au clavier.',
    ).toBe('Aller au contenu')

    /* `press` donne le focus à l'élément avant d'envoyer la touche. */
    await page.getByRole('link', { name: 'Aller au contenu' }).press('Enter')

    /*
     * Ce qui compte n'est pas le défilement mais LE FOCUS : un lien
     * d'évitement qui ne déplace pas le curseur clavier renvoie la
     * tabulation suivante dans l'en-tête — précisément ce qu'il servait
     * à sauter. D'où `tabindex="-1"` sur le <main>.
     */
    await expect(page.locator('#contenu')).toBeFocused()
  })
})

test.describe('Menu sous 1024px', () => {
  test('le bouton ouvre et referme le panneau', async ({ page }, infos) => {
    test.skip(
      infos.project.name === 'desktop',
      'Au-delà de 1024px, la capsule est affichée en permanence.',
    )

    await page.goto('/')

    const panneau = page.getByRole('dialog', { name: 'Menu' })
    await expect(panneau).toBeHidden()

    await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
    await expect(panneau).toBeVisible()

    await page.getByRole('button', { name: 'Fermer le menu' }).click()
    await expect(panneau).toBeHidden()
  })

  test('la touche Échap referme le panneau', async ({ page }, infos) => {
    test.skip(infos.project.name === 'desktop', 'Capsule permanente.')

    await page.goto('/')
    await page.getByRole('button', { name: 'Ouvrir le menu' }).click()

    const panneau = page.getByRole('dialog', { name: 'Menu' })
    await expect(panneau).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(panneau).toBeHidden()
  })

  test('un clic sur une entrée referme le panneau', async ({ page }, infos) => {
    test.skip(infos.project.name === 'desktop', 'Capsule permanente.')

    await page.goto('/')
    const nav = await ouvrirLeMenu(page)
    await nav.getByRole('link').first().click()

    /* Rester sur un panneau plein écran après avoir choisi sa
       destination, c'est ne jamais voir la section demandée. */
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden()
  })
})

test.describe('Aucun lien mort', () => {
  test('tous les liens internes répondent', async ({ page, request }) => {
    await page.goto('/')

    const hrefs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'))
        .map((a) => a.getAttribute('href') ?? '')
        .filter((h) => h.startsWith('/') && !h.startsWith('//')),
    )

    const uniques = [...new Set(hrefs)]
    const casses: string[] = []

    for (const href of uniques) {
      const reponse = await request.get(href, { maxRedirects: 5 })
      if (reponse.status() >= 400) casses.push(`${href} → ${reponse.status()}`)
    }

    expect(casses, `Liens internes cassés :\n${casses.join('\n')}`).toEqual([])
  })
})
