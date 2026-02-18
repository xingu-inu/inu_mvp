import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--color-primary-500)] text-white hover:bg-[var(--color-primary-600)] focus-visible:ring-[var(--color-primary-500)]',
        secondary:
          'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)]',
        ghost: 'bg-transparent hover:bg-[var(--color-bg-secondary)]',
        done: 'bg-[var(--color-done)] text-white hover:opacity-90',
        skip: 'bg-[var(--color-skip-bg)] text-[var(--color-skip)] border border-[var(--color-skip)]/30 hover:bg-[var(--color-skip)]/10',
        danger: 'bg-[var(--color-miss)] text-white hover:opacity-90',
      },
      size: {
        sm: 'h-9 px-3 text-sm rounded-md',
        md: 'h-11 px-4 text-base rounded-lg',
        lg: 'h-14 px-6 text-lg rounded-lg',
        icon: 'h-11 w-11 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  isLoading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
