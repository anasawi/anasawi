'use server'

import { hash } from 'bcryptjs'
import { and, asc, desc, eq, gt, isNull, sql } from 'drizzle-orm'
import { createHash, randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { fail, guard, ok, type ActionResult } from './types'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/server/db'
import { invitations, users } from '@/server/db/schema'

/**
 * Utilisateurs de l'administration.
 *
 * On CRÉE une personne (nom, e-mail), jamais son mot de passe : l'action
 * rend un lien d'invitation, à lui transmettre, sur lequel elle choisit
 * son mot de passe elle-même. Le lien vaut sept jours, une seule fois.
 * En refaire un pour la même personne invalide le précédent.
 *
 * Seule l'EMPREINTE du jeton est en base (SHA-256) : le jeton en clair
 * n'existe que dans le lien rendu à l'écran, une fois.
 */

const DUREE_INVITATION_MS = 7 * 24 * 60 * 60 * 1000

const nouvelUtilisateurSchema = z.object({
  name: z.string().trim().min(2, 'Indiquez le nom de la personne.').max(120, 'Le nom est trop long (120 caractères maximum).'),
  email: z.string().trim().toLowerCase().email('Cette adresse e-mail n’est pas valide.').max(180),
})

const motDePasseSchema = z
  .object({
    password: z.string().min(10, 'Choisissez au moins 10 caractères.').max(200, 'Le mot de passe est trop long (200 caractères maximum).'),
    confirmation: z.string(),
  })
  .refine((v) => v.password === v.confirmation, {
    path: ['confirmation'],
    message: 'Les deux mots de passe ne sont pas identiques.',
  })

function empreinte(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Un nouveau lien pour cette personne ; les précédents ne valent plus. */
async function nouvelleInvitation(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  await db
    .update(invitations)
    .set({ usedAt: new Date() })
    .where(and(eq(invitations.userId, userId), isNull(invitations.usedAt)))
  await db.insert(invitations).values({
    userId,
    tokenHash: empreinte(token),
    expiresAt: new Date(Date.now() + DUREE_INVITATION_MS),
  })
  return `/invitation/${token}`
}

export type UtilisateurListe = {
  id: string
  name: string
  email: string
  role: 'owner' | 'editor'
  /** A choisi son mot de passe : peut se connecter. */
  actif: boolean
  lastLoginAt: Date | null
  createdAt: Date
  /** Une invitation encore valable est en attente. */
  invitationEnCours: boolean
  /** C'est la personne connectée. */
  moi: boolean
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
        invitationEnCours: sql<boolean>`exists(select 1 from ${invitations} where ${invitations.userId} = ${users.id} and ${invitations.usedAt} is null and ${invitations.expiresAt} > now())`,
      })
      .from(users)
      .orderBy(asc(users.createdAt))
    return ok(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        actif: Boolean(r.passwordHash),
        lastLoginAt: r.lastLoginAt,
        createdAt: r.createdAt,
        invitationEnCours: r.invitationEnCours,
        moi: r.id === moi.id,
      })),
    )
  })
}

export async function createUser(
  input: z.input<typeof nouvelUtilisateurSchema>,
): Promise<ActionResult<{ id: string; lien: string }>> {
  return guard(async () => {
    await requireAdmin()
    const parsed = nouvelUtilisateurSchema.safeParse(input)
    if (!parsed.success) {
      return fail('Certains champs sont à corriger.', parsed.error.flatten().fieldErrors)
    }

    const [existant] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${parsed.data.email}`)
      .limit(1)
    if (existant) {
      const message = 'Un compte existe déjà avec cette adresse e-mail.'
      return fail(message, { email: [message] })
    }

    const [created] = await db
      .insert(users)
      .values({ name: parsed.data.name, email: parsed.data.email, passwordHash: null, role: 'editor' })
      .returning({ id: users.id })
    if (!created) return fail('La création n’a pas abouti. Réessayez dans un instant.')

    const lien = await nouvelleInvitation(created.id)
    revalidatePath('/admin/utilisateurs')
    return ok({ id: created.id, lien })
  })
}

/** Un nouveau lien d'invitation — pour une personne qui n'a pas encore
    choisi son mot de passe, ou qui l'a oublié. */
export async function renewInvitation(userId: string): Promise<ActionResult<{ lien: string }>> {
  return guard(async () => {
    await requireAdmin()
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1)
    if (!user) return fail('Cette personne n’existe plus. Rechargez la page.')
    const lien = await nouvelleInvitation(user.id)
    revalidatePath('/admin/utilisateurs')
    return ok({ lien })
  })
}

export async function deleteUser(userId: string): Promise<ActionResult<void>> {
  return guard(async () => {
    const moi = await requireAdmin()
    if (userId === moi.id) return fail('Vous ne pouvez pas supprimer votre propre compte.')

    await db.delete(users).where(eq(users.id, userId))
    revalidatePath('/admin/utilisateurs')
    return ok()
  })
}

/* ── Côté invité : le lien, puis le mot de passe ─────────────────────── */

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
        eq(invitations.tokenHash, empreinte(token)),
        isNull(invitations.usedAt),
        gt(invitations.expiresAt, new Date()),
      ),
    )
    .limit(1)
  return row ?? null
}

export async function setPasswordFromInvitation(
  token: string,
  input: z.input<typeof motDePasseSchema>,
): Promise<ActionResult<void>> {
  return guard(async () => {
    const parsed = motDePasseSchema.safeParse(input)
    if (!parsed.success) {
      return fail('Certains champs sont à corriger.', parsed.error.flatten().fieldErrors)
    }

    const [invitation] = await db
      .select({ id: invitations.id, userId: invitations.userId })
      .from(invitations)
      .where(
        and(
          eq(invitations.tokenHash, empreinte(token)),
          isNull(invitations.usedAt),
          gt(invitations.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(invitations.createdAt))
      .limit(1)
    if (!invitation) {
      return fail('Ce lien n’est plus valable. Demandez-en un nouveau à la personne qui vous a invité·e.')
    }

    const passwordHash = await hash(parsed.data.password, 12)
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, invitation.userId))
    await db.update(invitations).set({ usedAt: new Date() }).where(eq(invitations.id, invitation.id))
    return ok()
  })
}
