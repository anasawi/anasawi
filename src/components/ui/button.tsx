import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[5px] text-[0.8rem] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-[14px] [&_svg]:shrink-0 [&_svg]:opacity-80",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/88',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-input bg-card text-foreground hover:bg-secondary/70',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/75',
        ghost: 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
        link: 'text-foreground underline-offset-4 hover:underline',
      },
      size: {
        /* 30px : assez haut pour être confortable, assez bas pour qu'une
           barre d'actions ne domine pas le contenu qu'elle sert. */
        default: 'h-[30px] px-3',
        sm: 'h-[26px] px-2.5 text-[0.75rem]',
        lg: 'h-9 px-5',
        icon: 'h-[30px] w-[30px]',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
