'use client'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { RetentionCohort } from '@/repositories/admin.repository'

interface RetentionHeatmapProps {
  data: RetentionCohort[] | undefined
  isLoading?: boolean
}

const WEEK_KEYS = [
  'week_0',
  'week_1',
  'week_2',
  'week_3',
  'week_4',
  'week_5',
  'week_6',
  'week_7',
  'week_8',
] as const

function formatCohortWeek(weekStr: string): string {
  const d = new Date(weekStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function getCellStyle(rate: number): { backgroundColor: string; color: string } {
  const opacity = rate / 100
  return {
    backgroundColor: `rgba(99, 102, 241, ${opacity})`,
    color: rate > 50 ? '#ffffff' : '#374151',
  }
}

export function RetentionHeatmap({ data, isLoading }: RetentionHeatmapProps) {
  if (isLoading) {
    return (
      <Card padding="lg">
        <Skeleton className="mb-4 h-5 w-40" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded" />
          ))}
        </div>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card padding="lg">
        <h3 className="mb-4 text-base font-semibold text-[var(--color-text-primary)]">
          주간 리텐션 코호트
        </h3>
        <p className="text-sm text-[var(--color-text-tertiary)]">아직 데이터가 없어요</p>
      </Card>
    )
  }

  return (
    <Card padding="lg">
      <h3 className="mb-4 text-base font-semibold text-[var(--color-text-primary)]">
        주간 리텐션 코호트
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="pr-3 pb-2 text-left font-medium text-[var(--color-text-tertiary)]">
                코호트
              </th>
              <th className="pr-2 pb-2 text-right font-medium text-[var(--color-text-tertiary)]">
                크기
              </th>
              {WEEK_KEYS.map((_, i) => (
                <th
                  key={i}
                  className="pb-2 text-center font-medium text-[var(--color-text-tertiary)]"
                  style={{ minWidth: '40px' }}
                >
                  W{i}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.cohort_week}>
                <td className="py-1 pr-3 text-left text-[var(--color-text-secondary)]">
                  {formatCohortWeek(row.cohort_week)}
                </td>
                <td className="py-1 pr-2 text-right text-[var(--color-text-secondary)]">
                  {row.cohort_size.toLocaleString()}
                </td>
                {WEEK_KEYS.map((key, i) => {
                  const rawValue = row[key]
                  // SQL already returns percentage values (e.g., 85.0 for 85%)
                  const rate = typeof rawValue === 'number' ? rawValue : null
                  return (
                    <td key={i} className="py-1 text-center">
                      <span
                        className="inline-block rounded px-1 py-0.5 font-medium"
                        style={rate !== null ? getCellStyle(rate) : {}}
                      >
                        {rate !== null ? `${Math.round(rate)}%` : '—'}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
