import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'

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

  return NextResponse.json(
    session?.user
      ? {
          admin: true,
          name: session.user.name ?? session.user.email ?? 'Admin',
        }
      : { admin: false },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
