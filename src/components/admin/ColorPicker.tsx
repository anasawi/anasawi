'use client'

import { usePalette } from './PaletteProvider'
import { contrastRatio, normalizeHex, readableInk } from '@/lib/color'
import { cn } from '@/lib/utils'

/**
 * Choix de la couleur de fond d'une section — la rangée de pastilles de la
 * maquette : 26 px, arrondies 7 px, la pastille active cerclée de bleu
 * profond. La dernière pastille ouvre le sélecteur natif pour une couleur
 * hors palette.
 *
 * Les nuances proposées viennent de la palette du site (cinq rôles, cinq
 * paliers chacun), pas d'une liste figée : changer l'accent dans les
 * réglages change ce que ce sélecteur propose, partout.
 *
 * Une seule valeur est saisie : le fond. La couleur du texte n'est pas un
 * réglage, elle est calculée — impossible d'enregistrer une combinaison
 * illisible ; le rapport de contraste obtenu s'affiche sous les pastilles.
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
  const { groups } = usePalette()

  const color = normalizeHex(value)
  const ink = readableInk(color)
  const ratio = contrastRatio(color, ink)
  const custom = !groups.some((group) =>
    group.swatches.some((s) => s.hex === color),
  )

  return (
    <div>
      <span className="mb-[5px] block text-[11.5px] text-ink-soft">
        {label}
      </span>

      <div className="space-y-[9px]">
        {groups.map((group) => (
          <div key={group.label}>
            <span className="mb-[3px] block text-[10px] uppercase tracking-[0.1em] text-stone">
              {group.label}
            </span>
            <div className="flex flex-wrap gap-[7px]">
              {group.swatches.map((option) => {
                const selected = option.hex === color
                return (
                  <button
                    key={option.name}
                    type="button"
                    title={`${option.name} — ${option.hex.toUpperCase()}`}
                    aria-label={option.name}
                    aria-pressed={selected}
                    onClick={() => onChange(option.hex)}
                    className={cn(
                      'h-[26px] w-[26px] rounded-[7px] transition-transform hover:scale-105',
                      selected
                        ? 'border-2 border-blue-deep'
                        : 'border border-line-strong',
                    )}
                    style={{ backgroundColor: option.hex }}
                  />
                )
              })}
            </div>
          </div>
        ))}

        {/* Hors palette : le sélecteur natif — gratuit, accessible au
            clavier et identique aux habitudes du système. */}
        <div>
          <span className="mb-[3px] block text-[10px] uppercase tracking-[0.1em] text-stone">
            Autre
          </span>
          <label
            title="Autre couleur"
            className={cn(
              'relative block h-[26px] w-[26px] cursor-pointer overflow-hidden rounded-[7px] transition-transform hover:scale-105',
              custom
                ? 'border-2 border-blue-deep'
                : 'border border-line-strong',
            )}
            style={
              custom
                ? { backgroundColor: color }
                : {
                    backgroundImage:
                      'conic-gradient(#7ba3b6,#f6f2ec,#c2bcb4,#46728a,#7ba3b6)',
                  }
            }
          >
            <input
              type="color"
              value={color}
              onChange={(e) => onChange(normalizeHex(e.target.value))}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Autre couleur"
            />
          </label>
        </div>
      </div>

      {/* L'aperçu du canvas juge la couleur ; ici, une seule ligne honnête
          sur la lisibilité du texte calculé. */}
      <p
        className={cn(
          'mt-[9px] text-[10.5px]',
          ratio >= 4.5 ? 'text-stone' : 'text-destructive',
        )}
      >
        {ratio >= 4.5
          ? `Contraste du texte : ${ratio.toFixed(1)}:1 — lisible.`
          : `Contraste du texte : ${ratio.toFixed(1)}:1 — insuffisant.`}
      </p>
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
