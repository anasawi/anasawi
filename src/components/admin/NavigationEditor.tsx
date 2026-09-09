'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateNavigation } from '@/server/actions/navigation'

type Item = { label: string; href: string }
type Suggestion = { label: string; href: string; hint: string }

/**
 * Éditeur du menu du site.
 *
 * Des entrées ordonnées {libellé, lien} : pages publiées, ancres de
 * l'accueil ou liens externes. Le site (en-tête et pied de page) suit
 * immédiatement l'enregistrement.
 */
export function NavigationEditor({
  initial,
  suggestions,
}: {
  initial: Item[]
  suggestions: Suggestion[]
}) {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>(initial)
  const [pending, start] = useTransition()

  const move = (index: number, delta: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev]
      const target = index + delta
      const a = next[index]
      const b = next[target]
      if (!a || !b) return prev
      next[index] = b
      next[target] = a
      return next
    })
  }

  const update = (index: number, patch: Partial<Item>) =>
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    )

  const remaining = suggestions.filter(
    (s) => !items.some((item) => item.href === s.href),
  )

  return (
    <div className="space-y-5">
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
        {items.length === 0 && (
          <li className="px-4 py-10 text-center text-[13px] text-muted-foreground">
            Votre menu est vide pour l’instant — ajoutez des pages ou des
            sections ci-dessous.
          </li>
        )}
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 px-4 py-3">
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                aria-label="Monter"
                className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                disabled={i === items.length - 1}
                onClick={() => move(i, 1)}
                aria-label="Descendre"
                className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
              >
                <ArrowDown className="h-3 w-3" />
              </button>
            </div>
            <Input
              value={item.label}
              placeholder="Libellé"
              onChange={(e) => update(i, { label: e.target.value })}
              className="h-8 w-36 shrink-0 text-[0.8rem]"
            />
            <Input
              value={item.href}
              placeholder="/approche, contact ou https://…"
              onChange={(e) => update(i, { href: e.target.value })}
              className="h-8 flex-1 font-mono text-[0.74rem]"
            />
            <button
              type="button"
              aria-label="Retirer"
              onClick={() =>
                setItems((prev) => prev.filter((_, idx) => idx !== i))
              }
              className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>

      {/* Suggestions : pages publiées et ancres de l'accueil */}
      {remaining.length > 0 && (
        <div>
          <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Ajouter au menu
          </p>
          <div className="flex flex-wrap gap-1.5">
            {remaining.map((s) => (
              <button
                key={s.href}
                type="button"
                title={s.hint}
                onClick={() =>
                  setItems((prev) => [...prev, { label: s.label, href: s.href }])
                }
                className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[0.72rem] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                <Plus className="h-3 w-3" />
                {s.label}
                <span className="text-muted-foreground/60">{s.hint}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                setItems((prev) => [...prev, { label: '', href: '' }])
              }
              className="flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-[0.72rem] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <Plus className="h-3 w-3" />
              Lien personnalisé
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          className="rounded-md bg-blue-deep text-white hover:bg-blue-deep/90"
          disabled={pending || items.some((i) => !i.label.trim() || !i.href.trim())}
          onClick={() =>
            start(async () => {
              const result = await updateNavigation(items)
              if (result.ok) {
                toast.success('Menu enregistré — le site est à jour.')
                router.refresh()
              } else {
                toast.error(result.error)
              }
            })
          }
        >
          {pending ? 'Enregistrement…' : 'Enregistrer le menu'}
        </Button>
        <p className="text-[0.72rem] text-muted-foreground">
          Un lien peut mener vers une page du site, une section de l’accueil
          (« contact », « /#contact ») ou une adresse https://…
        </p>
      </div>
    </div>
  )
}
