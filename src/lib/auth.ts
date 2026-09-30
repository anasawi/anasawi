import { compare } from 'bcryptjs'
import { eq, sql } from 'drizzle-orm'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

import { authConfig } from './auth.config'
import { clientIp, hashIp, rateLimit } from './rate-limit'
import { loginSchema } from './schemas'
import { ForbiddenError, UnauthorizedError } from '@/server/actions/types'
import { db } from '@/server/db'
import { users, type UserRole } from '@/server/db/schema'

export { ForbiddenError, UnauthorizedError }

/** Tentatives de connexion tolérées, par IP et par adresse e-mail, sur une
    fenêtre de 15 minutes. */
const LOGIN_LIMIT = 8
const LOGIN_WINDOW_MS = 15 * 60 * 1000

/** Empreinte bcrypt syntaxiquement valide qui ne correspond à rien. */
const DUMMY_HASH = '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva'

/**
 * Limitation de débit des tentatives de connexion — ICI, dans `authorize`,
 * et non seulement dans l'action du formulaire : c'est le seul endroit par
 * lequel passe toute tentative, y compris un POST forgé sur la route
 * `/api/auth/callback/credentials`. Deux compteurs : par IP (une rafale
 * depuis une machine) et par e-mail normalisé (une adresse visée depuis
 * plusieurs machines). Comptées avant la vérification du mot de passe —
 * bcrypt (coût 12) n'est pas un frein suffisant contre un dictionnaire.
 */
function loginAllowed(request: Request, email: string | undefined): boolean {
  const options = { limit: LOGIN_LIMIT, windowMs: LOGIN_WINDOW_MS }
  const byIp = rateLimit(`login:ip:${hashIp(clientIp(request))}`, options)
  const normalized = email?.trim().toLowerCase()
  const byEmail = normalized
    ? rateLimit(`login:email:${hashIp(normalized)}`, options)
    : { allowed: true }
  return byIp.allowed && byEmail.allowed
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials, request) {
        const email =
          typeof credentials?.email === 'string' ? credentials.email : undefined
        /* Le blocage précède tout : même un mot de passe juste est refusé
           au-delà du seuil, et le message reste celui d'un identifiant
           faux — révéler le blocage indiquerait le seuil à contourner. */
        if (!loginAllowed(request, email)) return null

        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const [user] = await db
          .select()
          .from(users)
          .where(sql`lower(${users.email}) = lower(${parsed.data.email})`)
          .limit(1)

        if (!user || !user.passwordHash) {
          /* Comparaison factice : le temps de réponse ne doit pas révéler
             si l'adresse existe — ni si la personne, invitée, n'a pas
             encore choisi son mot de passe. */
          await compare(parsed.data.password, DUMMY_HASH)
          return null
        }

        const valid = await compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        await db
          .update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, user.id))

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
})

export type AdminUser = {
  id: string
  email: string
  name: string
  role: UserRole
}

/**
 * Garde à appeler au début de chaque Server Action d'écriture.
 *
 * Le middleware protège le rendu ; il ne protège pas les actions, qui sont
 * des endpoints POST appelables directement. Et le jeton de session vaut
 * sept jours : la personne est RELUE en base, pour qu'un compte supprimé
 * (ou dont le mot de passe a été retiré) perde l'accès immédiatement, et
 * que le rôle soit celui de la base, pas celui figé dans le jeton à la
 * connexion.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const session = await auth()
  const id = session?.user?.id
  if (!id) throw new UnauthorizedError()

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  if (!user || !user.passwordHash) throw new UnauthorizedError()

  return { id: user.id, email: user.email, name: user.name, role: user.role }
}

/** Comme `requireAdmin`, réservé au rôle propriétaire. */
export async function requireOwner(): Promise<AdminUser> {
  const user = await requireAdmin()
  if (user.role !== 'owner') throw new ForbiddenError('Réservé au propriétaire.')
  return user
}
