'use client'

import { useEffect, useRef, useState } from 'react'

import { contactSchema } from '@/lib/schemas'
import { cn } from '@/lib/utils'

type Status = 'idle' | 'sending' | 'sent' | 'error'
type Errors = Partial<Record<string, string>>

/* Ordre des champs dans le formulaire : le focus, après une soumission
   refusée, va au PREMIER champ en erreur dans l'ordre de lecture — pas
   dans l'ordre où le schéma a trouvé les problèmes. */
const FIELD_ORDER = ['name', 'email', 'phone', 'message', 'consent'] as const

/* Trait au repos visible (`line-strong`, et non `line`) : un filet à 9 %
   d'opacité disparaissait sur l'ivoire, et le champ ne se devinait qu'au
   placeholder. Au focus, un trait de 2 px bleu profond — et pas l'anneau
   global, que `outline-none` retirait ici sans le remplacer. */
const fieldClass =
  'w-full border-0 border-b border-line-strong bg-transparent pb-3 pt-2 text-[0.95rem] ' +
  'text-ink outline-none transition-[border-color,box-shadow] duration-500 placeholder:text-stone ' +
  'focus-visible:border-blue-deep focus-visible:shadow-[0_2px_0_0_var(--color-blue-deep)] ' +
  'aria-[invalid=true]:border-[#b4342c]'

export function ContactForm() {
  const [status, setStatus] = useState<Status>('idle')
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const sentRef = useRef<HTMLDivElement>(null)
  /* Compteur de soumissions refusées : le focus ne se déplace qu'APRÈS
     une soumission, jamais quand une erreur s'efface pendant la frappe. */
  const [refus, setRefus] = useState(0)

  /* Après une soumission refusée : le focus va au premier champ fautif.
     Le résumé (`role="alert"`) a déjà annoncé le nombre d'erreurs ; le
     message du champ, relié par `aria-describedby`, est lu dans la
     foulée. */
  useEffect(() => {
    if (refus === 0) return
    const premier = FIELD_ORDER.find((name) => errors[name])
    if (!premier) return
    formRef.current
      ?.querySelector<HTMLElement>(`[name="${premier}"]`)
      ?.focus()
  }, [refus, errors])

  /* Écran de confirmation : il remplace le formulaire, donc l'élément
     qui avait le focus (le bouton d'envoi) disparaît. Sans reprise, le
     focus tombe sur <body> et un lecteur d'écran se tait. */
  useEffect(() => {
    if (status === 'sent') sentRef.current?.focus()
  }, [status])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setServerError(null)

    const form = event.currentTarget
    const raw = Object.fromEntries(new FormData(form).entries())

    const parsed = contactSchema.safeParse({
      ...raw,
      consent: raw.consent === 'on',
    })

    if (!parsed.success) {
      const next: Errors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (typeof key === 'string' && !next[key]) next[key] = issue.message
      }
      setErrors(next)
      setRefus((n) => n + 1)
      return
    }

    setErrors({})
    setStatus('sending')

    try {
      /* Le `fetch` a son propre filet : quand il rejette, c'est le réseau
         qui manque, et son message est « Failed to fetch » — trois mots
         d'anglais technique qu'on ne montre à personne. Les messages du
         serveur, eux, sont écrits pour être lus et passent tels quels. */
      let response: Response
      try {
        response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed.data),
        })
      } catch {
        throw new Error(
          'Connexion impossible. Vérifiez votre réseau, puis réessayez.',
        )
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(body?.error ?? 'Envoi impossible.')
      }

      setStatus('sent')
      form.reset()
    } catch (error) {
      setStatus('error')
      setServerError(
        error instanceof Error
          ? error.message
          : 'Une erreur est survenue. Réessayez dans un instant.',
      )
    }
  }

  if (status === 'sent') {
    return (
      <div
        ref={sentRef}
        tabIndex={-1}
        role="status"
        className="border border-line bg-blue-mist/50 px-8 py-14 text-center outline-none"
      >
        <p className="font-serif text-[1.4rem] text-ink">Message envoyé.</p>
        <p className="mx-auto mt-3 max-w-[38ch] text-[0.92rem] leading-[1.7] text-ink-soft">
          Merci pour votre confiance. Vous recevrez une réponse dans les
          meilleurs délais.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-8 text-[0.78rem] uppercase tracking-[0.14em] text-blue-deep underline underline-offset-4"
        >
          Écrire un autre message
        </button>
      </div>
    )
  }

  const nombreErreurs = FIELD_ORDER.filter((name) => errors[name]).length

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-9">
      {/* Piège à robots — hors flux visuel et hors lecture d'écran. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Ne pas remplir</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {/* UN SEUL `role="alert"` : le résumé. Quatre alertes simultanées
          (une par champ) se coupaient la parole au lecteur d'écran ; le
          résumé annonce, puis chaque message est lu avec son champ via
          `aria-describedby`. Il ne répète pas les messages des champs :
          ils ont chacun leur place, juste sous le champ. */}
      <div role="alert" className="empty:hidden">
        {nombreErreurs > 0 && (
          <p className="border-l-2 border-[#b4342c] pl-4 text-[0.85rem] leading-[1.6] text-[#b4342c]">
            {nombreErreurs === 1
              ? 'Un champ demande votre attention.'
              : `${nombreErreurs} champs demandent votre attention.`}{' '}
            Les précisions sont indiquées sous chacun.
          </p>
        )}
        {serverError && (
          <p className="text-[0.85rem] text-[#b4342c]">{serverError}</p>
        )}
      </div>

      {/* `aria-invalid` et `aria-describedby` : sans eux, le paragraphe
          d'erreur existe, porte un identifiant… et n'est rattaché à aucun
          champ. Une personne au lecteur d'écran entend « Adresse e-mail
          invalide » sans savoir lequel des quatre champs est en cause.
          Identifiants FIXES (`email-error`…) : le formulaire n'existe
          qu'en un exemplaire par page, et ces identifiants sont ceux que
          l'on retrouve dans les tests. */}
      <Field id="name" label="Nom" error={errors.name}>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          className={fieldClass}
          placeholder="Votre nom"
          {...etatChamp('name', errors.name)}
        />
      </Field>

      <div className="grid gap-9 sm:grid-cols-2">
        <Field id="email" label="E-mail" error={errors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className={fieldClass}
            placeholder="vous@exemple.fr"
            {...etatChamp('email', errors.email)}
          />
        </Field>

        <Field id="phone" label="Téléphone" hint="facultatif" error={errors.phone}>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            className={fieldClass}
            placeholder="06 00 00 00 00"
            {...etatChamp('phone', errors.phone)}
          />
        </Field>
      </div>

      <Field id="message" label="Votre message" error={errors.message}>
        <textarea
          id="message"
          name="message"
          rows={5}
          className={cn(fieldClass, 'resize-y')}
          placeholder="Quelques mots sur ce qui vous amène."
          {...etatChamp('message', errors.message)}
        />
      </Field>

      <div>
        <label htmlFor="consent" className="flex cursor-pointer items-start gap-3">
          <input
            id="consent"
            name="consent"
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 accent-blue-deep"
            {...etatChamp('consent', errors.consent)}
          />
          <span className="text-[0.82rem] leading-[1.65] text-ink-soft">
            J’accepte que mes informations soient utilisées pour répondre à ma
            demande. Elles ne sont ni cédées ni utilisées à d’autres fins.
          </span>
        </label>
        {errors.consent && <ErrorText id="consent-error">{errors.consent}</ErrorText>}
      </div>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="group inline-flex items-center gap-3 rounded-[2px] bg-blue px-8 py-4 text-[0.8rem] font-medium uppercase tracking-[0.14em] text-ink transition-colors duration-500 ease-[var(--ease-out-soft)] hover:bg-blue-deep hover:text-ivory disabled:opacity-60"
      >
        {status === 'sending' ? 'Envoi…' : 'Envoyer le message'}
        <span aria-hidden="true" className="transition-transform duration-500 group-hover:translate-x-1">
          →
        </span>
      </button>
    </form>
  )
}

/** Attributs qui relient un champ à son message d'erreur. */
function etatChamp(id: string, erreur: string | undefined) {
  return erreur
    ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` }
    : {}
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="flex items-baseline justify-between text-[0.72rem] uppercase tracking-[0.16em] text-stone"
      >
        <span>{label}</span>
        {hint && <span className="normal-case tracking-normal">{hint}</span>}
      </label>
      <div className="mt-2">{children}</div>
      {error && <ErrorText id={`${id}-error`}>{error}</ErrorText>}
    </div>
  )
}

/* Pas de `role="alert"` ici : le résumé du formulaire est la seule
   alerte ; le message est relié à son champ par `aria-describedby`. */
function ErrorText({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="mt-2 text-[0.8rem] text-[#b4342c]">
      {children}
    </p>
  )
}
