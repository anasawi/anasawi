import { expect, test } from '@playwright/test'

import { HERO_ARCHE } from '../support/fixtures'

/*
 * Le hero « L'arche » et ses réglages de titre.
 *
 * Anne peut, depuis l'admin, poser chaque ligne du titre à gauche, au
 * centre ou à droite, et changer la taille du titre. Ce fichier vérifie
 * que ces réglages FONT quelque chose à l'écran — pas seulement qu'ils
 * sont enregistrés : une ligne « à droite » qui resterait au centre
 * serait un réglage menteur.
 */
test.use({ storageState: { cookies: [], origins: [] } })

/** Boîte d'une ligne du titre, telle que rendue (l'élément qui porte le
    texte, avec son `aria-label` — les lettres animées sont en dessous). */
async function boiteDeLigne(
  page: import('@playwright/test').Page,
  texte: string,
) {
  const ligne = page.locator(`h1 [aria-label="${texte}"]`)
  await expect(ligne).toHaveCount(1)
  const boite = await ligne.boundingBox()
  if (!boite) throw new Error(`La ligne « ${texte} » n'a pas de boîte.`)
  return boite
}

test.describe('Hero — L’arche', () => {
  test('chaque ligne du titre se pose où on l’a dit', async ({ page }) => {
    await page.goto('/')
    /* Les lettres montent une à une : la boîte est stable une fois
       l'animation jouée. */
    await page.waitForTimeout(1500)

    const titre = await page.locator('h1').boundingBox()
    if (!titre) throw new Error('Pas de titre.')
    const [gauche, centre, droite] = await Promise.all(
      HERO_ARCHE.lignes.map((l) => boiteDeLigne(page, l.text)),
    )

    /* À 2 px près : le bord de la ligne touche celui du titre. */
    expect(Math.abs(gauche!.x - titre.x), 'La ligne « gauche » ne colle pas au bord gauche.')
      .toBeLessThanOrEqual(2)
    expect(
      Math.abs(centre!.x + centre!.width / 2 - (titre.x + titre.width / 2)),
      'La ligne « centre » n’est pas centrée.',
    ).toBeLessThanOrEqual(2)
    expect(
      Math.abs(droite!.x + droite!.width - (titre.x + titre.width)),
      'La ligne « droite » ne colle pas au bord droit.',
    ).toBeLessThanOrEqual(2)

    /* Et elles sont bien distinctes : trois lignes qui se seraient toutes
       rangées au même endroit passeraient un test moins regardant. */
    expect(gauche!.x).toBeLessThan(centre!.x)
    expect(centre!.x + centre!.width).toBeLessThan(droite!.x + droite!.width)
  })

  test('la taille du titre suit le pourcentage choisi', async ({ page }) => {
    await page.goto('/')

    /* La taille de la maquette dépend de l'écran (`clamp` avec du `vw`) :
       on la recalcule ici, dans la même fenêtre, et on attend exactement
       le pourcentage de la fixture. */
    const mesure = await page.evaluate(() => {
      const h1 = document.querySelector('h1')!
      const largeur = window.innerWidth
      const clamp = (min: number, vw: number, max: number) =>
        Math.min(max, Math.max(min, (largeur * vw) / 100))
      const maquette =
        largeur >= 768 ? clamp(56, 9, 150) : clamp(52, 16, 76)
      /* Sur un écran étroit, le titre peut avoir été réduit pour tenir
         (voir `TitreAjuste`) : le facteur est posé sur l'élément. La
         réduction elle-même est vérifiée par le test suivant. */
      const ajustement = parseFloat(h1.style.getPropertyValue('--ajustement') || '1')
      return { reelle: parseFloat(getComputedStyle(h1).fontSize), maquette, ajustement }
    })

    const attendue = (mesure.maquette * HERO_ARCHE.taille * mesure.ajustement) / 100
    expect(
      Math.abs(mesure.reelle - attendue),
      `Titre à ${mesure.reelle}px, attendu ${attendue}px (${HERO_ARCHE.taille} % de ${mesure.maquette}px × ${mesure.ajustement}).`,
    ).toBeLessThanOrEqual(0.5)
  })

  test('aucun mot du titre n’est coupé en deux', async ({ page }) => {
    /*
     * Chaque lettre du titre est une boîte à part (elle monte séparément) :
     * sans regroupement, le navigateur coupait n'importe où — « Anne Wi /
     * nzenried » sur un téléphone. Un mot doit tenir sur une seule ligne.
     */
    await page.goto('/')
    await page.waitForTimeout(1500)

    const mots = await page.locator('h1 .whitespace-nowrap').evaluateAll((els) =>
      els.map((el) => ({
        texte: el.textContent ?? '',
        hauteur: el.getBoundingClientRect().height,
        ligne: parseFloat(getComputedStyle(el).fontSize),
      })),
    )
    expect(mots.length, 'Le titre devrait porter des mots.').toBeGreaterThan(0)
    for (const mot of mots) {
      expect(
        mot.hauteur,
        `« ${mot.texte} » s'étale sur plus d'une ligne.`,
      ).toBeLessThan(mot.ligne * 1.6)
    }
  })

  test('aucune ligne du titre ne sort de l’écran', async ({ page }) => {
    /*
     * Un mot long ne se coupe pas : sur un téléphone, « SUPERVISION » en
     * 16 vw est plus large que l'écran et se faisait rogner des deux
     * côtés. Le titre doit se réduire jusqu'à ce que chaque ligne tienne
     * — sur tous les profils d'écran, et pour n'importe quel mot.
     */
    await page.goto('/')
    await page.waitForTimeout(1500)

    const largeurEcran = page.viewportSize()?.width ?? 0
    for (const ligne of HERO_ARCHE.lignes) {
      const boite = await boiteDeLigne(page, ligne.text)
      expect(boite.x, `« ${ligne.text} » sort à gauche.`).toBeGreaterThanOrEqual(-1)
      expect(
        boite.x + boite.width,
        `« ${ligne.text} » sort à droite (${boite.x + boite.width} > ${largeurEcran}).`,
      ).toBeLessThanOrEqual(largeurEcran + 1)
    }
  })
})
