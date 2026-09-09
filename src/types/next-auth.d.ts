import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'owner' | 'editor'
    } & DefaultSession['user']
  }

  interface User {
    role?: 'owner' | 'editor'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: 'owner' | 'editor'
  }
}

export {}
