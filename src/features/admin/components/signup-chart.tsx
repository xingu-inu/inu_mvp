'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { Card } from '@/components/ui/card'

interface SignupChartProps {
  data: { date: string; count: number }[]
  isLoading?: boolean
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function SignupChart({ data, isLoading }: SignupChartProps) {
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
        일별 가입자 추이 (30일)
      </h3>
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
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
              formatter={(value) => [`${value}명`, '가입자']}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#signupGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
