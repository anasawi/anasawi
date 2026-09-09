'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { Identity } from '@/lib/identity'
import { updateIdentity } from '@/server/actions/identity'

const DEFAULTS = {
  accent: '#46728a',
  accentSoft: '#7ba3b6',
  mist: '#eaf1f4',
  buttonRadius: 2,
  spacing: 'normal' as const,
}

/**
 * Identité du site — les curseurs globaux.
 *
 * Trois couleurs de la charte, l'arrondi des boutons, la respiration des
 * sections. Chaque valeur pilote une variable CSS que tous les templates
 * consomment : enregistrer met à jour le site entier, d'un coup.
 */
export function IdentityEditor({ initial }: { initial: Identity }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [value, setValue] = useState<Identity>(initial)

  const save = (next: Identity) =>
    start(async () => {
      const result = await updateIdentity(next)
      if (result.ok) {
        toast.success('Identité enregistrée — tout le site est à jour.')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })

  const color = (
    key: 'accent' | 'accentSoft' | 'mist',
    label: string,
    help: string,
  ) => (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <Label className="block">{label}</Label>
        <p className="mt-0.5 text-[0.7rem] text-muted-foreground">{help}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[0.72rem] text-muted-foreground">
          {value[key] ?? DEFAULTS[key]}
        </span>
        <input
          type="color"
          value={value[key] ?? DEFAULTS[key]}
          onChange={(e) => setValue((v) => ({ ...v, [key]: e.target.value }))}
          className="h-8 w-12 cursor-pointer rounded-md border border-border bg-transparent"
          aria-label={label}
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-[22px]">
      <section className="rounded-xl border border-border bg-white px-[22px] py-5">
        <h4 className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Couleurs
        </h4>
        <div className="mt-1 divide-y divide-border">
          {color('accent', 'Accent profond', 'Survols, filets, labels, liens.')}
          {color('accentSoft', 'Aplat des boutons', 'Le fond des appels à l’action.')}
          {color('mist', 'Bleu brume', 'Fonds doux : encarts, panneaux, pastilles.')}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-white px-[22px] py-5">
        <h4 className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Formes et respiration
        </h4>

        <div>
          <Label className="mb-1.5 block">
            Arrondi des boutons — {value.buttonRadius ?? DEFAULTS.buttonRadius} px
          </Label>
          <input
            type="range"
            min={0}
            max={24}
            step={1}
            value={value.buttonRadius ?? DEFAULTS.buttonRadius}
            onChange={(e) =>
              setValue((v) => ({ ...v, buttonRadius: Number(e.target.value) }))
            }
            className="w-full accent-[#46728a]"
          />
        </div>

        <div>
          <Label className="mb-1.5 block">Respiration des sections</Label>
          <div className="flex gap-1.5">
            {(
              [
                ['compact', 'Compacte'],
                ['normal', 'Normale'],
                ['aere', 'Aérée'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={(value.spacing ?? 'normal') === key}
                onClick={() => setValue((v) => ({ ...v, spacing: key }))}
                className={`rounded-md border px-3 py-1.5 text-[0.78rem] transition-colors ${
                  (value.spacing ?? 'normal') === key
                    ? 'border-blue-deep bg-blue-mist/60 text-blue-ink'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="flex items-center gap-2">
        <Button disabled={pending} onClick={() => save(value)}>
          {pending ? 'Enregistrement…' : 'Enregistrer l’identité'}
        </Button>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => {
            setValue({})
            save({})
          }}
        >
          <RotateCcw />
          Revenir à la charte
        </Button>
      </div>

      <p className="text-[0.72rem] leading-[1.6] text-muted-foreground">
        Ces réglages pilotent les variables que tous les templates utilisent :
        chaque section du site suit, y compris celles déjà en place. La charte
        AMASWI reste la référence — « Revenir à la charte » efface toutes les
        surcharges.
      </p>
    </div>
  )
}
