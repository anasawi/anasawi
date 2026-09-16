import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { getPageRefBySlug } from '@/server/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Cible du bouton « Modifier » de la barre d'administration du site public.
 *
 * `AdminBar` passe le slug de la page visitée (`?slug=`) — vide pour
 * l'accueil. On ouvre l'éditeur de cette page : `/admin/accueil` pour la
 * page marquée accueil, `/admin/pages/<id>` pour une page secondaire. Un
 * slug inconnu (page supprimée entre-temps, URL forgée) retombe sur
 * l'accueil plutôt que sur un 404 hors du shell d'administration.
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const raw = new URL(request.url).searchParams.get('slug') ?? ''
  const slug = raw.trim().replace(/^\/+|\/+$/g, '')

  if (slug === '') {
    return NextResponse.redirect(new URL('/admin/accueil', request.url))
  }

  const page = await getPageRefBySlug(slug).catch(() => null)
  const target = !page
    ? '/admin/accueil'
    : page.isHome
      ? '/admin/accueil'
      : `/admin/pages/${page.id}`

  return NextResponse.redirect(new URL(target, request.url))
}
