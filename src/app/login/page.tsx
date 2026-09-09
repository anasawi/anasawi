import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { LoginForm } from '@/components/admin/LoginForm'
import { LogoMark } from '@/components/site/Logo'
import { auth } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Connexion — AMASWI',
  robots: { index: false, follow: false },
}

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) redirect('/admin')

  return (
    <main className="grain flex min-h-svh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center text-center">
          <LogoMark className="h-10 w-10 text-ink" />
          <p className="mt-5 font-serif text-[0.95rem] tracking-[0.28em] text-ink">
            AMASWI
          </p>
          <p className="mt-2 text-[0.78rem] uppercase tracking-[0.16em] text-stone">
            Administration
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  )
}
