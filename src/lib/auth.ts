import { compare } from 'bcryptjs'
import { eq, sql } from 'drizzle-orm'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

import { authConfig } from './auth.config'
import { loginSchema } from './schemas'
import { db } from '@/server/db'
import { users } from '@/server/db/schema'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const [user] = await db
          .select()
          .from(users)
          .where(sql`lower(${users.email}) = lower(${parsed.data.email})`)
          .limit(1)

        if (!user) {
          /* Comparaison factice : le temps de réponse ne doit pas révéler
             si l'adresse existe. */
          await compare(parsed.data.password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva')
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

/**
 * Garde à appeler au début de chaque Server Action d'écriture.
 * Le middleware protège le rendu ; il ne protège pas les actions, qui sont
 * des endpoints POST appelables directement.
 */
export async function requireAdmin() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Non autorisé.')
  }
  return session.user
}
