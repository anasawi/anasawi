import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Cible du bouton « Modifier » de la barre d'administration du site public.
 *
 * Le site étant une single page, il n'y a plus de slug à résoudre : toutes
 * les demandes d'édition mènent au constructeur de la page d'accueil.
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.redirect(new URL('/admin/accueil', request.url))
}
