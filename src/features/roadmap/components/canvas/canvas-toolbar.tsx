'use client'

import { forwardRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

// ── Container ────────────────────────────────────────────

interface CanvasToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

function CanvasToolbarRoot({ children, className, ...props }: CanvasToolbarProps) {
  return (
    <div
      className={cn('glass-2 flex items-center gap-0.5 rounded-lg p-1 shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  )
}

// ── Toggle (active / inactive) ───────────────────────────

interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  icon?: ReactNode
  children?: ReactNode
}

const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  ({ active = false, icon, children, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
          'min-h-[44px] lg:min-h-0',
          active
            ? 'bg-[var(--color-primary-500)] text-white'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]/60',
          className
        )}
        {...props}
      >
        {icon}
        {children && <span>{children}</span>}
      </button>
    )
  }
)
Toggle.displayName = 'CanvasToolbar.Toggle'

// ── Button (generic action) ──────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode
  children?: ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ icon, children, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
          'min-h-[44px] lg:min-h-0',
          'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]/60',
          'disabled:opacity-30',
          className
        )}
        {...props}
      >
        {icon}
        {children && <span>{children}</span>}
      </button>
    )
  }
)
Button.displayName = 'CanvasToolbar.Button'

// ── Divider ──────────────────────────────────────────────

function Divider({ className }: { className?: string }) {
  return (
    <div className={cn('mx-0.5 h-4 w-px bg-[var(--color-border)]/50', className)} aria-hidden />
  )
}

// ── Compound export ──────────────────────────────────────

const CanvasToolbar = Object.assign(CanvasToolbarRoot, { Toggle, Button, Divider })

export { CanvasToolbar }
