import { expect, test as setup } from '@playwright/test'
import { COMPTE } from './fixtures'

/**
 * Se connecte une fois pour toutes et conserve la session sur disque.
 *
 * La connexion passe par le vrai formulaire — pas par un cookie fabriqué :
 * c'est la seule façon de savoir que l'authentification fonctionne. Les
 * suites d'administration réutilisent ensuite cet état, ce qui évite de
 * rejouer la connexion à chaque fichier et de heurter la limitation de
 * débit du formulaire.
 *
 * Les tests du formulaire lui-même (identifiants faux, champs vides,
 * limitation de débit) partent d'un contexte vierge, dans `auth.spec.ts`.
 */
export const FICHIER_SESSION = 'e2e/.auth/session.json'

setup('authentifier l’administratrice', async ({ page }) => {
  await page.goto('/login')

  await page.getByLabel('E-mail').fill(COMPTE.email)
  await page.getByLabel('Mot de passe').fill(COMPTE.motDePasse)
  await page.getByRole('button', { name: /se connecter/i }).click()

  /* La redirection vers l'administration est la preuve que la session est
     ouverte — pas la disparition du formulaire.
     Le tableau de bord salue par le prénom de la PRATICIENNE, tiré des
     réglages du site, pas par celui de la personne connectée : on vise donc
     le motif, pas le nom du compte de test. */
  await page.waitForURL(/\/admin/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { name: /^Bonjour/ })).toBeVisible()

  await page.context().storageState({ path: FICHIER_SESSION })
})
