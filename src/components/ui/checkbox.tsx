'use client'

import { forwardRef } from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  error?: string
}

const Checkbox = forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  ({ className, error, ...props }, ref) => (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        'peer h-5 w-5 shrink-0 rounded border border-[var(--color-border)]',
        'focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]/20 focus-visible:outline-none',
        'disabled:opacity-50',
        'data-[state=checked]:border-[var(--color-primary-500)] data-[state=checked]:bg-[var(--color-primary-500)]',
        error && 'border-[var(--color-miss)]',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        <Check className="h-4 w-4 text-white" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
