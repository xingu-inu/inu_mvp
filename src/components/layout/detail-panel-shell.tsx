'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface DetailPanelShellProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'secondary'
}

/**
 * Shared detail panel shell for main pages.
 * Provides consistent width, height, border, and background styling.
 * Desktop only — hidden on mobile (lg breakpoint).
 * Hidden on /roadmap — replaced by floating panel overlay.
 */
export function DetailPanelShell({
  children,
  className,
  variant = 'default',
}: DetailPanelShellProps) {
  const pathname = usePathname()
  if (pathname.startsWith('/roadmap') || pathname.startsWith('/record')) return null

  return (
    <aside
      className={cn(
        'hidden lg:block',
        'w-[480px] shrink-0',
        'h-full',
        'overflow-hidden',
        'border-l border-[var(--color-border)]',
        variant === 'secondary'
          ? 'bg-[var(--color-bg-primary)] shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.06)]'
          : 'bg-[var(--color-bg-primary)]',
        className
      )}
    >
      {children}
    </aside>
  )
}
