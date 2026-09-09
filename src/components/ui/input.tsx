import * as React from 'react'

import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-[32px] w-full rounded-[5px] border border-input bg-card px-2.5 text-[0.82rem] text-foreground transition-[border-color,box-shadow] duration-150',
        'placeholder:text-muted-foreground/70',
        /* Anneau fin plutôt qu'un halo : le champ se distingue sans que la
           mise en page bouge. */
        'focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'file:mr-2.5 file:border-0 file:bg-transparent file:text-[0.78rem] file:font-medium file:text-foreground',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }
