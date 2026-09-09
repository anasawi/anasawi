'use client'

import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import {
  contrastRatio,
  isHexColor,
  normalizeHex,
  readableInk,
  SECTION_SWATCH_GROUPS,
  SECTION_SWATCHES,
} from '@/lib/color'
import { cn } from '@/lib/utils'

/**
 * Choix de la couleur de fond d'une section.
 *
 * Une seule valeur est saisie : le fond. La couleur du texte n'est pas un
 * réglage, elle est calculée — c'est ce qui rend impossible d'enregistrer une
 * combinaison illisible. L'aperçu montre le résultat réel et affiche le
 * rapport de contraste obtenu.
 */
export function ColorPicker({
  value,
  onChange,
  label = 'Couleur de fond',
}: {
  value: string
  onChange: (hex: string) => void
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)

  const color = normalizeHex(value)
  const ink = readableInk(color)
  const ratio = contrastRatio(color, ink)
  const swatch = SECTION_SWATCHES.find((s) => s.hex === color)

  useEffect(() => setDraft(color), [color])

  /* Fermeture au clic extérieur et à Échap — un panneau flottant qui ne se
     ferme pas au clic à côté est une gêne permanente. */
  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function commit(next: string) {
    if (isHexColor(next)) onChange(normalizeHex(next))
  }

  return (
    <div ref={containerRef} className="relative">
      <span className="mb-1.5 block text-[0.76rem] font-medium text-muted-foreground">
        {label}
      </span>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex h-[32px] w-full items-center gap-2.5 rounded-[5px] border border-input bg-card px-2 text-left text-[0.82rem] transition-colors duration-150 hover:border-ring focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Swatch color={color} className="h-[18px] w-[18px]" />
        <span className="min-w-0 flex-1 truncate">
          {swatch?.name ?? color.toUpperCase()}
        </span>
        <span className="shrink-0 text-[0.68rem] tabular-nums text-muted-foreground">
          {ratio.toFixed(1)}:1
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choisir une couleur de fond"
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-[252px] rounded-[7px] border border-border bg-popover p-3 shadow-[0_10px_32px_-8px_rgba(28,32,30,0.2),0_2px_8px_-2px_rgba(28,32,30,0.1)]"
        >
          {/* Groupées par famille de la charte : la structure du nuancier
              dit d'elle-même que ces couleurs viennent du site, et non d'un
              sélecteur générique. */}
          <div className="space-y-2.5">
            {SECTION_SWATCH_GROUPS.map((group) => (
              <div key={group.label}>
                <span className="mb-1 block text-[0.65rem] font-medium uppercase tracking-[0.08em] text-muted-foreground/75">
                  {group.label}
                </span>

                <div className="flex flex-wrap gap-1.5">
                  {group.swatches.map((option) => {
                    const selected = option.hex === color
                    return (
                      <button
                        key={option.hex}
                        type="button"
                        title={`${option.name} — ${option.hex.toUpperCase()}`}
                        aria-label={option.name}
                        aria-pressed={selected}
                        onClick={() => {
                          onChange(option.hex)
                          setOpen(false)
                        }}
                        className="group relative h-7 w-7 rounded-[4px] transition-transform duration-150 hover:scale-[1.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-popover"
                        style={{ backgroundColor: option.hex }}
                      >
                        <span className="absolute inset-0 rounded-[4px] ring-1 ring-inset ring-black/10" />
                        {selected && (
                          <Check
                            className="absolute inset-0 m-auto h-3.5 w-3.5"
                            strokeWidth={3}
                            style={{ color: readableInk(option.hex) }}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3.5 border-t border-border pt-3">
            <span className="mb-1.5 block text-[0.7rem] text-muted-foreground">
              Hors charte
            </span>

            <div className="flex items-center gap-2">
              {/* Sélecteur natif : gratuit, accessible au clavier et
                  identique aux habitudes du système. */}
              <label className="relative h-[30px] w-[34px] shrink-0 cursor-pointer overflow-hidden rounded-[5px] ring-1 ring-inset ring-black/10">
                <span
                  className="absolute inset-0"
                  style={{ backgroundColor: draft }}
                />
                <input
                  type="color"
                  value={isHexColor(draft) ? normalizeHex(draft) : color}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    commit(e.target.value)
                  }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Sélecteur de couleur"
                />
              </label>

              <Input
                value={draft}
                spellCheck={false}
                onChange={(e) => {
                  setDraft(e.target.value)
                  commit(e.target.value)
                }}
                onBlur={() => setDraft(color)}
                placeholder="#fcfaf7"
                className="font-mono text-[0.76rem] uppercase"
              />
            </div>
          </div>

          {/* Aperçu : c'est le seul moyen honnête de juger un contraste. */}
          <div
            className="mt-3 rounded-[5px] px-3 py-2.5"
            style={{ backgroundColor: color, color: ink }}
          >
            <p className="font-serif text-[0.95rem] leading-tight">
              Retrouver un espace intérieur
            </p>
            <p className="mt-1 text-[0.72rem] opacity-75">
              Texte secondaire sur ce fond.
            </p>
          </div>

          <p
            className={cn(
              'mt-2 text-[0.68rem]',
              ratio >= 7
                ? 'text-muted-foreground'
                : ratio >= 4.5
                  ? 'text-[#7a6224]'
                  : 'text-destructive',
            )}
          >
            {ratio >= 7
              ? `Contraste ${ratio.toFixed(1)}:1 — excellent.`
              : ratio >= 4.5
                ? `Contraste ${ratio.toFixed(1)}:1 — correct, évitez les petits textes.`
                : `Contraste ${ratio.toFixed(1)}:1 — insuffisant pour du texte.`}
          </p>
        </div>
      )}
    </div>
  )
}

export function Swatch({
  color,
  className,
}: {
  color: string
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block shrink-0 rounded-[3px] ring-1 ring-inset ring-black/12',
        className,
      )}
      style={{ backgroundColor: normalizeHex(color) }}
    />
  )
}
