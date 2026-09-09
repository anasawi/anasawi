'use server'

import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'

import { signIn, signOut } from '@/lib/auth'

export async function signOutAction() {
  await signOut({ redirectTo: '/login' })
}

/**
 * Connexion par identifiants.
 *
 * Le message d'erreur ne distingue jamais « adresse inconnue » de « mot de
 * passe incorrect » : cette distinction permettrait d'énumérer les comptes.
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
      return { error: 'Identifiants incorrects.' }
    }
    throw error
  }

  redirect('/admin')
}
