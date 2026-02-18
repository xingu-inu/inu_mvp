import { Card } from '@/components/ui'

export default function ReviewLoading() {
  return (
    <div className="space-y-4 px-4 py-6">
      {/* Stats Skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="h-24 animate-pulse bg-[var(--color-bg-secondary)]" />
        <Card className="h-24 animate-pulse bg-[var(--color-bg-secondary)]" />
      </div>

      {/* Charts Skeleton */}
      <Card className="h-64 animate-pulse bg-[var(--color-bg-secondary)]" />
      <Card className="h-48 animate-pulse bg-[var(--color-bg-secondary)]" />
    </div>
  )
}
