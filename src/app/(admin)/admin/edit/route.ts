import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Cible du bouton « Modifier » de la barre d'administration du site public.
 *
 * Le site est une page unique : quelle que soit l'adresse d'où l'on vient,
 * l'éditeur, c'est `/admin/accueil`. L'adresse reste (anciens favoris,
 * pilule des versions précédentes) et redirige simplement.
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.redirect(new URL('/admin/accueil', request.url))
}
