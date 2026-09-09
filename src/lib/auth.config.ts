import type { NextAuthConfig } from 'next-auth'

/**
 * Configuration « edge-safe » : aucune dépendance à la base ni à bcrypt.
 * C'est elle que le middleware importe, ce qui lui permet de tourner sur le
 * runtime Edge sans embarquer le driver Postgres.
 */
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
      const isProtected =
        pathname.startsWith('/admin') || pathname.startsWith('/preview')
      if (!isProtected) return true
      return Boolean(auth?.user)
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as { role?: string }).role ?? 'editor'
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as 'owner' | 'editor'
      }
      return session
    },
  },
} satisfies NextAuthConfig
