'use client'

import { AnimatedCollapse } from './animated-collapse'
import { cn } from '@/lib/utils'

interface InlineFormShellProps {
  children: React.ReactNode
  onSubmit: (e: React.FormEvent) => void
  mode: 'create' | 'edit'
  title: React.ReactNode
  /** Set to false when parent already handles animation (e.g. accordion) */
  animated?: boolean
  className?: string
}

export function InlineFormShell({
  children,
  onSubmit,
  mode,
  title,
  animated = true,
  className,
}: InlineFormShellProps) {
  const isCreate = mode === 'create'

  const form = (
    <form
      onSubmit={onSubmit}
      className={cn(
        'space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3',
        isCreate && 'border-l-2 border-l-[var(--color-primary-500)]',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-[var(--color-text-secondary)]">{title}</div>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase',
            isCreate
              ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-600)]'
              : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]'
          )}
        >
          {isCreate ? '새로 만들기' : '수정'}
        </span>
      </div>
      {children}
    </form>
  )

  if (!animated) return form

  return <AnimatedCollapse>{form}</AnimatedCollapse>
}
