'use server'

import { hash } from 'bcryptjs'
import { and, count, eq, isNull, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { adminAction } from './admin'
import { MESSAGES } from './messages'
import { fail, formError, guard, isUuid, ok, type ActionResult } from './types'
import { db } from '@/server/db'
import { invitations, users } from '@/server/db/schema'
import {
  encryptInvitationToken,
  generateInvitationToken,
  hashInvitationToken,
} from '@/server/invitation-token'

/**
 * Utilisateurs de l'administration.
 *
 * On CRÉE une personne (nom, e-mail), jamais son mot de passe : l'action
 * rend un lien d'invitation, à lui transmettre, sur lequel elle choisit
 * son mot de passe elle-même. Le lien vaut sept jours, une seule fois.
 * En refaire un pour la même personne invalide le précédent.
 *
 * En base, le jeton est cherché par son EMPREINTE (SHA-256) et conservé
 * CHIFFRÉ (voir `server/invitation-token.ts`) pour que le lien reste
 * recopiable tant qu'il vaut. Les lectures (`listUsers`, `readInvitation`)
 * vivent dans `server/queries/users.ts` : ce fichier n'expose que des
 * écritures.
 */

export type { InvitationOuverte, UtilisateurListe } from '@/server/queries/users'

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

/**
 * Un nouveau lien pour cette personne ; les précédents ne valent plus.
 * Les deux écritures partent dans un même lot : pas d'état où l'ancien
 * lien est mort sans que le nouveau existe.
 */
async function nouvelleInvitation(userId: string): Promise<string> {
  const token = generateInvitationToken()
  await db.batch([
    db
      .update(invitations)
      .set({ usedAt: new Date() })
      .where(and(eq(invitations.userId, userId), isNull(invitations.usedAt))),
    db.insert(invitations).values({
      userId,
      tokenHash: hashInvitationToken(token),
      token: encryptInvitationToken(token),
      expiresAt: new Date(Date.now() + DUREE_INVITATION_MS),
    }),
  ])
  return `/invitation/${token}`
}

export async function createUser(
  input: z.input<typeof nouvelUtilisateurSchema>,
): Promise<ActionResult<{ id: string; lien: string }>> {
  return adminAction(async () => {
    const parsed = nouvelUtilisateurSchema.safeParse(input)
    if (!parsed.success) return formError(parsed.error, MESSAGES.champsACorriger)

    const [existant] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${parsed.data.email}`)
      .limit(1)
    if (existant) {
      return fail(MESSAGES.compteExistant, { email: [MESSAGES.compteExistant] })
    }

    /* Toujours éditeur : un propriétaire ne se crée pas depuis l'écran. */
    const [created] = await db
      .insert(users)
      .values({ name: parsed.data.name, email: parsed.data.email, passwordHash: null, role: 'editor' })
      .returning({ id: users.id })
    if (!created) return fail(MESSAGES.creationEchouee)

    const lien = await nouvelleInvitation(created.id)
    revalidatePath('/admin/utilisateurs')
    return ok({ id: created.id, lien })
  })
}

/**
 * Un nouveau lien d'invitation — pour une personne qui n'a pas encore
 * choisi son mot de passe, ou qui l'a oublié.
 *
 * Pour un compte ACTIF (qui a un mot de passe), le lien vaut une
 * réinitialisation : un éditeur ne peut pas s'en servir pour prendre le
 * compte d'un autre. Seule la personne propriétaire peut le faire — ou
 * chacun pour son propre compte.
 */
export async function renewInvitation(userId: string): Promise<ActionResult<{ lien: string }>> {
  return adminAction(async (moi) => {
    if (!isUuid(userId)) return fail(MESSAGES.personneIntrouvable)
    const [user] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    if (!user) return fail(MESSAGES.personneIntrouvable)
    if (user.passwordHash && moi.role !== 'owner' && moi.id !== user.id) {
      return fail(MESSAGES.compteActifPasDeLien)
    }
    const lien = await nouvelleInvitation(user.id)
    revalidatePath('/admin/utilisateurs')
    return ok({ lien })
  })
}

export async function deleteUser(userId: string): Promise<ActionResult<void>> {
  return adminAction(async (moi) => {
    if (!isUuid(userId)) return fail(MESSAGES.personneIntrouvable)
    if (userId === moi.id) return fail(MESSAGES.propreCompte)

    const [cible] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    if (!cible) return fail(MESSAGES.personneIntrouvable)

    if (cible.role === 'owner') {
      if (moi.role !== 'owner') return fail(MESSAGES.supprimerProprietaire)
      /* Le dernier propriétaire ne se supprime pas : plus personne ne
         pourrait gérer les comptes. */
      const [{ n } = { n: 0 }] = await db
        .select({ n: count() })
        .from(users)
        .where(eq(users.role, 'owner'))
      if (n <= 1) return fail(MESSAGES.dernierProprietaire)
    }

    await db.delete(users).where(eq(users.id, userId))
    revalidatePath('/admin/utilisateurs')
    return ok()
  })
}

/* ── Côté invité : le mot de passe ──────────────────────────────────── */

export async function setPasswordFromInvitation(
  token: string,
  input: z.input<typeof motDePasseSchema>,
): Promise<ActionResult<void>> {
  return guard(async () => {
    const parsed = motDePasseSchema.safeParse(input)
    if (!parsed.success) return formError(parsed.error, MESSAGES.champsACorriger)
    if (!token || token.length > 200) return fail(MESSAGES.invitationInvalide)

    /* Le coût de bcrypt est payé avant de consommer le lien : si l'on
       consommait d'abord, une panne entre les deux laisserait un lien
       mort et un compte sans mot de passe. */
    const passwordHash = await hash(parsed.data.password, 12)

    /* Consommation ATOMIQUE, en UNE instruction : la CTE marque
       l'invitation utilisée (condition et marque dans le même UPDATE, si
       bien que deux soumissions simultanées du même lien ne passent pas
       toutes deux), et le mot de passe n'est écrit que si elle a
       effectivement été consommée. Le driver HTTP n'a pas de transaction ;
       une seule instruction en tient lieu. */
    const result = await db.execute<{ id: string }>(sql`
      with consumed as (
        update ${invitations}
        set ${sql.identifier(invitations.usedAt.name)} = now()
        where ${invitations.tokenHash} = ${hashInvitationToken(token)}
          and ${invitations.usedAt} is null
          and ${invitations.expiresAt} > now()
        returning ${invitations.userId} as user_id
      )
      update ${users}
      set ${sql.identifier(users.passwordHash.name)} = ${passwordHash},
          ${sql.identifier(users.updatedAt.name)} = now()
      where ${users.id} = (select user_id from consumed)
      returning ${users.id} as id
    `)
    if (result.rows.length === 0) return fail(MESSAGES.invitationInvalide)

    return ok()
  })
}
