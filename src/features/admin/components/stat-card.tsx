'use client'

import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface StatCardProps {
  icon?: LucideIcon
  label: string
  value: string | number
  description?: string
}

export function StatCard({ icon: Icon, label, value, description }: StatCardProps) {
  return (
    <Card padding="md" className="flex items-start gap-4">
      {Icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-100)]">
          <Icon className="h-5 w-5 text-[var(--color-primary-500)]" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
        <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">{description}</p>
        )}
      </div>
    </Card>
  )
}
