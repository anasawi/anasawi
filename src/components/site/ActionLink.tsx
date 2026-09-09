import Link from 'next/link'

import { cn } from '@/lib/utils'

type Variant = 'primary' | 'ghost' | 'outline'

const base =
  'group relative inline-flex items-center justify-center gap-3 rounded-[var(--button-radius,2px)] ' +
  'px-8 py-4.5 text-[0.8rem] font-medium uppercase tracking-[0.14em] ' +
  'transition-[background-color,color,border-color] duration-500 ease-[var(--ease-out-soft)]'

const variants: Record<Variant, string> = {
  /* L'aplat bleu se fonce à l'approche — pas de changement d'échelle.
     Le texte reste anthracite sur le bleu clair (6.6:1) et passe en ivoire
     sur le bleu profond (5.0:1) : les deux états sont lisibles. */
  primary: 'bg-blue text-ink hover:bg-blue-deep hover:text-ivory',
  outline:
    'border border-line-strong text-ink hover:border-ink hover:bg-ink hover:text-ivory',
  ghost: 'text-ink-soft hover:text-ink',
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
          className="inline-block transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:translate-x-1"
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
