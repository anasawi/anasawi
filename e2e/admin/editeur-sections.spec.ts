import { expect, test, type Page } from '@playwright/test'

import { attendreNotification } from '../support/aides'

/*
 * Les gestes de la liste des sections — le cœur de « construire son site
 * soi-même ».
 *
 * Ajouter, dupliquer, monter, descendre, renommer, supprimer : chaque
 * action est NOMMÉE dans un menu toujours visible, atteignable au clavier,
 * et chaque effet est vérifié dans la liste ET dans la page en cours
 * d'édition — pas seulement « le bouton existe ».
 *
 * Tout ce que ces tests créent est un brouillon : rien n'est publié, et
 * chaque test jette son brouillon en sortant. Le site public ne bouge pas.
 */

const etat = (page: Page) =>
  page.getByText(/^(En ligne|Modifications à publier|Jamais publiée)$/).first()

const publier = (page: Page) => page.getByRole('button', { name: 'Publier' })

async function ouvrirEditeur(page: Page) {
  await page.goto('/admin/accueil', { waitUntil: 'domcontentloaded' })
  await expect(publier(page)).toBeVisible({ timeout: 25_000 })
  await expect(etat(page)).toBeVisible({ timeout: 20_000 })
}

/** Les lignes de la liste, dans l'ordre de la page. */
const lignes = (page: Page) =>
  page.getByRole('list').filter({ has: page.getByRole('button', { name: /^Actions de/ }) }).first().getByRole('listitem')

/* Scopé à la liste des sections : le menu d'administration, à gauche, a
   lui aussi des éléments de liste nommés « Accompagnements »… */
const rangee = (page: Page, nom: string) =>
  lignes(page).filter({ hasText: nom }).first()

/** Ouvre le menu « ⋯ » d'une ligne et choisit une action par son nom. */
async function action(page: Page, nom: string, item: string | RegExp) {
  await rangee(page, nom).getByRole('button', { name: /^Actions de/ }).click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await menu.getByRole('menuitem', { name: item }).click()
}

/** Les noms des lignes, tels qu'Anne les lit. */
async function nomsDesLignes(page: Page): Promise<string[]> {
  /* Le premier bouton de chaque ligne est celui qui porte le nom — même
     pendant une confirmation de suppression, rendue après lui. */
  return lignes(page).evaluateAll((lis) =>
    lis.map((li) =>
      (li.querySelector('button')?.textContent ?? '').replace(/masquée$/, '').trim(),
    ),
  )
}

/** Attend que le brouillon soit écrit avant de faire autre chose. */
async function attendreEnregistrement(page: Page) {
  await expect(page.getByText('Enregistrement…')).toHaveCount(0, { timeout: 15_000 })
}

/** Jette le brouillon : la page revient à sa version en ligne. */
async function revenirEnLigne(page: Page) {
  await ouvrirEditeur(page)
  if ((await etat(page).textContent()) === 'En ligne') return
  await page.getByRole('button', { name: 'Autres actions' }).click()
  await page.getByRole('menuitem', { name: /Annuler les modifications non publiées/ }).click()
  await page.getByRole('button', { name: 'Revenir à la version en ligne' }).click()
  await attendreNotification(page, 'Retour à la version en ligne.')
  await expect(etat(page)).toHaveText('En ligne')
}

test.describe('Liste des sections — les gestes', () => {
  test.afterEach(async ({ page }) => {
    await revenirEnLigne(page)
  })

  test('chaque ligne porte un menu d’actions nommées, sans survol', async ({ page }) => {
    await ouvrirEditeur(page)
    const premiere = lignes(page).first()

    /* Le bouton est là AVANT tout survol : la souris est ailleurs. */
    await page.mouse.move(700, 700)
    const bouton = premiere.getByRole('button', { name: /^Actions de « .+ »$/ })
    await expect(bouton).toBeVisible()
    await bouton.click()

    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()
    for (const nom of ['Modifier', 'Monter', 'Descendre', 'Dupliquer', 'Renommer', 'Supprimer']) {
      await expect(menu.getByRole('menuitem', { name: nom })).toBeVisible()
    }
    await expect(menu.getByRole('menuitem', { name: /^(Masquer|Afficher)$/ })).toBeVisible()

    /* Première ligne : impossible de monter. Le geste est là, mais inerte. */
    await expect(menu.getByRole('menuitem', { name: 'Monter' })).toBeDisabled()
    await expect(menu.getByRole('menuitem', { name: 'Descendre' })).toBeEnabled()

    /* Échap referme et rend le focus au bouton. */
    await page.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)
    await expect(bouton).toBeFocused()
  })

  test('le menu se parcourt au clavier', async ({ page }) => {
    await ouvrirEditeur(page)
    const bouton = lignes(page).nth(1).getByRole('button', { name: /^Actions de/ })
    await bouton.focus()
    await page.keyboard.press('Enter')

    const menu = page.getByRole('menu')
    await expect(menu.getByRole('menuitem', { name: 'Modifier' })).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(menu.getByRole('menuitem', { name: 'Monter' })).toBeFocused()
    await page.keyboard.press('End')
    await expect(menu.getByRole('menuitem', { name: 'Supprimer' })).toBeFocused()
    await page.keyboard.press('Home')
    await expect(menu.getByRole('menuitem', { name: 'Modifier' })).toBeFocused()

    /* Entrée sur « Modifier » ouvre l'inspecteur de CETTE section. */
    await page.keyboard.press('Enter')
    await expect(menu).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Options avancées' })).toBeVisible()
  })

  test('Monter et Descendre déplacent la section — dans la liste et dans la page', async ({ page }) => {
    await ouvrirEditeur(page)
    const avant = await nomsDesLignes(page)
    expect(avant.length).toBeGreaterThan(2)
    const [premier, deuxieme] = avant as [string, string]

    await action(page, deuxieme, 'Monter')
    await attendreEnregistrement(page)
    expect((await nomsDesLignes(page)).slice(0, 2)).toEqual([deuxieme, premier])
    await expect(etat(page)).toHaveText('Modifications à publier')

    /* La page suit : sa première section est celle qui vient de monter. */
    const cadre = page.frameLocator('iframe[title="Page en cours d’édition"]')
    const idMonte = await lignes(page).first().getAttribute('data-section-id')
    expect(idMonte).toBeTruthy()
    await expect(cadre.locator('[data-block-root]').first()).toHaveAttribute(
      'data-block-id',
      idMonte!,
    )

    await action(page, deuxieme, 'Descendre')
    await attendreEnregistrement(page)
    expect((await nomsDesLignes(page)).slice(0, 2)).toEqual([premier, deuxieme])

    /* Et l'ordre survit à un rechargement : c'est la base qui compte. */
    await action(page, deuxieme, 'Monter')
    await attendreEnregistrement(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(publier(page)).toBeVisible({ timeout: 25_000 })
    expect((await nomsDesLignes(page)).slice(0, 2)).toEqual([deuxieme, premier])
  })

  test('Dupliquer crée une copie juste en dessous, avec le même contenu', async ({ page }) => {
    await ouvrirEditeur(page)
    const avant = await nomsDesLignes(page)
    const cible = avant[2] as string

    await action(page, cible, 'Dupliquer')
    await attendreNotification(page, 'Copie créée juste en dessous.')
    await attendreEnregistrement(page)

    const apres = await nomsDesLignes(page)
    expect(apres.length).toBe(avant.length + 1)
    expect(apres[2]).toBe(cible)
    expect(apres[3]).toBe(cible)

    /* La page compte une section de plus, et la copie rend le même texte. */
    const cadre = page.frameLocator('iframe[title="Page en cours d’édition"]')
    const blocs = cadre.locator('[data-block-root]')
    await expect(blocs).toHaveCount(avant.length + 1)
    /* Certains modèles numérotent la section (« iii — contact ») : la
       copie prend le numéro suivant, c'est normal. Le reste est identique. */
    const sansNumero = (t: string) => t.replace(/^[ivxlc]+\s+—\s*/im, '').trim()
    const original = sansNumero(await blocs.nth(2).innerText())
    const copie = sansNumero(await blocs.nth(3).innerText())
    expect(copie).toBe(original)
  })

  test('Renommer change le nom dans la liste seulement', async ({ page }) => {
    await ouvrirEditeur(page)
    const avant = await nomsDesLignes(page)
    const cible = avant[1] as string

    await action(page, cible, 'Renommer')
    const champ = page.getByRole('textbox', { name: `Nouveau nom de « ${cible} »` })
    await expect(champ).toBeFocused()
    await champ.fill('Ma section renommée')
    await page.keyboard.press('Enter')
    await attendreEnregistrement(page)

    await expect(rangee(page, 'Ma section renommée')).toBeVisible()
    await expect(etat(page)).toHaveText('Modifications à publier')

    /* Le nom n'est qu'un repère d'administration : la page ne l'affiche pas. */
    const cadre = page.frameLocator('iframe[title="Page en cours d’édition"]')
    await expect(cadre.getByText('Ma section renommée')).toHaveCount(0)

    /* Échap pendant la saisie abandonne sans rien changer. */
    await action(page, 'Ma section renommée', 'Renommer')
    await page.keyboard.type('Brouillon abandonné')
    await page.keyboard.press('Escape')
    await expect(rangee(page, 'Ma section renommée')).toBeVisible()
    await expect(page.getByText('Brouillon abandonné')).toHaveCount(0)
  })

  test('Supprimer demande confirmation, en clair, et se rattrape', async ({ page }) => {
    await ouvrirEditeur(page)
    const avant = await nomsDesLignes(page)
    const cible = avant[avant.length - 1] as string

    /* Un premier clic ne supprime RIEN : il pose la question. */
    await action(page, cible, 'Supprimer')
    const dialogue = page.getByRole('alertdialog', { name: 'Confirmer la suppression' })
    await expect(dialogue).toBeVisible()
    await expect(dialogue).toContainText(`Supprimer « ${cible} » ?`)
    expect(await nomsDesLignes(page)).toEqual(avant)

    /* Annuler : rien ne change. */
    await dialogue.getByRole('button', { name: 'Annuler' }).click()
    await expect(dialogue).toHaveCount(0)
    expect(await nomsDesLignes(page)).toEqual(avant)
    await expect(etat(page)).toHaveText('En ligne')

    /* Confirmer : la section part de la liste et de la page. */
    await action(page, cible, 'Supprimer')
    await dialogue.getByRole('button', { name: 'Supprimer' }).click()
    await attendreNotification(page, 'Section supprimée')
    expect(await nomsDesLignes(page)).toEqual(avant.slice(0, -1))
    const cadre = page.frameLocator('iframe[title="Page en cours d’édition"]')
    await expect(cadre.locator('[data-block-root]')).toHaveCount(avant.length - 1)

    /* La notification propose d'annuler : la section revient. */
    await page.locator('[data-sonner-toast]').filter({ hasText: 'Section supprimée' })
      .getByRole('button', { name: 'Annuler' }).click()
    await expect(rangee(page, cible)).toBeVisible()
    expect(await nomsDesLignes(page)).toEqual(avant)
  })

  test('Ajouter une section : des modèles rangés par besoin, en clair', async ({ page }) => {
    await ouvrirEditeur(page)
    const avant = await nomsDesLignes(page)

    await page.getByRole('button', { name: 'Ajouter une section' }).click()
    const dialogue = page.getByRole('dialog')
    await expect(dialogue).toBeVisible()

    /* Les catégories parlent du besoin d'Anne, pas d'un composant. */
    for (const cat of ['Ouverture', 'Qui je suis', 'Accompagnements', 'Témoignages', 'Questions', 'Contact & rendez-vous']) {
      await expect(dialogue.getByRole('button', { name: new RegExp(`^${cat}`) })).toBeVisible()
    }

    /* Aucun nom technique dans les cartes. */
    const cartes = dialogue.getByRole('button', { name: /^Ajouter la section « / })
    expect(await cartes.count()).toBeGreaterThan(0)
    const noms = await cartes.allInnerTexts()
    for (const nom of noms) {
      expect(nom, `Nom technique dans la bibliothèque : ${nom}`).not.toMatch(/[a-z][A-Z]|[a-z]_[a-z]|\bhero\b|\bcta\b|\bfaq\b/)
    }

    /* La recherche trouve par le besoin. */
    await dialogue.getByLabel('Rechercher un modèle').fill('rendez-vous')
    await expect(cartes.first()).toBeVisible()

    /* On ajoute la première carte proposée : elle arrive dans la liste et
       dans la page, en brouillon. */
    const nomChoisi = (await cartes.first().getAttribute('aria-label'))!
      .replace(/^Ajouter la section « /, '').replace(/ »$/, '')
    await cartes.first().click()
    await expect(dialogue).toHaveCount(0)
    await attendreEnregistrement(page)
    const apres = await nomsDesLignes(page)
    expect(apres.length).toBe(avant.length + 1)
    expect(apres).toContain(nomChoisi)
    await expect(etat(page)).toHaveText('Modifications à publier')
    const cadre = page.frameLocator('iframe[title="Page en cours d’édition"]')
    await expect(cadre.locator('[data-block-root]')).toHaveCount(avant.length + 1)
  })

  test('un bouton se relie à une section de la page, sans écrire d’adresse', async ({ page }) => {
    await ouvrirEditeur(page)
    /* L'ouverture porte un bouton principal. */
    await lignes(page).first().getByRole('button').first().click()
    const boutons = page.getByRole('button', { name: 'Boutons' })
    await expect(boutons).toBeVisible()
    if ((await boutons.getAttribute('aria-expanded')) !== 'true') await boutons.click()

    /* Le lien du bouton principal : une destination à choisir, pas une
       adresse à taper. Aucun champ texte ne demande « #contact ». */
    const mode = page.getByRole('combobox', { name: 'Où mène ce bouton ?' }).first()
    await expect(mode).toBeVisible()
    await expect(mode).toHaveText('Vers une section de la page')
    await expect(page.getByPlaceholder(/^#/)).toHaveCount(0)

    /* Le choix de la section se fait par son NOM, dans une liste. */
    const section = page.getByRole('combobox', { name: 'Quelle section ?' }).first()
    await expect(section).toBeVisible()
    await section.click()
    const options = page.getByRole('option')
    expect(await options.count()).toBeGreaterThan(1)
    const choisie = options.nth(1)
    const nomOption = (await choisie.textContent())!.trim()
    await choisie.click()
    await expect(section).toHaveText(nomOption)
    await attendreEnregistrement(page)

    /* Et le bouton de la page pointe bien vers l'ancre de cette section. */
    const cadre = page.frameLocator('iframe[title="Page en cours d’édition"]')
    const idSection = await rangee(page, nomOption).getAttribute('data-section-id')
    const ancre = await cadre.locator(`[data-block-id="${idSection}"]`).getAttribute('id')
    expect(ancre, 'La section choisie porte une ancre.').toBeTruthy()
    const lien = cadre.locator('[data-block-root]').first().locator(`a[href="#${ancre}"], a[href="/#${ancre}"]`)
    await expect(lien.first()).toBeVisible()
  })
})
