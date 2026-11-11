import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Button } from './Button.vue'

export const buttonVariants = cva(
  'focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive rounded-full border border-transparent bg-clip-padding text-sm font-normal uppercase focus-visible:ring-3 aria-invalid:ring-3 active:not-aria-[haspopup]:translate-y-px [&_svg:not([class*=size-])]:size-4 group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/80',
        outline:
          'border-primary bg-transparent hover:bg-primary hover:text-primary-foreground aria-expanded:bg-primary aria-expanded:text-primary-foreground',
        destructive:
          'bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 text-destructive focus-visible:border-destructive/40',
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground',
        'ghost-destructive': 'hover:bg-destructive/10',
        quiet: 'border-current bg-transparent',
        invert:
          'hover:bg-primary hover:text-primary-foreground aria-expanded:bg-primary aria-expanded:text-primary-foreground',
      },
      size: {
        default: 'h-11 lg:h-9 gap-2 px-6',
        xs: 'h-11 lg:h-7 gap-1 px-3 text-xs',
        sm: 'h-11 lg:h-8 gap-1.5 px-4 text-xs',
        lg: 'h-11 gap-2 px-6',
        icon: 'size-11 lg:size-9',
        'icon-sm': 'size-11 lg:size-8',
        'icon-xs': 'size-11 lg:size-6 [&_svg:not([class*=size-])]:size-3',
        'icon-chip': 'hit-area size-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)
export type ButtonVariants = VariantProps<typeof buttonVariants>
