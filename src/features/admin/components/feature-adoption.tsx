'use client'

import { ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { FeatureAdoption } from '@/repositories/admin.repository'

interface FeatureAdoptionProps {
  data: FeatureAdoption | undefined
  isLoading?: boolean
}

interface FeatureRow {
  name: string
  rateKey: keyof Omit<FeatureAdoption, 'total_users'>
}

const FEATURES: FeatureRow[] = [
  { name: '시간대 설정', rateKey: 'time_slot_rate' },
  { name: 'Why 작성', rateKey: 'why_rate' },
  { name: '일일 회고', rateKey: 'reflection_rate' },
  { name: '그룹 활용', rateKey: 'group_rate' },
]

export function FeatureAdoption({ data, isLoading }: FeatureAdoptionProps) {
  if (isLoading) {
    return (
      <Card padding="lg">
        <Skeleton className="mb-4 h-5 w-28" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card padding="lg">
        <h3 className="mb-4 text-base font-semibold text-[var(--color-text-primary)]">
          기능 채택률
        </h3>
        <p className="text-sm text-[var(--color-text-tertiary)]">아직 데이터가 없어요</p>
      </Card>
    )
  }

  return (
    <Card padding="lg">
      <h3 className="mb-4 text-base font-semibold text-[var(--color-text-primary)]">기능 채택률</h3>
      <div className="space-y-4">
        {FEATURES.map((feature) => {
          // SQL already returns percentage values (e.g., 75.0 for 75%)
          const rate = data[feature.rateKey]
          return (
            <div key={feature.name}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">{feature.name}</span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  {rate.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-secondary)]">
                <div
                  className="h-full rounded-full bg-[var(--color-primary-500)]"
                  style={{ width: `${Math.min(rate, 100)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-4 border-t border-[var(--color-border)] pt-3">
        <a
          href="https://us.posthog.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]"
        >
          AI 채팅 사용률은 PostHog에서 확인
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </Card>
  )
}
