import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const cardVariants = cva('rounded-xl transition-all', {
  variants: {
    variant: {
      default:
        'glass-2 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5',
      hero: 'glass-3 shadow-lg p-6',
      list: 'glass-1 shadow-sm hover:bg-[var(--color-bg-secondary)]',
      done: 'bg-[var(--color-done-bg)] border border-[var(--color-done)]/20',
      skip: 'bg-[var(--color-skip-bg)]/80 border border-[var(--color-skip)]/10',
      miss: 'bg-[var(--color-miss-bg)] border border-[var(--color-miss)]/20',
      dive: 'glass-dive text-[var(--color-water-light)]',
    },
    padding: {
      none: 'p-0',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'md',
  },
})

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant, padding }), className)} {...props} />
  )
)
Card.displayName = 'Card'

export { Card, cardVariants }
