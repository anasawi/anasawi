'use client'

import { useId } from 'react'

import { FieldError } from './FieldError'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Un champ texte étiqueté, avec son aide et son erreur.
 *
 * L'identifiant vient de `useId` : deux formulaires peuvent porter le
 * même libellé sans se marcher dessus. L'aide et l'erreur sont reliées
 * au champ par `aria-describedby`, pour être lues avec lui.
 */
export function Field({
  label,
  value,
  onChange,
  placeholder,
  help,
  full,
  error,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  help?: string
  /** Occupe les deux colonnes de la grille. */
  full?: boolean
  /** Erreur de validation renvoyée par l'action pour ce champ. */
  error?: string
}) {
  const id = useId()
  const helpId = `${id}-aide`
  const errorId = `${id}-erreur`
  const describedBy =
    [error && errorId, help && helpId].filter(Boolean).join(' ') || undefined

  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <Label htmlFor={id} className="mb-2 block">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
      />
      <FieldError id={errorId} messages={error} />
      {help && (
        <p id={helpId} className="mt-1.5 text-xs text-muted-foreground">
          {help}
        </p>
      )}
    </div>
  )
}
