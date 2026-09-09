'use client'

import { useState } from 'react'

import { contactSchema } from '@/lib/schemas'
import { cn } from '@/lib/utils'

type Status = 'idle' | 'sending' | 'sent' | 'error'
type Errors = Partial<Record<string, string>>

const fieldClass =
  'w-full border-0 border-b border-line bg-transparent pb-3 pt-2 text-[0.95rem] ' +
  'text-ink outline-none transition-colors duration-500 placeholder:text-stone ' +
  'focus:border-blue-deep'

export function ContactForm() {
  const [status, setStatus] = useState<Status>('idle')
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState<string | null>(null)

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
      return
    }

    setErrors({})
    setStatus('sending')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })

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
        role="status"
        className="border border-line bg-blue-mist/50 px-8 py-14 text-center"
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

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-9">
      {/* Piège à robots — hors flux visuel et hors lecture d'écran. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Ne pas remplir</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <Field id="name" label="Nom" error={errors.name}>
        <input id="name" name="name" type="text" autoComplete="name" className={fieldClass} placeholder="Votre nom" />
      </Field>

      <div className="grid gap-9 sm:grid-cols-2">
        <Field id="email" label="E-mail" error={errors.email}>
          <input id="email" name="email" type="email" autoComplete="email" className={fieldClass} placeholder="vous@exemple.fr" />
        </Field>

        <Field id="phone" label="Téléphone" hint="facultatif" error={errors.phone}>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className={fieldClass} placeholder="06 00 00 00 00" />
        </Field>
      </div>

      <Field id="message" label="Votre message" error={errors.message}>
        <textarea
          id="message"
          name="message"
          rows={5}
          className={cn(fieldClass, 'resize-y')}
          placeholder="Quelques mots sur ce qui vous amène."
        />
      </Field>

      <div>
        <label htmlFor="consent" className="flex cursor-pointer items-start gap-3">
          <input
            id="consent"
            name="consent"
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 accent-[#5D8AA0]"
          />
          <span className="text-[0.82rem] leading-[1.65] text-ink-soft">
            J’accepte que mes informations soient utilisées pour répondre à ma
            demande. Elles ne sont ni cédées ni utilisées à d’autres fins.
          </span>
        </label>
        {errors.consent && <ErrorText id="consent-error">{errors.consent}</ErrorText>}
      </div>

      {serverError && (
        <p role="alert" className="text-[0.85rem] text-[#b4342c]">
          {serverError}
        </p>
      )}

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

function ErrorText({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-2 text-[0.8rem] text-[#b4342c]">
      {children}
    </p>
  )
}
