'use client'

import { useState } from 'react'
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
  Zap,
} from 'lucide-react'
import { useAdminStats, useAdminSignupChart } from '../hooks'
import { useAdminEngagement, useAdminOnboardingFunnel } from '../hooks'
import { StatCard } from './stat-card'
import { SignupChart } from './signup-chart'
import { EngagementChart } from './engagement-chart'
import { OnboardingFunnel } from './onboarding-funnel'
import { Skeleton } from '@/components/ui/skeleton'

const PERIOD_OPTIONS = [
  { label: '7일', value: 7 },
  { label: '14일', value: 14 },
  { label: '30일', value: 30 },
  { label: '90일', value: 90 },
] as const

export function AdminDashboard() {
  const [days, setDays] = useState(30)

  const { data: stats, isLoading: statsLoading } = useAdminStats()
  const { data: chartData, isLoading: chartLoading } = useAdminSignupChart(days)
  const { data: engagement, isLoading: engagementLoading } = useAdminEngagement(days)
  const { data: funnel, isLoading: funnelLoading } = useAdminOnboardingFunnel()

  const summary = engagement?.summary
  const stickinessValue =
    summary && summary.current_mau > 0
      ? ((summary.current_dau / summary.current_mau) * 100).toFixed(1) + '%'
      : '—'
  const prevStickiness =
    summary && summary.prev_mau > 0 ? (summary.prev_dau / summary.prev_mau) * 100 : 0
  const currentStickiness =
    summary && summary.current_mau > 0 ? (summary.current_dau / summary.current_mau) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">대시보드</h1>
        <div className="flex items-center gap-2">
          {/* Period filter */}
          <div className="flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  days === opt.value
                    ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-600)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
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
      </div>

      {/* KPI Cards */}
      {engagementLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={Activity}
            label="DAU"
            value={summary.current_dau}
            trend={{ current: summary.current_dau, previous: summary.prev_dau }}
          />
          <StatCard
            icon={Users}
            label="WAU"
            value={summary.current_wau}
            trend={{ current: summary.current_wau, previous: summary.prev_wau }}
          />
          <StatCard
            icon={Users}
            label="MAU"
            value={summary.current_mau}
            trend={{ current: summary.current_mau, previous: summary.prev_mau }}
          />
          <StatCard
            icon={Zap}
            label="Stickiness (DAU/MAU)"
            value={stickinessValue}
            trend={{ current: currentStickiness, previous: prevStickiness }}
          />
        </div>
      ) : null}

      {/* Secondary Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
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

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EngagementChart data={engagement?.series ?? []} isLoading={engagementLoading} />
        <SignupChart data={chartData ?? []} isLoading={chartLoading} />
      </div>

      {/* Onboarding Funnel */}
      <OnboardingFunnel data={funnel} isLoading={funnelLoading} />
    </div>
  )
}
