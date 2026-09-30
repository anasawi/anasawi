import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex shrink-0 items-center rounded-full border px-2 py-[1px] text-[0.68rem] font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border text-muted-foreground',
        /* Les mêmes verts et ambres que les pastilles d'état de
           l'éditeur (tokens `success` / `warning` de globals.css). */
        success: 'border-transparent bg-success-soft text-success-ink',
        warning: 'border-transparent bg-warning-soft text-warning-ink',
        muted: 'border-transparent bg-secondary text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}
