'use client'

import {
  Users,
  UserPlus,
  UserCheck,
  Activity,
  Target,
  ListChecks,
  CheckSquare,
  MessageSquare,
  ExternalLink,
} from 'lucide-react'
import { useAdminStats, useAdminSignupChart } from '../hooks'
import { StatCard } from './stat-card'
import { SignupChart } from './signup-chart'
import { Skeleton } from '@/components/ui/skeleton'

export function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useAdminStats()
  const { data: chartData, isLoading: chartLoading } = useAdminSignupChart()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">대시보드</h1>
        <a
          href="https://us.posthog.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-hover)]"
        >
          PostHog
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* Stat Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Users} label="전체 사용자" value={stats.totalUsers} />
          <StatCard
            icon={UserPlus}
            label="오늘 가입"
            value={stats.todaySignups}
            description={`이번 주 ${stats.weekSignups} / 이번 달 ${stats.monthSignups}`}
          />
          <StatCard icon={UserCheck} label="온보딩 완료" value={stats.onboardedUsers} />
          <StatCard
            icon={Activity}
            label="오늘 활성"
            value={stats.todayActiveUsers}
            description={`주간 ${stats.weekActiveUsers} / 월간 ${stats.monthActiveUsers}`}
          />
          <StatCard icon={Target} label="전체 목표" value={stats.totalGoals} />
          <StatCard icon={ListChecks} label="전체 태스크" value={stats.totalTasks} />
          <StatCard icon={CheckSquare} label="오늘 체크인" value={stats.todayCheckIns} />
          <StatCard icon={MessageSquare} label="전체 피드백" value={stats.totalFeedbacks} />
        </div>
      ) : null}

      {/* Signup Chart */}
      <SignupChart data={chartData ?? []} isLoading={chartLoading} />
    </div>
  )
}
