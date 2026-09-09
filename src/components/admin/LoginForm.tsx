'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { signInAction } from '@/server/actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-[2px] bg-ink px-6 py-3.5 text-[0.8rem] uppercase tracking-[0.14em] text-ivory transition-opacity duration-400 hover:opacity-88 disabled:opacity-60"
    >
      {pending ? 'Connexion…' : 'Se connecter'}
    </button>
  )
}

export function LoginForm() {
  const [state, formAction] = useActionState(signInAction, {})

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label
          htmlFor="email"
          className="block text-[0.72rem] uppercase tracking-[0.16em] text-stone"
        >
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className="mt-2 w-full border-0 border-b border-line bg-transparent pb-2.5 pt-1.5 text-[0.95rem] outline-none transition-colors duration-500 focus:border-blue-deep"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-[0.72rem] uppercase tracking-[0.16em] text-stone"
        >
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-2 w-full border-0 border-b border-line bg-transparent pb-2.5 pt-1.5 text-[0.95rem] outline-none transition-colors duration-500 focus:border-blue-deep"
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-[0.82rem] text-[#b4342c]">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}
