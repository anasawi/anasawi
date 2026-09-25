import { expect, test, type Page } from '@playwright/test'

import {
  attendreNotification,
  ouvrirAdmin,
  persisteApresRechargement,
} from '../support/aides'
import { CARACTERES_SPECIAUX, SERVICES, TROP_LONG } from '../support/fixtures'

/*
 * Écran « Accompagnements » — le cœur du CMS.
 *
 * C'est l'écran qu'Anne ouvrira le plus souvent, et le seul où elle crée
 * du contenu structuré. Tout y est vérifié jusqu'à la BASE : un écran qui
 * affiche le bon libellé après un clic ne prouve rien, seul un
 * rechargement complet juge.
 *
 * RÈGLE DE CE FICHIER : ne toucher qu'à ce qu'il a lui-même créé.
 * La base de test est partagée par toute la série, et les suites
 * publiques s'appuient sur les accompagnements du jeu initial. Modifier
 * « Thérapie individuelle » ici ferait échouer un test d'accueil trois
 * fichiers plus loin, pour une raison introuvable.
 */

const NOUVEAU = {
  titre: 'Atelier de respiration (test)',
  slug: 'atelier-de-respiration-test',
  duree: '45 minutes',
  methode: 'Souffle',
  extrait: 'Une demi-heure pour retrouver un rythme.',
}

const FAMILLE_TEST = 'Famille de passage (test)'

/** Ouvre le formulaire de création et remplit le nécessaire. */
async function creer(page: Page, titre: string) {
  await page.getByRole('button', { name: 'Nouvel accompagnement' }).click()

  const dialogue = page.getByRole('dialog')
  await expect(dialogue).toBeVisible()
  await expect(
    dialogue.getByRole('heading', { name: 'Nouvel accompagnement' }),
  ).toBeVisible()

  await dialogue.getByLabel('Titre').fill(titre)
  return dialogue
}

const ligne = (page: Page, titre: string) =>
  page.getByRole('listitem').filter({ hasText: titre })

test.describe('Accompagnements — création', () => {
  test.afterEach(async ({ page }) => {
    /* Filet de sécurité : si le test a échoué en cours de route, on ne
       laisse pas l'accompagnement derrière nous pour empoisonner les
       fichiers suivants. */
    await supprimerSiPresent(page, NOUVEAU.titre)
  })

  test('un accompagnement créé apparaît, et survit au rechargement', async ({
    page,
  }) => {
    await ouvrirAdmin(page, '/admin/accompagnements', 'Accompagnements')

    const dialogue = await creer(page, NOUVEAU.titre)
    await dialogue.getByLabel('Durée').fill(NOUVEAU.duree)
    await dialogue.getByLabel('Méthode').fill(NOUVEAU.methode)
    await dialogue.getByLabel('Description courte').fill(NOUVEAU.extrait)
    await dialogue.getByRole('button', { name: 'Enregistrer' }).click()

    await attendreNotification(page, 'Accompagnement créé.')
    await expect(ligne(page, NOUVEAU.titre)).toHaveCount(1)

    /* Seul un aller-retour serveur prouve que la base a changé. */
    await persisteApresRechargement(page, async () => {
      await expect(ligne(page, NOUVEAU.titre)).toHaveCount(1)
      await expect(page.getByText(NOUVEAU.extrait)).toBeVisible()
    })
  })

  test('l’adresse de la page se déduit du titre', async ({ page }) => {
    await ouvrirAdmin(page, '/admin/accompagnements', 'Accompagnements')

    const dialogue = await creer(page, NOUVEAU.titre)

    /* Anne ne devrait jamais avoir à composer une adresse à la main. */
    await expect(dialogue.getByLabel('Adresse de la page')).toHaveValue(
      NOUVEAU.slug,
    )
  })

  test('un titre vide n’est pas enregistrable', async ({ page }) => {
    await ouvrirAdmin(page, '/admin/accompagnements', 'Accompagnements')
    await page.getByRole('button', { name: 'Nouvel accompagnement' }).click()

    const dialogue = page.getByRole('dialog')
    await expect(
      dialogue.getByRole('button', { name: 'Enregistrer' }),
    ).toBeDisabled()

    /* Un titre fait d'espaces ne vaut pas mieux. */
    await dialogue.getByLabel('Titre').fill('   ')
    await expect(
      dialogue.getByRole('button', { name: 'Enregistrer' }),
    ).toBeDisabled()
  })

  test('un titre démesuré est refusé par le serveur', async ({ page }) => {
    await ouvrirAdmin(page, '/admin/accompagnements', 'Accompagnements')

    const dialogue = await creer(page, TROP_LONG)
    await dialogue.getByRole('button', { name: 'Enregistrer' }).click()

    /* 160 caractères maximum : la borne doit tenir même si l'interface
       a laissé taper davantage. */
    await attendreNotification(page, 'Formulaire invalide.')
    await expect(dialogue).toBeVisible()
  })

  test('les caractères spéciaux d’un titre donnent une adresse propre', async ({
    page,
  }) => {
    await ouvrirAdmin(page, '/admin/accompagnements', 'Accompagnements')

    const dialogue = await creer(page, CARACTERES_SPECIAUX)
    const adresse = await dialogue
      .getByLabel('Adresse de la page')
      .inputValue()

    /* Une adresse n'accepte que minuscules, chiffres et tirets : une
       balise ou une apostrophe qui passerait ferait une URL cassée. */
    expect(adresse, `Adresse produite : « ${adresse} »`).toMatch(
      /^[a-z0-9]*(?:-[a-z0-9]+)*$/,
    )
  })

  test('une adresse déjà prise est refusée, en le disant', async ({ page }) => {
    await ouvrirAdmin(page, '/admin/accompagnements', 'Accompagnements')

    const dialogue = await creer(page, NOUVEAU.titre)
    await dialogue
      .getByLabel('Adresse de la page')
      .fill(SERVICES[0].slug)
    await dialogue.getByRole('button', { name: 'Enregistrer' }).click()

    /* Deux accompagnements à la même adresse : le second écraserait le
       premier sur le site. */
    await attendreNotification(page, 'Ce slug est déjà utilisé.')
  })

  test('annuler ne crée rien', async ({ page }) => {
    await ouvrirAdmin(page, '/admin/accompagnements', 'Accompagnements')

    const dialogue = await creer(page, NOUVEAU.titre)
    await dialogue.getByRole('button', { name: 'Annuler' }).click()

    await expect(dialogue).toBeHidden()
    await persisteApresRechargement(page, async () => {
      await expect(ligne(page, NOUVEAU.titre)).toHaveCount(0)
    })
  })
})

test.describe('Accompagnements — modification et suppression', () => {
  test.beforeEach(async ({ page }) => {
    await ouvrirAdmin(page, '/admin/accompagnements', 'Accompagnements')
    const dialogue = await creer(page, NOUVEAU.titre)
    await dialogue.getByRole('button', { name: 'Enregistrer' }).click()
    await attendreNotification(page, 'Accompagnement créé.')
  })

  test.afterEach(async ({ page }) => {
    await supprimerSiPresent(page, NOUVEAU.titre)
    await supprimerSiPresent(page, 'Atelier renommé (test)')
  })

  test('renommer un accompagnement change la base', async ({ page }) => {
    await page
      .getByRole('button', { name: `Modifier ${NOUVEAU.titre}` })
      .click()

    const dialogue = page.getByRole('dialog')
    await dialogue.getByLabel('Titre').fill('Atelier renommé (test)')
    await dialogue.getByRole('button', { name: 'Enregistrer' }).click()
    await attendreNotification(page, 'Accompagnement enregistré.')

    await persisteApresRechargement(page, async () => {
      await expect(ligne(page, 'Atelier renommé (test)')).toHaveCount(1)
      await expect(ligne(page, NOUVEAU.titre)).toHaveCount(0)
    })
  })

  test('annuler une modification ne change rien', async ({ page }) => {
    await page
      .getByRole('button', { name: `Modifier ${NOUVEAU.titre}` })
      .click()

    const dialogue = page.getByRole('dialog')
    await dialogue.getByLabel('Titre').fill('Titre qui ne doit pas rester')
    await dialogue.getByRole('button', { name: 'Annuler' }).click()

    await persisteApresRechargement(page, async () => {
      await expect(ligne(page, NOUVEAU.titre)).toHaveCount(1)
      await expect(page.getByText('Titre qui ne doit pas rester')).toHaveCount(0)
    })
  })

  test('la confirmation de suppression nomme ce qui va disparaître', async ({
    page,
  }) => {
    await page
      .getByRole('button', { name: `Supprimer ${NOUVEAU.titre}` })
      .click()

    /* « Êtes-vous sûr ? » sans objet nommé ne protège de rien. */
    await expect(
      page.getByRole('alertdialog').getByText(`Supprimer « ${NOUVEAU.titre} » ?`),
    ).toBeVisible()
  })

  test('annuler la suppression conserve l’accompagnement', async ({ page }) => {
    await page
      .getByRole('button', { name: `Supprimer ${NOUVEAU.titre}` })
      .click()
    await page.getByRole('button', { name: 'Annuler' }).click()

    await persisteApresRechargement(page, async () => {
      await expect(ligne(page, NOUVEAU.titre)).toHaveCount(1)
    })
  })

  test('confirmer la suppression le retire de la base', async ({ page }) => {
    await page
      .getByRole('button', { name: `Supprimer ${NOUVEAU.titre}` })
      .click()
    await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
    await attendreNotification(page, 'Supprimé.')

    await persisteApresRechargement(page, async () => {
      await expect(ligne(page, NOUVEAU.titre)).toHaveCount(0)
    })
  })

  test('masquer un accompagnement le retire du site, pas de l’administration', async ({
    page,
  }) => {
    /*
     * D'abord la propagation DANS L'AUTRE SENS : l'accompagnement vient
     * d'être créé, il doit déjà être sur le site. Sans cette première
     * assertion, la seconde passerait toute seule — il suffirait que
     * l'accueil n'ait jamais été rafraîchi.
     */
    await page.goto('/')
    await expect(page.getByText(NOUVEAU.titre)).toHaveCount(1)

    await ouvrirAdmin(page, '/admin/accompagnements', 'Accompagnements')
    await page
      .getByRole('switch', { name: `Afficher ${NOUVEAU.titre}` })
      .click()

    await persisteApresRechargement(page, async () => {
      await expect(ligne(page, NOUVEAU.titre)).toHaveCount(1)
      await expect(
        page.getByRole('switch', { name: `Afficher ${NOUVEAU.titre}` }),
      ).not.toBeChecked()
    })

    /* Le site public, lui, ne doit plus le connaître. */
    await page.goto('/')
    await expect(page.getByText(NOUVEAU.titre)).toHaveCount(0)
  })
})

/** Libellé donné par l'application à un titre fraîchement ajouté. */
const NOUVEAU_TITRE = 'Nouveau titre'

test.describe('Accompagnements — titres de regroupement', () => {
  test.beforeEach(async ({ page }) => {
    /* Terrain net : un bloc laissé par un test interrompu fausserait
       tous les décomptes de celui-ci. */
    await supprimerParLibelle(page, NOUVEAU_TITRE)

    await page.getByRole('button', { name: 'Ajouter un titre' }).click()
    await expect(titreFamille(page, NOUVEAU_TITRE)).toHaveCount(1)
  })

  test.afterEach(async ({ page }) => {
    for (const libelle of [NOUVEAU_TITRE, FAMILLE_TEST]) {
      await supprimerFamilleSiPresente(page, libelle)
    }
  })

  test('un titre ajouté puis renommé tient après rechargement', async ({
    page,
  }) => {
    await renommerFamille(page, NOUVEAU_TITRE, FAMILLE_TEST)

    await persisteApresRechargement(page, async () => {
      await expect(titreFamille(page, FAMILLE_TEST)).toHaveCount(1)
      await expect(titreFamille(page, NOUVEAU_TITRE)).toHaveCount(0)
    })
  })

  test('Échap abandonne le renommage', async ({ page }) => {
    await titreFamille(page, NOUVEAU_TITRE).click()

    const champ = page.getByRole('textbox').last()
    await champ.fill('Ce nom ne doit pas être retenu')
    await champ.press('Escape')

    await expect(page.getByText('Ce nom ne doit pas être retenu')).toHaveCount(0)
    await expect(titreFamille(page, NOUVEAU_TITRE)).toHaveCount(1)
  })

  test('un titre vidé revient à son libellé, plutôt que de disparaître', async ({
    page,
  }) => {
    await titreFamille(page, NOUVEAU_TITRE).click()

    const champ = page.getByRole('textbox').last()
    await champ.fill('   ')
    await page.getByRole('button', { name: 'Valider' }).click()

    /* Un bloc sans nom serait impossible à désigner, donc impossible à
       supprimer. */
    await expect(titreFamille(page, NOUVEAU_TITRE)).toHaveCount(1)
  })

  test('supprimer un titre conserve les accompagnements', async ({ page }) => {
    await page
      .getByRole('button', { name: `Supprimer ${NOUVEAU_TITRE}` })
      .click()

    /* La promesse faite à Anne avant qu'elle ne confirme. */
    await expect(
      page.getByRole('alertdialog').getByText(/les accompagnements restent/),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Supprimer', exact: true }).click()

    await persisteApresRechargement(page, async () => {
      await expect(titreFamille(page, NOUVEAU_TITRE)).toHaveCount(0)
      /* Les deux accompagnements du jeu initial sont toujours là. */
      for (const service of SERVICES) {
        await expect(ligne(page, service.titre)).toHaveCount(1)
      }
    })
  })
})

/* ── Outils de nettoyage ────────────────────────────────────────────────
   Un test qui laisse une trace fait échouer le suivant pour une raison
   qui n'a rien à voir avec lui. Ces aides sont tolérantes : elles ne
   font rien si l'objet a déjà disparu. */

/**
 * Ouvre la liste ET ATTEND QU'ELLE SOIT RENDUE.
 *
 * `count()` ne patiente pas : c'est un relevé instantané. Conclure
 * « absent » sur une page encore en cours d'hydratation, c'est ne rien
 * supprimer du tout — et faire échouer six tests plus loin sur un
 * « Ce slug est déjà utilisé » parfaitement incompréhensible. On s'ancre
 * donc d'abord sur un élément dont on SAIT qu'il est là.
 */
async function listeChargee(page: Page) {
  await page.goto('/admin/accompagnements', { waitUntil: 'domcontentloaded' })
  await expect(
    page.getByRole('button', { name: `Supprimer ${SERVICES[0].titre}` }),
  ).toHaveCount(1, { timeout: 20_000 })
}

/**
 * Supprime TOUTES les entrées portant ce libellé.
 *
 * Au pluriel, parce qu'un test interrompu en laisse parfois deux : n'en
 * retirer qu'une suffisait à faire échouer le suivant sur un décompte
 * inattendu.
 */
async function supprimerParLibelle(page: Page, libelle: string) {
  await listeChargee(page)

  const bouton = page.getByRole('button', { name: `Supprimer ${libelle}` })

  /* Borne haute : mieux vaut un test qui échoue qu'une boucle infinie. */
  for (let reste = await bouton.count(); reste > 0 && reste < 20; reste -= 1) {
    await bouton.first().click()
    await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
    await expect(bouton).toHaveCount(reste - 1, { timeout: 15_000 })
  }

  await expect(bouton).toHaveCount(0, { timeout: 15_000 })
}

const supprimerSiPresent = supprimerParLibelle
const supprimerFamilleSiPresente = supprimerParLibelle

async function renommerFamille(page: Page, actuel: string, nouveau: string) {
  await titreFamille(page, actuel).click()
  const champ = page.getByRole('textbox').last()
  await champ.fill(nouveau)
  await page.getByRole('button', { name: 'Valider' }).click()

  /* Le libellé change à l'écran AVANT la réponse du serveur. S'arrêter
     là, c'est prendre l'affichage optimiste pour une écriture : on attend
     donc la confirmation, et en cas de refus l'aide nomme le message. */
  await expect(titreFamille(page, nouveau)).toHaveCount(1)
  await attendreNotification(page, 'Titre renommé.')
}

/**
 * Le bouton qui porte l'intitulé d'un bloc — celui qui ouvre le
 * renommage.
 *
 * `exact` est indispensable : par défaut `getByRole` cherche une
 * SOUS-CHAÎNE, et « Nouveau titre » désignait alors trois boutons à la
 * fois — la poignée « Déplacer le bloc Nouveau titre », l'intitulé, et
 * « Supprimer Nouveau titre ».
 */
function titreFamille(page: Page, libelle: string) {
  return page.getByRole('button', { name: libelle, exact: true })
}
