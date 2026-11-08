'use client'

import { useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signInAction } from '@/server/actions/auth'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" size="lg" disabled={pending} aria-busy={pending} className="w-full">
      {pending ? 'Connexion…' : 'Se connecter'}
    </Button>
  )
}

export function LoginForm() {
  const [state, formAction] = useActionState(signInAction, {})

  /* Pendant qu'on tape : la base et le serveur se réveillent, et le
     tableau de bord se prépare — la connexion n'attend plus personne. */
  useEffect(() => {
    void fetch('/api/connexion/reveil', { cache: 'no-store' }).catch(() => undefined)
  }, [])

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <Label htmlFor="email" className="mb-2 block">
          E-mail
        </Label>
        <Input id="email" name="email" type="email" required autoComplete="username" className="h-11" />
      </div>

      <div>
        <Label htmlFor="password" className="mb-2 block">
          Mot de passe
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-11"
        />
      </div>

      {state?.error && (
        <p
          role="alert"
          className="rounded-[10px] border border-destructive/20 bg-danger-soft px-3.5 py-2.5 text-[13.5px] text-destructive"
        >
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}
