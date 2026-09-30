import type { NextAuthConfig } from 'next-auth'

/**
 * Configuration « edge-safe » : aucune dépendance à la base ni à bcrypt.
 * C'est elle que le middleware importe, ce qui lui permet de tourner sur le
 * runtime Edge sans embarquer le driver Postgres.
 */

/** Préfixes réservés à une session. Le `matcher` de `middleware.ts` doit
    les couvrir aussi — c'est lui qui décide si ce rappel est consulté. */
const PROTECTED_PREFIXES = ['/admin']

export const authConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl
      const isProtected = PROTECTED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      )
      if (!isProtected) return true
      return Boolean(auth?.user)
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role ?? 'editor'
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? ''
        session.user.role = token.role ?? 'editor'
      }
      return session
    },
  },
} satisfies NextAuthConfig
