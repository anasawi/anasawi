import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { clientIp, hashIp, rateLimit } from '@/lib/rate-limit'
import { db } from '@/server/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * RÉVEIL avant la connexion. La page de connexion l'appelle dès qu'elle
 * s'affiche, pendant qu'on tape son mot de passe : la base Neon (mise en
 * veille après quelques minutes sans visite de l'admin) et le serveur se
 * réveillent AVANT le clic sur « Se connecter » — au lieu de faire
 * attendre la connexion, puis le tableau de bord.
 *
 * Ne renvoie rien, ne lit rien : un `select 1`. Limité par adresse pour
 * qu'on ne puisse pas s'en servir pour tenir la base éveillée.
 */
export async function GET(request: Request) {
  if (!rateLimit(`reveil:${hashIp(clientIp(request))}`, { limit: 20, windowMs: 10 * 60 * 1000 }).allowed)
    return new NextResponse(null, { status: 204 })
  await db.execute(sql`select 1`)
  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
}
