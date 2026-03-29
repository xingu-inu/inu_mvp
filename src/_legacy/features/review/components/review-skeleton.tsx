'use client'

import { Card } from '@/components/ui/card'

export function ReviewSkeleton() {
  return (
    <div className="mt-6 animate-pulse space-y-6">
      {/* Overview Stats Skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 text-center">
            <div className="mx-auto mb-2 h-8 w-16 rounded bg-[var(--color-bg-tertiary)]" />
            <div className="mx-auto h-3 w-20 rounded bg-[var(--color-bg-tertiary)]" />
          </Card>
        ))}
      </div>

      {/* Chart Skeleton */}
      <Card className="p-4">
        <div className="mb-4 h-5 w-24 rounded bg-[var(--color-bg-tertiary)]" />
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-8 w-8 rounded-md bg-[var(--color-bg-tertiary)]" />
          ))}
        </div>
      </Card>

      {/* Area Breakdown Skeleton */}
      <Card className="p-4">
        <div className="mb-4 h-5 w-32 rounded bg-[var(--color-bg-tertiary)]" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="mb-2 flex justify-between">
                <div className="h-4 w-20 rounded bg-[var(--color-bg-tertiary)]" />
                <div className="h-4 w-8 rounded bg-[var(--color-bg-tertiary)]" />
              </div>
              <div className="h-2 rounded-full bg-[var(--color-bg-tertiary)]" />
            </div>
          ))}
        </div>
      </Card>

      {/* Reflection Skeleton */}
      <Card className="p-4">
        <div className="mb-4 h-5 w-28 rounded bg-[var(--color-bg-tertiary)]" />
        <div className="h-24 rounded bg-[var(--color-bg-tertiary)]" />
      </Card>
    </div>
  )
}
