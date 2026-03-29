'use client'

import { forwardRef, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const canvasChipVariants = cva('flex items-center gap-2 rounded-lg text-xs font-medium', {
  variants: {
    variant: {
      info: 'glass-2 px-3 py-1.5 shadow-sm text-[var(--color-text-secondary)]',
      accent: 'px-3 py-1.5 shadow-sm text-white',
      action: 'glass-3 px-3 py-2 shadow-lg',
    },
  },
  defaultVariants: {
    variant: 'info',
  },
})

interface CanvasChipProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof canvasChipVariants> {
  children: ReactNode
  /** Accent color for the accent variant (e.g. 'amber', 'indigo') */
  accentColor?: string
}

const CanvasChip = forwardRef<HTMLDivElement, CanvasChipProps>(
  ({ variant, accentColor, className, children, style, ...props }, ref) => {
    const accentStyle =
      variant === 'accent' && accentColor
        ? { backgroundColor: `color-mix(in oklch, ${accentColor} 90%, transparent)`, ...style }
        : style

    return (
      <div
        ref={ref}
        className={cn(
          canvasChipVariants({ variant }),
          variant === 'accent' && !accentColor && 'bg-amber-500/90',
          className
        )}
        style={accentStyle}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CanvasChip.displayName = 'CanvasChip'

export { CanvasChip, canvasChipVariants }
