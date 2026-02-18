'use client'

import { forwardRef } from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from '@/lib/utils'

const Switch = forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-6 w-11 shrink-0 items-center rounded-full',
      'border-2 border-transparent transition-colors',
      'focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]/20 focus-visible:outline-none',
      'disabled:opacity-50',
      'data-[state=checked]:bg-[var(--color-primary-500)]',
      'data-[state=unchecked]:bg-[var(--color-bg-tertiary)]',
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm ring-0',
        'transition-transform duration-[var(--duration-fast)]',
        'data-[state=checked]:translate-x-5',
        'data-[state=unchecked]:translate-x-0'
      )}
    />
  </SwitchPrimitive.Root>
))
Switch.displayName = 'Switch'

export { Switch }
