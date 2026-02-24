'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { Card } from '@/components/ui/card'
import type { EngagementSeries } from '@/repositories/admin.repository'

interface EngagementChartProps {
  data: EngagementSeries[]
  isLoading?: boolean
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function EngagementChart({ data, isLoading }: EngagementChartProps) {
  if (isLoading) {
    return (
      <Card padding="lg" className="h-[320px] animate-pulse">
        <div className="h-full rounded-lg bg-[var(--color-bg-secondary)]" />
      </Card>
    )
  }

  return (
    <Card padding="lg">
      <h3 className="mb-4 text-base font-semibold text-[var(--color-text-primary)]">
        일일 활성 사용자 (DAU)
      </h3>
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="dauGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="wauGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#93c5fd" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#93c5fd" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
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
              labelFormatter={(label) => formatDate(String(label))}
              formatter={(value, name) => [
                `${value}명`,
                name === 'dau' ? 'DAU' : name === 'wau' ? 'WAU' : String(name),
              ]}
            />
            <Legend
              formatter={(value) => (value === 'dau' ? 'DAU' : value === 'wau' ? 'WAU' : value)}
              wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}
            />
            <Area
              type="monotone"
              dataKey="wau"
              stroke="#93c5fd"
              strokeWidth={2}
              fill="url(#wauGradient)"
            />
            <Area
              type="monotone"
              dataKey="dau"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#dauGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
