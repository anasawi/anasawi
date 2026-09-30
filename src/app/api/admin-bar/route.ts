import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'

/** Même nom que dans `actions/auth.ts` — un module `'use server'` ne
    peut exporter que des fonctions asynchrones, d'où la copie. */
const ADMIN_HINT_COOKIE = 'anasawi_admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Indique si la requête vient d'un administrateur connecté.
 *
 * Cet aller-retour existe pour une raison précise : appeler `auth()` depuis le
 * layout du site publierait une dépendance aux cookies, ce qui rendrait toutes
 * les pages publiques dynamiques et supprimerait leur génération statique.
 *
 * La barre est un confort d'édition, pas du contenu : la faire apparaître une
 * fraction de seconde après l'hydratation est sans conséquence, alors que
 * dégrader le rendu statique du site le serait.
 */
export async function GET() {
  const session = await auth()

  const response = NextResponse.json(
    session?.user
      ? {
          admin: true,
          name: session.user.name ?? session.user.email ?? 'Admin',
          email: session.user.email ?? undefined,
        }
      : { admin: false },
    { headers: { 'Cache-Control': 'no-store' } },
  )

  /* En secours du cookie-témoin posé à la connexion (`actions/auth.ts`) :
     une session encore valable après l'expiration du témoin le repose,
     une session disparue le retire — le script du site ne demandera plus
     avant l'inactivité du navigateur. */
  if (session?.user) {
    response.cookies.set(ADMIN_HINT_COOKIE, '1', {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30,
    })
  } else {
    response.cookies.delete(ADMIN_HINT_COOKIE)
  }

  return response
}
