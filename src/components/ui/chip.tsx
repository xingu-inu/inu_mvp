import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const chipVariants = cva(
  'inline-flex items-center gap-1 font-medium transition-all cursor-pointer',
  {
    variants: {
      variant: {
        area: 'rounded-full px-2.5 py-0.5 text-xs',
        selection: 'rounded-full px-4 py-2 text-sm border-2',
      },
      selected: {
        true: 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-600)]',
        false:
          'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)]',
      },
    },
    defaultVariants: {
      variant: 'area',
      selected: false,
    },
  }
)

interface ChipProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof chipVariants> {
  emoji?: string
  color?: string
}

const Chip = forwardRef<HTMLSpanElement, ChipProps>(
  ({ className, variant, selected, emoji, color, children, style, ...props }, ref) => {
    const areaStyle =
      variant === 'area' && color ? { backgroundColor: `${color}20`, color, ...style } : style

    return (
      <span
        ref={ref}
        className={cn(chipVariants({ variant, selected }), className)}
        style={areaStyle}
        {...props}
      >
        {emoji && <span>{emoji}</span>}
        {children}
      </span>
    )
  }
)
Chip.displayName = 'Chip'

export { Chip, chipVariants }
