import { expect, type Page, type Response } from '@playwright/test'

/**
 * Aides partagées.
 *
 * Elles portent des assertions réelles, pas des raccourcis d'écriture : une
 * aide qui se contente de cliquer laisse passer les régressions qu'on
 * croyait couvrir.
 */

/** Attend qu'une notification sonner porte exactement ce texte. */
export async function attendreNotification(page: Page, texte: string | RegExp) {
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: texte }))
    .toBeVisible({ timeout: 15_000 })
}

/**
 * Recharge la page et vérifie qu'un contenu y survit.
 *
 * L'essentiel de ce que teste ce harnais n'est pas « l'écran a changé » mais
 * « la base a changé » : un rechargement complet est le seul juge, car il
 * repart du serveur.
 */
export async function persisteApresRechargement(
  page: Page,
  verifier: () => Promise<void>,
) {
  await page.reload({ waitUntil: 'domcontentloaded' })
  await verifier()
}

/**
 * Vérifie l'absence de débordement horizontal.
 *
 * Le symptôme le plus fréquent et le plus laid du responsive : une largeur
 * de document supérieure à celle de la fenêtre, qui autorise un défilement
 * latéral. On tolère 1px, les arrondis de rendu en produisant parfois.
 */
export async function pasDeDebordementHorizontal(page: Page) {
  const { document: largeurDocument, fenetre } = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    fenetre: window.innerWidth,
  }))
  expect(
    largeurDocument,
    `Débordement horizontal : document ${largeurDocument}px pour une fenêtre de ${fenetre}px`,
  ).toBeLessThanOrEqual(fenetre + 1)
}

/** Toutes les images de la page ont-elles chargé et porté un texte alternatif ? */
export async function imagesSaines(page: Page, options: { altObligatoire?: boolean } = {}) {
  const defauts = await page.evaluate((altObligatoire) => {
    const problemes: string[] = []
    for (const img of Array.from(document.images)) {
      const source = img.currentSrc || img.src || '(sans source)'
      if (!img.complete || img.naturalWidth === 0) {
        problemes.push(`image non chargée : ${source}`)
      }
      if (altObligatoire && !img.getAttribute('alt')?.trim()) {
        /* `alt=""` est légitime pour une image décorative ; on ne signale
           que l'attribut absent. */
        if (img.getAttribute('alt') === null) {
          problemes.push(`alt absent : ${source}`)
        }
      }
    }
    return problemes
  }, options.altObligatoire ?? false)

  expect(defauts, defauts.join('\n')).toEqual([])
}

/** Récupère une réponse HTTP sans quitter la page courante. */
export async function statut(page: Page, chemin: string): Promise<number> {
  const reponse = await page.request.get(chemin, { maxRedirects: 0 })
  return reponse.status()
}

/** Réponse complète, pour inspecter en-têtes et corps. */
export async function requete(page: Page, chemin: string): Promise<Response | null> {
  return page.goto(chemin, { waitUntil: 'domcontentloaded' })
}

/**
 * Erreurs de console collectées pendant un test.
 *
 * Une page qui s'affiche en jetant des erreurs n'est pas une page qui
 * marche. On ignore les avertissements connus et sans conséquence.
 */
export function collecterErreursConsole(page: Page): string[] {
  const erreurs: string[] = []
  const ignorees = [
    /Download the React DevTools/i,
    /was detected as the Largest Contentful Paint/i,
    /Failed to load resource: the server responded with a status of 404/i,
  ]

  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const texte = message.text()
    if (ignorees.some((r) => r.test(texte))) return
    erreurs.push(texte)
  })

  page.on('pageerror', (error) => erreurs.push(`pageerror: ${error.message}`))

  return erreurs
}

/**
 * Rend le menu principal atteignable, quelle que soit la largeur.
 *
 * Le site a DEUX menus, et c'est voulu : au-delà de 1024px une capsule
 * de pastilles (`Navigation principale`), en dessous un panneau plein
 * écran (`Navigation principale (mobile)`) qu'un bouton déplie. Un test
 * qui ne connaîtrait que le premier ne testerait rien du tout sur
 * téléphone — or c'est là que la majorité des visiteuses arrivent.
 *
 * Renvoie le menu réellement visible, ouvert si nécessaire.
 */
export async function ouvrirLeMenu(page: Page) {
  const capsule = page.getByRole('navigation', {
    name: 'Navigation principale',
    exact: true,
  })

  if (await capsule.isVisible()) return capsule

  const bouton = page.getByRole('button', { name: 'Ouvrir le menu' })
  await expect(
    bouton,
    'Sous 1024px, la capsule cède la place à un bouton « Menu » : il doit exister.',
  ).toBeVisible()

  await bouton.click()

  const panneau = page.getByRole('navigation', {
    name: 'Navigation principale (mobile)',
  })
  await expect(panneau).toBeVisible()
  /* La cascade d'apparition dure ~0,9 s : cliquer pendant qu'une ligne
     monte encore viserait le vide. */
  await expect(panneau.getByRole('link').first()).toBeVisible()
  await page.waitForTimeout(900)

  return panneau
}

/** Ouvre un écran d'administration et attend son titre. */
export async function ouvrirAdmin(page: Page, chemin: string, titre: string | RegExp) {
  await page.goto(chemin, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: titre }).first()).toBeVisible({
    timeout: 20_000,
  })
}
