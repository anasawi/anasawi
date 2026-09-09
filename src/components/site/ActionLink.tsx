import Link from 'next/link'

import { cn } from '@/lib/utils'

type Variant = 'primary' | 'ghost' | 'outline'

/* Boutons sobres de la planche V8 : pilule, fond qui fonce, flèche qui
   glisse de 4px — rien d'autre. Pas d'aimantation, pas de libellé qui
   change. Le rayon vient de `--button-radius` (999px par défaut), que
   l'identité admin peut resserrer. */
const base =
  'group relative inline-flex items-center justify-center gap-[11px] rounded-[var(--button-radius,999px)] ' +
  'px-[34px] py-4 text-[11px] font-semibold uppercase tracking-[0.18em] ' +
  'transition-[background-color,color,border-color] duration-[350ms] ease-[var(--ease)]'

const variants: Record<Variant, string> = {
  primary: 'bg-blue-deep text-ivory hover:bg-night',
  outline:
    'border border-blue-deep bg-transparent text-blue-deep hover:bg-blue-mist',
  ghost:
    'border border-blue-deep bg-transparent text-blue-deep hover:bg-blue-mist',
}

export function ActionLink({
  href,
  children,
  variant = 'primary',
  className,
  withArrow = true,
  external = false,
}: {
  href: string
  children: React.ReactNode
  variant?: Variant
  className?: string
  withArrow?: boolean
  external?: boolean
}) {
  const content = (
    <>
      <span>{children}</span>
      {withArrow && (
        <span
          aria-hidden="true"
          className="inline-block transition-transform duration-[350ms] ease-[var(--ease)] group-hover:translate-x-1"
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
