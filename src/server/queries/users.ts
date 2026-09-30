/*
 * Lectures — utilisateurs et invitations.
 *
 * Module serveur uniquement (le paquet `server-only` n'est pas installé :
 * ce commentaire en tient lieu). Ces fonctions sont sorties du fichier
 * `'use server'` des actions : une fonction exportée d'un tel fichier
 * devient un endpoint POST appelable par n'importe qui, ce qu'une lecture
 * de page n'a aucune raison d'être.
 */

import { and, asc, desc, eq, gt, isNull } from 'drizzle-orm'

import { db } from '../db'
import { invitations, users, type UserRole } from '../db/schema'
import {
  decryptInvitationToken,
  hashInvitationToken,
} from '../invitation-token'
import { requireAdmin } from '@/lib/auth'
import { guard, ok, type ActionResult } from '@/server/actions/types'

export type UtilisateurListe = {
  id: string
  name: string
  email: string
  role: UserRole
  /** A choisi son mot de passe : peut se connecter. */
  actif: boolean
  lastLoginAt: Date | null
  createdAt: Date
  /** L'invitation en cours, s'il y en a une : son lien (chemin) et sa
      date d'expiration — ou, à défaut, la dernière invitation périmée. */
  invitation: { lien: string; expiresAt: Date; valable: boolean } | null
  /** C'est la personne connectée. */
  moi: boolean
}

/** La personne existe-t-elle encore en base ? (layout de l'administration :
    un jeton de session vaut sept jours, un compte supprimé non.) */
export async function userExists(id: string): Promise<boolean> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
  return Boolean(row)
}

export async function listUsers(): Promise<ActionResult<UtilisateurListe[]>> {
  return guard(async () => {
    const moi = await requireAdmin()
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        passwordHash: users.passwordHash,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(asc(users.createdAt))
    /* La dernière invitation non utilisée de chaque personne : valable ou
       périmée, on la montre — avec son lien tant qu'elle vaut. Le jeton
       est déchiffré ici, et seulement pour les invitations encore
       valables. */
    const nonUtilisees = await db
      .select({ userId: invitations.userId, token: invitations.token, expiresAt: invitations.expiresAt })
      .from(invitations)
      .where(isNull(invitations.usedAt))
      .orderBy(desc(invitations.createdAt))
    const derniere = new Map<string, { token: string | null; expiresAt: Date }>()
    for (const i of nonUtilisees) if (!derniere.has(i.userId)) derniere.set(i.userId, i)
    const maintenant = Date.now()
    return ok(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        actif: Boolean(r.passwordHash),
        lastLoginAt: r.lastLoginAt,
        createdAt: r.createdAt,
        invitation: (() => {
          const i = derniere.get(r.id)
          if (!i || r.passwordHash) return null
          const token = i.expiresAt.getTime() > maintenant ? decryptInvitationToken(i.token) : null
          const valable = Boolean(token)
          return { lien: token ? `/invitation/${token}` : '', expiresAt: i.expiresAt, valable }
        })(),
        moi: r.id === moi.id,
      })),
    )
  })
}

/* ── Côté invité ──────────────────────────────────────────────────────── */

export type InvitationOuverte = { name: string; email: string }

/** Le lien est-il encore bon ? Rend la personne concernée, sans rien
    modifier. */
export async function readInvitation(token: string): Promise<InvitationOuverte | null> {
  if (!token || token.length > 200) return null
  const [row] = await db
    .select({ name: users.name, email: users.email })
    .from(invitations)
    .innerJoin(users, eq(users.id, invitations.userId))
    .where(
      and(
        eq(invitations.tokenHash, hashInvitationToken(token)),
        isNull(invitations.usedAt),
        gt(invitations.expiresAt, new Date()),
      ),
    )
    .limit(1)
  return row ?? null
}
