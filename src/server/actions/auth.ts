'use server'

import { AuthError } from 'next-auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { signIn, signOut } from '@/lib/auth'
import { hashIp, rateLimit } from '@/lib/rate-limit'

export async function signOutAction() {
  await signOut({ redirectTo: '/login' })
}

/** Un seul message pour tous les échecs — voir `signInAction`. */
const GENERIC_ERROR = 'Identifiants incorrects.'

/** Tentatives de connexion tolérées par IP sur une fenêtre de 15 minutes. */
const LOGIN_LIMIT = 8
const LOGIN_WINDOW_MS = 15 * 60 * 1000

/**
 * Adresse IP de l'appelant d'une Server Action.
 *
 * Derrière Vercel, `x-forwarded-for` porte la chaîne de relais : le premier
 * élément est le client. `x-real-ip` en repli ; `'local'` en développement,
 * où aucun de ces en-têtes n'existe.
 */
async function callerIp(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'local'
  return h.get('x-real-ip') ?? 'local'
}

/**
 * Connexion par identifiants.
 *
 * Le message d'erreur ne distingue jamais « adresse inconnue » de « mot de
 * passe incorrect » : cette distinction permettrait d'énumérer les comptes.
 * Le blocage par limitation de débit renvoie LE MÊME message : révéler le
 * blocage indiquerait à un attaquant le seuil et la fenêtre à contourner.
 */
export async function signInAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  /* Limitation de débit : 8 tentatives par IP et par quart d'heure, comptées
     avant même de vérifier le mot de passe — bcrypt (coût 12) n'est pas un
     frein suffisant contre une attaque par dictionnaire. */
  const ip = await callerIp()
  const { allowed } = rateLimit(`login:${hashIp(ip)}`, {
    limit: LOGIN_LIMIT,
    windowMs: LOGIN_WINDOW_MS,
  })
  if (!allowed) {
    return { error: GENERIC_ERROR }
  }

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
