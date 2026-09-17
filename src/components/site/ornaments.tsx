import { cn } from '@/lib/utils'

/**
 * Ornements de la charte (planche V8) — l'astérisque signature, les
 * méta-textes, l'index de section en chiffres romains, les trois points.
 *
 * Aucun état, aucun JavaScript : de purs composants serveur que chaque
 * template consomme pour parler la même langue.
 */

/** L'astérisque ✳ seul, en serif — l'ornement signature. */
export function Aster({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('font-serif', className)}>
      ✳
    </span>
  )
}

/**
 * Méta-texte de section : « ✳  Label » en capitales espacées.
 * C'est le label supérieur de presque toutes les sections de la maquette.
 */
export function MetaLabel({
  children,
  className,
  tone = 'accent',
}: {
  children: React.ReactNode
  className?: string
  /** `accent` : bleu profond. `muted` : gris pierre. `light` : sur fond nuit. */
  tone?: 'accent' | 'muted' | 'light'
}) {
  return (
    <p
      className={cn(
        'font-sans text-[11px] font-semibold uppercase tracking-[0.24em]',
        tone === 'accent' && 'text-blue-deep',
        tone === 'muted' && 'text-stone',
        tone === 'light' && 'text-ivory/55',
        className,
      )}
    >
      <Aster className="text-[1.2em] font-normal normal-case tracking-normal" />
      <span aria-hidden="true">&nbsp;&nbsp;</span>
      <span>{children}</span>
    </p>
  )
}

const ROMANS: readonly [number, string][] = [
  [10, 'x'],
  [9, 'ix'],
  [5, 'v'],
  [4, 'iv'],
  [1, 'i'],
]

/** Chiffre romain minuscule — pour l'index de section (« iv — conviction »). */
export function toRoman(value: number): string {
  let n = Math.max(1, Math.min(Math.round(value), 40))
  let out = ''
  for (const [num, glyph] of ROMANS) {
    while (n >= num) {
      out += glyph
      n -= num
    }
  }
  return out
}

/**
 * Index de section en serif italique, posé en haut à droite de la section.
 * `index` vient de `ctx.index` (position de la section dans la page).
 *
 * Position unique, partout : 28px du haut de la SECTION, une gouttière du
 * bord droit (`section-index`, globals.css). La racine du template doit
 * être `relative` ; SectionsView fournit `--section-index-top` pour
 * compenser le padding du wrapper — aucun template n'a à passer de `top-…`.
 */
export function SectionIndex({
  index,
  label,
  light = false,
  className,
}: {
  index: number
  label: string
  /** Sur fond nuit. */
  light?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        /* Masqué sous `md` : à 360px il chevaucherait le label supérieur
           ou la capsule de navigation. */
        'section-index pointer-events-none hidden font-serif text-[14.5px] italic md:inline',
        light ? 'text-ivory/40' : 'text-stone',
        className,
      )}
    >
      {toRoman(index + 1)} — {label}
    </span>
  )
}

/** Les trois points bleus de la maquette — ponctuation entre deux sections. */
export function Dots({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('flex items-center justify-center gap-2.5', className)}
    >
      <i className="h-1 w-1 rounded-full bg-blue opacity-55" />
      <i className="h-1 w-1 rounded-full bg-blue opacity-55" />
      <i className="h-1 w-1 rounded-full bg-blue opacity-55" />
    </span>
  )
}
