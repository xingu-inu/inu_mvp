'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { OnboardingFunnel } from '@/repositories/admin.repository'

interface OnboardingFunnelProps {
  data: OnboardingFunnel | undefined
  isLoading?: boolean
}

interface FunnelStep {
  name: string
  key: keyof OnboardingFunnel
  color: string
}

const STEPS: FunnelStep[] = [
  { name: '가입', key: 'signed_up', color: '#6366f1' },
  { name: 'Direction', key: 'has_direction', color: '#7c74f3' },
  { name: 'Area', key: 'has_area', color: '#9585f5' },
  { name: 'Goal', key: 'has_goal', color: '#ae96f7' },
  { name: 'Task', key: 'has_task', color: '#c7a8f9' },
  { name: '첫 체크인', key: 'has_checkin', color: '#e0bafb' },
]

export function OnboardingFunnel({ data, isLoading }: OnboardingFunnelProps) {
  if (isLoading) {
    return (
      <Card padding="lg">
        <Skeleton className="mb-4 h-5 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card padding="lg">
        <h3 className="mb-4 text-base font-semibold text-[var(--color-text-primary)]">
          온보딩 퍼널
        </h3>
        <p className="text-sm text-[var(--color-text-tertiary)]">아직 데이터가 없어요</p>
      </Card>
    )
  }

  const maxCount = data.signed_up || 1

  const chartData = STEPS.map((step, i) => {
    const count = data[step.key]
    const prevCount = i === 0 ? data.signed_up : data[STEPS[i - 1].key]
    const conversionRate = prevCount > 0 ? (count / prevCount) * 100 : 0
    return {
      name: step.name,
      count,
      conversionRate,
      color: step.color,
    }
  })

  return (
    <Card padding="lg">
      <h3 className="mb-4 text-base font-semibold text-[var(--color-text-primary)]">온보딩 퍼널</h3>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 4, right: 80, left: 60, bottom: 4 }}
          >
            <XAxis
              type="number"
              domain={[0, maxCount]}
              fontSize={11}
              tick={{ fill: 'var(--color-text-tertiary)' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              fontSize={12}
              tick={{ fill: 'var(--color-text-secondary)' }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '13px',
              }}
              formatter={(value, _name, props) => {
                const rate = props.payload?.conversionRate as number | undefined
                return [`${value}명 (${rate !== undefined ? rate.toFixed(1) : '0.0'}%)`, '사용자']
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Conversion rates legend */}
      <div className="mt-2 space-y-1">
        {chartData.slice(1).map((step) => (
          <div key={step.name} className="flex items-center justify-between text-xs">
            <span className="text-[var(--color-text-tertiary)]">→ {step.name}</span>
            <span className="font-medium text-[var(--color-text-secondary)]">
              {step.conversionRate.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
