'use client'

import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface StatCardProps {
  icon?: LucideIcon
  label: string
  value: string | number
  description?: string
  trend?: { current: number; previous: number }
}

export function StatCard({ icon: Icon, label, value, description, trend }: StatCardProps) {
  const change =
    trend && trend.previous > 0 ? ((trend.current - trend.previous) / trend.previous) * 100 : 0

  const hasPositiveTrend = trend && change > 0
  const hasNegativeTrend = trend && change < 0

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
        {trend && (
          <p
            className={`mt-0.5 flex items-center gap-0.5 text-xs ${
              hasPositiveTrend
                ? 'text-green-600'
                : hasNegativeTrend
                  ? 'text-red-500'
                  : 'text-[var(--color-text-tertiary)]'
            }`}
          >
            {hasPositiveTrend ? (
              <TrendingUp className="h-3 w-3" />
            ) : hasNegativeTrend ? (
              <TrendingDown className="h-3 w-3" />
            ) : null}
            {change > 0 ? '+' : ''}
            {change.toFixed(1)}%
          </p>
        )}
        {description && (
          <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">{description}</p>
        )}
      </div>
    </Card>
  )
}
