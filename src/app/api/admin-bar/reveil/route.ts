import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { db } from '@/server/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * RÉVEILLE la base pour l'administratrice qui visite le site.
 *
 * Les pages publiques sont servies sans toucher la base : pendant qu'Anne
 * lit son site, Neon s'endort (mise en veille après quelques minutes
 * d'inactivité). Le clic sur « Modifier » payait alors le réveil — plus
 * d'une seconde d'écran blanc. La pastille appelle cette route dès qu'elle
 * apparaît : la base est debout avant le clic.
 *
 * Réservée aux personnes connectées (rien à réveiller pour un visiteur).
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) return new NextResponse(null, { status: 204 })
  await db.execute(sql`select 1`)
  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
}
