import { cn } from '@/lib/utils'

/** Toggle-chip active/inactive styling for pill-shaped selection chips */
export function chipClass(active: boolean): string {
  return cn(
    'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
    active
      ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-600)]'
      : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
  )
}
