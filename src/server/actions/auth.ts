'use server'

import { AuthError } from 'next-auth'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { signIn, signOut } from '@/lib/auth'

/**
 * Cookie-témoin de la pastille admin sur le site public (voir
 * `components/site/AdminBar`). Il ne prouve rien — la session reste
 * vérifiée par `/api/admin-bar` — il dit seulement au script du site
 * qu'il vaut la peine de demander tout de suite. Lisible par le script
 * (`httpOnly: false`), c'est son seul usage.
 */
const ADMIN_HINT_COOKIE = 'anasawi_admin'

const ADMIN_HINT_MAX_AGE = 60 * 60 * 24 * 30

async function setAdminHintCookie(present: boolean) {
  const store = await cookies()
  if (present) {
    store.set(ADMIN_HINT_COOKIE, '1', {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false,
      maxAge: ADMIN_HINT_MAX_AGE,
    })
  } else {
    store.delete(ADMIN_HINT_COOKIE)
  }
}

export async function signOutAction() {
  await setAdminHintCookie(false)
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

  await setAdminHintCookie(true)
  redirect('/admin')
}
