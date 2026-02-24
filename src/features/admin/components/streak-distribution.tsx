'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { Card } from '@/components/ui/card'
import type { StreakBucket } from '@/repositories/admin.repository'

interface StreakDistributionProps {
  data: StreakBucket[] | undefined
  isLoading?: boolean
}

// Colors from gray (inactive) to amber/orange (high engagement)
const BUCKET_COLORS = [
  '#d1d5db', // 0 — gray
  '#fcd34d', // 1-3 — yellow
  '#fbbf24', // 4-7 — amber
  '#f59e0b', // 8-14 — amber-500
  '#f97316', // 15-30 — orange
  '#ea580c', // 30+ — orange-600
]

export function StreakDistribution({ data, isLoading }: StreakDistributionProps) {
  if (isLoading) {
    return (
      <Card padding="lg" className="h-[280px] animate-pulse">
        <div className="h-full rounded-lg bg-[var(--color-bg-secondary)]" />
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card padding="lg">
        <h3 className="mb-4 text-base font-semibold text-[var(--color-text-primary)]">
          스트릭 분포
        </h3>
        <p className="text-sm text-[var(--color-text-tertiary)]">아직 데이터가 없어요</p>
      </Card>
    )
  }

  return (
    <Card padding="lg">
      <h3 className="mb-4 text-base font-semibold text-[var(--color-text-primary)]">스트릭 분포</h3>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <XAxis
              dataKey="bucket"
              fontSize={12}
              tick={{ fill: 'var(--color-text-tertiary)' }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickLine={false}
            />
            <YAxis
              fontSize={12}
              tick={{ fill: 'var(--color-text-tertiary)' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '13px',
              }}
              formatter={(value) => [`${value}명`, '사용자']}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={BUCKET_COLORS[index % BUCKET_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
