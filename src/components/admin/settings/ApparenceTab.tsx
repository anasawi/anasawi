'use client'

import { RotateCcw } from 'lucide-react'
import { useState } from 'react'

import { SectionCard } from '../form/SectionCard'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  PALETTE_ROLES,
  paletteContrast,
  shade,
  shadesOf,
  type Palette,
  type PaletteRole,
} from '@/lib/palette'
import { cn } from '@/lib/utils'

export type Spacing = 'compact' | 'normal' | 'aere'

/**
 * L'onglet Apparence : la palette (cinq rôles, leurs nuances, un aperçu)
 * et les deux réglages de forme. L'état vit dans `SettingsWorkbench`.
 */
export function ApparenceTab({
  palette,
  buttonRadius,
  spacing,
  onRole,
  onReset,
  onRadius,
  onSpacing,
}: {
  palette: Palette
  buttonRadius: number
  spacing: Spacing
  onRole: (key: PaletteRole, hex: string) => void
  onReset: () => void
  onRadius: (px: number) => void
  onSpacing: (value: Spacing) => void
}) {
  return (
    <>
      <PaletteCard
        palette={palette}
        buttonRadius={buttonRadius}
        onChange={onRole}
        onReset={onReset}
      />
      <SectionCard
        id="formes"
        title="Formes et respiration"
        note="Deux réglages de forme, valables pour tout le site."
      >
        <div className="sm:col-span-2">
          <Label htmlFor="reglage-arrondi" className="mb-1.5 block">
            Arrondi des boutons — {buttonRadius} px
          </Label>
          <input
            id="reglage-arrondi"
            type="range"
            min={0}
            max={24}
            step={1}
            value={buttonRadius}
            onChange={(e) => onRadius(Number(e.target.value))}
            className="w-full accent-blue-deep"
            aria-label="Arrondi des boutons"
          />
        </div>

        <div className="sm:col-span-2">
          <p id="reglage-respiration" className="mb-1.5 block text-[0.76rem] font-medium leading-none text-muted-foreground">
            Respiration des sections
          </p>
          <div
            role="group"
            aria-labelledby="reglage-respiration"
            className="flex flex-wrap gap-1.5"
          >
            {(
              [
                ['compact', 'Compacte'],
                ['normal', 'Normale'],
                ['aere', 'Aérée'],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={spacing === key ? 'default' : 'outline'}
                aria-pressed={spacing === key}
                onClick={() => onSpacing(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </SectionCard>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   Palette
   ══════════════════════════════════════════════════════════════════════ */

function PaletteCard({
  palette,
  buttonRadius,
  onChange,
  onReset,
}: {
  palette: Palette
  buttonRadius: number
  onChange: (key: PaletteRole, hex: string) => void
  onReset: () => void
}) {
  const contrast = paletteContrast(palette)
  const lisible = contrast >= 4.5
  /* Le code de la couleur (#46728a) ne parle qu'aux personnes qui le
     connaissent déjà : il se montre sur demande. */
  const [avance, setAvance] = useState(false)

  return (
    <SectionCard
      id="palette"
      title="Palette"
      note="Cinq couleurs, pas plus. Toutes les nuances du site — les gris, les filets, les fonds doux — en sont déduites, et restent donc dans la famille de ce que vous choisissez."
      layout="stack"
      actions={
        <>
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={avance}
            onClick={() => setAvance((v) => !v)}
          >
            Avancé
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw />
            Revenir à la charte
          </Button>
        </>
      }
    >
      {/* Une rangée par rôle : la pastille, le nom, les nuances (et le
          code, en mode avancé). Tout tient sur une ligne — la palette se
          lit d'un regard. */}
      <div className="divide-y divide-border">
        {PALETTE_ROLES.map((role) => (
          <div
            key={role.key}
            className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 py-3.5 first:pt-0"
          >
            {/* La pastille EST le bouton : le sélecteur natif est masqué
                dessous. On voit la couleur, pas un widget de navigateur. */}
            <label
              className="block h-[30px] w-[30px] shrink-0 cursor-pointer rounded-[9px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] transition-transform duration-200 hover:scale-[1.08]"
              style={{ backgroundColor: palette[role.key] }}
              title={`${role.label} — ${palette[role.key].toUpperCase()}`}
            >
              <input
                type="color"
                value={palette[role.key]}
                onChange={(e) => onChange(role.key, e.target.value)}
                className="sr-only"
                aria-label={role.label}
              />
            </label>

            <div className="min-w-[150px] flex-1">
              <Label className="block">{role.label}</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {role.help}
              </p>
            </div>

            {/* Les nuances : cliquer sur l'une d'elles l'adopte comme
                couleur de base du rôle. */}
            <div className="flex shrink-0 gap-1">
              {shadesOf(palette[role.key]).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onChange(role.key, item.hex)}
                  title={`${item.label} — ${item.hex.toUpperCase()}`}
                  aria-label={`${role.label}, ${item.label}`}
                  className="h-[22px] w-[22px] rounded-[6px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition-transform duration-200 hover:scale-[1.14]"
                  style={{ backgroundColor: item.hex }}
                />
              ))}
            </div>

            {avance && (
              <span className="w-[74px] shrink-0 text-right font-mono text-xs uppercase text-muted-foreground">
                {palette[role.key]}
              </span>
            )}
          </div>
        ))}
      </div>

      <p
        aria-live="polite"
        title={`Contraste ${contrast.toFixed(1)}:1`}
        className={cn(
          'mt-3 rounded-md px-3.5 py-2.5 text-[12px] leading-relaxed',
          lisible
            ? 'bg-ivory text-muted-foreground'
            : 'bg-danger-soft text-destructive',
        )}
      >
        {lisible
          ? 'Lisible ✓ — le texte se lit bien sur le fond principal.'
          : 'Texte difficile à lire sur ce fond — assombrissez l’encre ou éclaircissez le fond.'}
      </p>

      <PalettePreview palette={palette} buttonRadius={buttonRadius} />
    </SectionCard>
  )
}

/** Une mini-maquette qui suit chaque geste — fond, fond alterné, titre,
    paragraphe, filet, bouton. */
function PalettePreview({
  palette,
  buttonRadius,
}: {
  palette: Palette
  buttonRadius: number
}) {
  const inkSoft = shade(palette.ink, 'light')
  const stone = shade(palette.ink, 'lightest')

  return (
    <div className="mt-4">
      <p className="mb-1.5 text-xs uppercase tracking-[0.1em] text-muted-foreground">
        Aperçu
      </p>
      <div
        className="overflow-hidden rounded-lg border border-border"
        style={{ backgroundColor: palette.surface }}
      >
        <div className="px-5 py-6">
          <span
            className="text-xs font-semibold uppercase tracking-[0.24em]"
            style={{ color: palette.accent }}
          >
            Accompagnement
          </span>
          <h3
            className="mt-2 font-serif text-[26px] font-light leading-tight"
            style={{ color: palette.ink }}
          >
            Un lieu pour déposer
          </h3>
          <span
            className="mt-3 block h-px w-16"
            style={{ backgroundColor: palette.accentSoft }}
          />
          <p
            className="mt-3 max-w-[52ch] text-[12px] leading-[1.75]"
            style={{ color: inkSoft }}
          >
            Une séance se déroule à votre rythme. Rien n’est attendu de vous
            sinon d’être là, et de dire ce qui vient.
          </p>
          <span
            className="mt-4 inline-block px-4 py-2 text-[12px]"
            style={{
              backgroundColor: palette.accent,
              color: palette.surface,
              borderRadius: `${buttonRadius}px`,
            }}
          >
            Prendre rendez-vous
          </span>
        </div>

        <div className="px-5 py-5" style={{ backgroundColor: palette.surfaceAlt }}>
          <span
            className="text-xs uppercase tracking-[0.18em]"
            style={{ color: stone }}
          >
            Fond alterné
          </span>
          <p className="mt-1.5 text-[12px]" style={{ color: inkSoft }}>
            Une section sur deux respire sur ce ton — l’alternance se sent,
            elle ne se voit pas.
          </p>
        </div>
      </div>
    </div>
  )
}
