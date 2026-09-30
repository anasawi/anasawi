'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { setPasswordFromInvitation } from '@/server/actions/users'

/**
 * Le formulaire du lien d'invitation : un mot de passe, sa confirmation.
 * Même dessin que la connexion — c'est la même porte.
 */
export function InvitationForm({ token, email }: { token: string; email: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [erreurs, setErreurs] = useState<Record<string, string[]>>({})
  const [fait, setFait] = useState(false)

  const champ =
    'mt-2 w-full border-0 border-b border-line bg-transparent pb-2.5 pt-1.5 text-[0.95rem] outline-none transition-colors duration-500 focus:border-blue-deep'
  const libelle = 'block text-[0.72rem] uppercase tracking-[0.16em] text-stone'

  if (fait) {
    return (
      <div role="status" className="space-y-6">
        <p className="text-[0.9rem] leading-relaxed text-ink">
          Votre mot de passe est enregistré. Vous pouvez vous connecter.
        </p>
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="w-full rounded-[2px] bg-ink px-6 py-3.5 text-[0.8rem] uppercase tracking-[0.14em] text-ivory transition-opacity duration-400 hover:opacity-88"
        >
          Se connecter
        </button>
      </div>
    )
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        setErreur(null)
        setErreurs({})
        start(async () => {
          const result = await setPasswordFromInvitation(token, { password, confirmation })
          if (!result.ok) {
            setErreurs(result.fieldErrors ?? {})
            setErreur(result.fieldErrors ? null : result.error)
            return
          }
          setFait(true)
        })
      }}
    >
      {/* L'adresse, pour que le navigateur associe le mot de passe au bon
          compte dans son trousseau. */}
      <input type="hidden" name="username" autoComplete="username" value={email} readOnly />

      <div>
        <label htmlFor="password" className={libelle}>
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          autoFocus
          value={password}
          aria-invalid={erreurs.password ? true : undefined}
          aria-describedby="password-aide"
          onChange={(e) => setPassword(e.target.value)}
          className={champ}
        />
        <p id="password-aide" className={`mt-2 text-[0.78rem] ${erreurs.password ? 'text-[#b4342c]' : 'text-stone'}`} role={erreurs.password ? 'alert' : undefined}>
          {erreurs.password?.[0] ?? 'Au moins 10 caractères. Une phrase facile à retenir fait un bon mot de passe.'}
        </p>
      </div>

      <div>
        <label htmlFor="confirmation" className={libelle}>
          Le même, une seconde fois
        </label>
        <input
          id="confirmation"
          name="confirmation"
          type="password"
          required
          autoComplete="new-password"
          value={confirmation}
          aria-invalid={erreurs.confirmation ? true : undefined}
          aria-describedby={erreurs.confirmation ? 'confirmation-erreur' : undefined}
          onChange={(e) => setConfirmation(e.target.value)}
          className={champ}
        />
        {erreurs.confirmation && (
          <p id="confirmation-erreur" role="alert" className="mt-2 text-[0.78rem] text-[#b4342c]">
            {erreurs.confirmation[0]}
          </p>
        )}
      </div>

      {erreur && (
        <p role="alert" className="text-[0.82rem] text-[#b4342c]">
          {erreur}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-[2px] bg-ink px-6 py-3.5 text-[0.8rem] uppercase tracking-[0.14em] text-ivory transition-opacity duration-400 hover:opacity-88 disabled:opacity-60"
      >
        {pending ? 'Enregistrement…' : 'Enregistrer mon mot de passe'}
      </button>
    </form>
  )
}
