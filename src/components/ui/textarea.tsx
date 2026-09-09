import * as React from 'react'

import { cn } from '@/lib/utils'

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[72px] w-full resize-y rounded-[5px] border border-input bg-card px-2.5 py-2 text-[0.82rem] leading-[1.6] text-foreground transition-[border-color,box-shadow] duration-150',
      'placeholder:text-muted-foreground/70',
      'focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export { Textarea }
