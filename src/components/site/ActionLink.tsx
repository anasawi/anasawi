import Link from 'next/link'

import { LiquidFill } from '@/components/site/LiquidFill'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'ghost' | 'outline'

/* Boutons sobres de la planche V8 : pilule, flèche qui glisse de 4px, et
   au survol un remplissage liquide — l'encre naît sous la souris, la suit
   dans le bouton, se résorbe à la sortie. Le bouton ne bouge pas. Le
   rayon vient de `--button-radius` (999px par défaut), que l'identité
   admin peut resserrer. */
const base =
  'group relative inline-flex items-center justify-center gap-[11px] overflow-hidden rounded-[var(--button-radius,999px)] ' +
  'px-[34px] py-4 text-[11px] font-semibold uppercase tracking-[0.18em] ' +
  'transition-[color,border-color] duration-[350ms] ease-[var(--ease)]'

const variants: Record<Variant, string> = {
  primary: 'bg-blue-deep text-ivory',
  outline: 'border border-blue-deep bg-transparent text-blue-deep',
  ghost: 'border border-blue-deep bg-transparent text-blue-deep',
}

/* Couleur de l'encre selon la variante. */
const inks: Record<Variant, string> = {
  primary: 'bg-night',
  outline: 'bg-blue-mist',
  ghost: 'bg-blue-mist',
}

export function ActionLink({
  href,
  children,
  variant = 'primary',
  className,
  withArrow = true,
  external = false,
  ink,
}: {
  href: string
  children: React.ReactNode
  variant?: Variant
  className?: string
  withArrow?: boolean
  external?: boolean
  /** Classe de couleur de l'encre, pour un bouton dont le fond est
      personnalisé (ex. bouton ivoire sur l'arche bleue → `bg-blue-mist`). */
  ink?: string
}) {
  const content = (
    <>
      <LiquidFill className={ink ?? inks[variant]} />
      <span className="relative z-[1]">{children}</span>
      {withArrow && (
        <span
          aria-hidden="true"
          className="relative z-[1] inline-block transition-transform duration-[350ms] ease-[var(--ease)] group-hover:translate-x-1"
        >
          →
        </span>
      )}
    </>
  )

  const classes = cn(base, variants[variant], className)

  if (external) {
    return (
      <a
        href={href}
        className={classes}
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    )
  }

  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  )
}
