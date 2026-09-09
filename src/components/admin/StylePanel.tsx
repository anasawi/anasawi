'use client'

import { RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SECTION_SWATCHES } from '@/lib/color'
import type { NodeStyles, StyleProps } from '@/lib/node-styles'
import { cn } from '@/lib/utils'

/** Types SANS texte propre : le groupe Typographie n'y aurait aucun effet. */
const NON_TEXT_TYPES = new Set(['image', 'spacer', 'divider', 'video', 'acces'])

export type StyleBreakpoint = 'base' | 'tablet' | 'mobile'

const BP_LABELS: Record<StyleBreakpoint, string> = {
  base: 'Bureau',
  tablet: 'Tablette',
  mobile: 'Mobile',
}

/**
 * Panneau Style universel, sensible au breakpoint d'édition.
 *
 * Le modèle Webflow : en vue Bureau on écrit la source (`base`) ; en vue
 * Tablette ou Mobile on écrit une SURCHARGE, marquée d'un point bleu et
 * révocable propriété par propriété. La cascade descend — bureau → tablette
 * → mobile — jamais l'inverse.
 *
 * Chaque contrôle appelle `field('clé')` À SON point d'appel : c'est là que
 * TypeScript infère le type précis de la propriété. Passer l'objet champ en
 * prop d'un composant générique faisait retomber l'inférence sur l'union de
 * toutes les clés — 19 erreurs de compilation.
 */
export function StylePanel({
  value,
  onChange,
  nodeType,
  isRoot,
  breakpoint = 'base',
}: {
  value: NodeStyles | null
  onChange: (next: NodeStyles | null) => void
  nodeType: string
  /** Section racine : le fond est géré par le sélecteur de section. */
  isRoot: boolean
  breakpoint?: StyleBreakpoint
}) {
  const layer: StyleProps = value?.[breakpoint] ?? {}

  /** Valeur héritée de la cascade, pour affichage quand pas de surcharge. */
  function inherited<K extends keyof StyleProps>(
    key: K,
  ): StyleProps[K] | undefined {
    if (breakpoint === 'base') return undefined
    if (breakpoint === 'mobile' && value?.tablet?.[key] !== undefined) {
      return value.tablet[key]
    }
    return value?.base?.[key]
  }

  function write(props: StyleProps) {
    const next: NodeStyles = {
      base: value?.base ?? {},
      ...(value?.tablet ? { tablet: value.tablet } : {}),
      ...(value?.mobile ? { mobile: value.mobile } : {}),
    }

    if (Object.keys(props).length === 0) {
      if (breakpoint === 'base') next.base = {}
      else delete next[breakpoint]
    } else if (breakpoint === 'base') {
      next.base = props
    } else {
      next[breakpoint] = props
    }

    const empty =
      Object.keys(next.base).length === 0 && !next.tablet && !next.mobile
    onChange(empty ? null : next)
  }

  /** Accès typé à une propriété — l'inférence se fait ICI, par clé. */
  function field<K extends keyof StyleProps>(key: K) {
    return {
      value: (layer[key] ?? inherited(key)) as StyleProps[K] | undefined,
      overridden: breakpoint !== 'base' && layer[key] !== undefined,
      set: (next: StyleProps[K] | undefined) => {
        const props = { ...layer }
        if (next === undefined) delete props[key]
        else props[key] = next
        write(props)
      },
      reset: () => {
        const props = { ...layer }
        delete props[key]
        write(props)
      },
    }
  }

  const hasAny =
    value !== null &&
    (Object.keys(value.base).length > 0 || value.tablet || value.mobile)

  const font = field('font')
  const size = field('size')
  const weight = field('weight')
  const alignText = field('alignText')
  const lineHeight = field('lineHeight')
  const color = field('color')
  const background = field('background')
  const padding = field('padding')
  const radius = field('radius')
  const opacity = field('opacity')
  const borderWidth = field('borderWidth')
  const borderColor = field('borderColor')
  const shadow = field('shadow')

  return (
    <div className="space-y-6">
      {breakpoint !== 'base' && (
        <p className="rounded-[5px] bg-blue-mist/60 px-3 py-2 text-[0.7rem] leading-[1.5] text-blue-ink">
          Vous modifiez la vue <strong>{BP_LABELS[breakpoint]}</strong> : vos
          réglages ne s’appliquent qu’à cette taille d’écran et sont marqués
          d’un point bleu. Les autres valeurs viennent de la vue Bureau.
        </p>
      )}

      {!NON_TEXT_TYPES.has(nodeType) && (
        <Group title="Typographie">
          <StyleRow label="Police" overridden={font.overridden} onReset={font.reset}>
            <TokenSelect
              value={font.value}
              onChange={(v) => font.set(v as StyleProps['font'])}
              options={[
                ['', 'Défaut du bloc'],
                ['serif', 'Serif — titres'],
                ['sans', 'Sans — textes'],
              ]}
            />
          </StyleRow>

          <StyleRow label="Taille" overridden={size.overridden} onReset={size.reset}>
            <NumberField
              value={size.value}
              onChange={size.set}
              min={0.6}
              max={8}
              step={0.1}
              unit="rem"
              placeholder="auto"
            />
          </StyleRow>

          <StyleRow
            label="Graisse"
            overridden={weight.overridden}
            onReset={weight.reset}
          >
            <TokenSelect
              value={weight.value?.toString()}
              onChange={(v) =>
                weight.set(v ? (Number(v) as 400 | 500) : undefined)
              }
              options={[
                ['', 'Défaut'],
                ['400', 'Normale'],
                ['500', 'Medium'],
              ]}
            />
          </StyleRow>

          <StyleRow
            label="Alignement"
            overridden={alignText.overridden}
            onReset={alignText.reset}
          >
            <TokenSelect
              value={alignText.value}
              onChange={(v) => alignText.set(v as StyleProps['alignText'])}
              options={[
                ['', 'Défaut'],
                ['left', 'Gauche'],
                ['center', 'Centré'],
                ['right', 'Droite'],
              ]}
            />
          </StyleRow>

          <StyleRow
            label="Interligne"
            overridden={lineHeight.overridden}
            onReset={lineHeight.reset}
          >
            <NumberField
              value={lineHeight.value}
              onChange={lineHeight.set}
              min={0.9}
              max={2.4}
              step={0.05}
              placeholder="auto"
            />
          </StyleRow>

          <StyleRow
            label="Couleur"
            overridden={color.overridden}
            onReset={color.reset}
          >
            <ColorRow value={color.value} onChange={color.set} />
          </StyleRow>
        </Group>
      )}

      <Group title="Boîte">
        {!isRoot && (
          <StyleRow
            label="Fond"
            overridden={background.overridden}
            onReset={background.reset}
          >
            <ColorRow value={background.value} onChange={background.set} />
          </StyleRow>
        )}

        <StyleRow
          label="Marges internes"
          overridden={padding.overridden}
          onReset={padding.reset}
        >
          <NumberField
            value={padding.value?.[0]}
            onChange={(v) =>
              padding.set(v === undefined ? undefined : [v, v, v, v])
            }
            min={0}
            max={240}
            step={4}
            unit="px"
            placeholder="0"
          />
        </StyleRow>

        <StyleRow
          label="Arrondi"
          overridden={radius.overridden}
          onReset={radius.reset}
        >
          <NumberField
            value={radius.value}
            onChange={radius.set}
            min={0}
            max={120}
            step={1}
            unit="px"
            placeholder="0"
          />
        </StyleRow>

        <StyleRow
          label="Bordure"
          overridden={borderWidth.overridden}
          onReset={borderWidth.reset}
        >
          <NumberField
            value={borderWidth.value}
            onChange={borderWidth.set}
            min={0}
            max={8}
            step={1}
            unit="px"
            placeholder="0"
          />
        </StyleRow>

        {(borderWidth.value ?? 0) > 0 && (
          <StyleRow
            label="Couleur bord"
            overridden={borderColor.overridden}
            onReset={borderColor.reset}
          >
            <ColorRow value={borderColor.value} onChange={borderColor.set} />
          </StyleRow>
        )}

        <StyleRow label="Ombre" overridden={shadow.overridden} onReset={shadow.reset}>
          <TokenSelect
            value={shadow.value}
            onChange={(v) => shadow.set(v as StyleProps['shadow'])}
            options={[
              ['', 'Aucune'],
              ['douce', 'Douce'],
              ['marquee', 'Marquée'],
            ]}
          />
        </StyleRow>

        <StyleRow
          label="Opacité"
          overridden={opacity.overridden}
          onReset={opacity.reset}
        >
          <NumberField
            value={
              opacity.value !== undefined
                ? Math.round(opacity.value * 100)
                : undefined
            }
            onChange={(v) =>
              opacity.set(v === undefined ? undefined : Math.round(v) / 100)
            }
            min={10}
            max={100}
            step={5}
            unit="%"
            placeholder="100"
          />
        </StyleRow>
      </Group>

      {hasAny && breakpoint === 'base' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
          className="w-full"
        >
          <RotateCcw />
          Réinitialiser tous les styles
        </Button>
      )}
    </div>
  )
}

/* ── Sous-composants ────────────────────────────────────────────────── */

function Group({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <fieldset>
      <legend className="mb-2.5 text-[0.65rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {title}
      </legend>
      <div className="space-y-2.5">{children}</div>
    </fieldset>
  )
}

function StyleRow({
  label,
  overridden,
  onReset,
  children,
}: {
  label: string
  overridden: boolean
  onReset: () => void
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[92px_1fr] items-center gap-2">
      <Label className="flex items-center gap-1.5 text-[0.73rem]">
        {/* Point bleu = propriété surchargée pour ce breakpoint. Cliquer
            le point revient à la valeur héritée. */}
        {overridden && (
          <button
            type="button"
            title="Surcharge — cliquer pour revenir à la valeur Bureau"
            aria-label={`Retirer la surcharge « ${label} »`}
            onClick={onReset}
            className="h-2 w-2 shrink-0 rounded-full bg-[#46728a] transition-transform hover:scale-125"
          />
        )}
        <span className={cn(overridden && 'text-blue-ink')}>{label}</span>
      </Label>
      {children}
    </div>
  )
}

function TokenSelect({
  value,
  onChange,
  options,
}: {
  value: string | undefined
  onChange: (value: string | undefined) => void
  options: [string, string][]
}) {
  return (
    <Select
      value={value ?? ''}
      onValueChange={(v) => onChange(v === '__default' ? undefined : v)}
    >
      <SelectTrigger className="h-[28px] text-[0.78rem]">
        <SelectValue placeholder={options[0]?.[1]} />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, label]) => (
          <SelectItem key={v || '__default'} value={v || '__default'}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function NumberField({
  value,
  onChange,
  min,
  max,
  step,
  unit,
  placeholder,
}: {
  value: number | undefined
  onChange: (value: number | undefined) => void
  min: number
  max: number
  step: number
  unit?: string
  placeholder?: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        value={value ?? ''}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.valueAsNumber
          onChange(
            Number.isNaN(raw) ? undefined : Math.min(max, Math.max(min, raw)),
          )
        }}
        className="h-[28px] text-[0.78rem]"
      />
      {unit && (
        <span className="w-7 shrink-0 text-[0.7rem] text-muted-foreground">
          {unit}
        </span>
      )}
    </div>
  )
}

function ColorRow({
  value,
  onChange,
}: {
  value: string | undefined
  onChange: (value: string | undefined) => void
}) {
  const chartSwatches = SECTION_SWATCHES.slice(0, 8)

  return (
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        title="Défaut du bloc"
        aria-label="Couleur par défaut"
        aria-pressed={value === undefined}
        onClick={() => onChange(undefined)}
        className={cn(
          'relative h-5 w-5 rounded-[3px] bg-card ring-1 ring-inset ring-border',
          value === undefined && 'ring-2 ring-ring',
        )}
      >
        <span className="absolute inset-0 m-auto h-px w-3 rotate-45 bg-destructive/60" />
      </button>

      {chartSwatches.map((swatch) => (
        <button
          key={swatch.hex}
          type="button"
          title={swatch.name}
          aria-label={swatch.name}
          aria-pressed={value === swatch.hex}
          onClick={() => onChange(swatch.hex)}
          className={cn(
            'h-5 w-5 rounded-[3px] ring-1 ring-inset ring-black/10',
            value === swatch.hex && 'ring-2 ring-ring',
          )}
          style={{ backgroundColor: swatch.hex }}
        />
      ))}

      <label className="relative h-5 w-5 cursor-pointer overflow-hidden rounded-[3px] ring-1 ring-inset ring-black/10">
        <span
          className="absolute inset-0"
          style={{
            background:
              value && !chartSwatches.some((s) => s.hex === value)
                ? value
                : 'conic-gradient(#e57373,#ffb74d,#fff176,#81c784,#64b5f6,#ba68c8,#e57373)',
          }}
        />
        <input
          type="color"
          value={value ?? '#1c201e'}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Couleur personnalisée"
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  )
}
