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
        /* Vert et ambre légèrement désaturés, choisis dans la même famille
           chaude que le reste : un vert vif jurerait avec l'ivoire. */
        success: 'border-transparent bg-[#e4efe6] text-[#38614a]',
        warning: 'border-transparent bg-[#f7eeda] text-[#7a6224]',
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
