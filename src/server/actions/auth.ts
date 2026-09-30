'use server'

import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'

import { signIn, signOut } from '@/lib/auth'

export async function signOutAction() {
  await signOut({ redirectTo: '/login' })
}

/** Un seul message pour tous les échecs — voir `signInAction`. */
const GENERIC_ERROR = 'Identifiants incorrects.'

/**
 * Connexion par identifiants.
 *
 * Le message d'erreur ne distingue jamais « adresse inconnue » de « mot de
 * passe incorrect » : cette distinction permettrait d'énumérer les comptes.
 * La limitation de débit (8 essais par quart d'heure, par IP et par
 * adresse) vit dans `authorize()` (`lib/auth.ts`) : elle couvre ainsi
 * aussi un POST forgé sur la route de rappel, et non le seul formulaire.
 * Son refus ressort ici comme n'importe quel échec — LE MÊME message :
 * révéler le blocage indiquerait à un attaquant le seuil à contourner.
 */
export async function signInAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await signIn('credentials', {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      redirect: false,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: GENERIC_ERROR }
    }
    throw error
  }

  redirect('/admin')
}
