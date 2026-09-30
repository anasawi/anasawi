import type { DefaultSession } from 'next-auth'

import type { UserRole } from '@/server/db/schema'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: UserRole
    } & DefaultSession['user']
  }

  interface User {
    role?: UserRole
  }
}

/*
 * Le jeton est augmenté sous les DEUX chemins : `next-auth/jwt` (le
 * paquet d'enrobage) et `@auth/core/jwt` (celui que les rappels de
 * `NextAuthConfig` voient réellement). Sans le second, `token.role` reste
 * `unknown` dans `callbacks.jwt`/`session`, et `auth.config.ts` devait
 * recourir à des `as`.
 */
declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: UserRole
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id?: string
    role?: UserRole
  }
}

export {}
