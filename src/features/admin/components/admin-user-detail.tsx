'use client'

import { use } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  ArrowLeft,
  Mail,
  Calendar,
  Target,
  ListChecks,
  CheckSquare,
  Clock,
  Shield,
  ShieldOff,
} from 'lucide-react'
import { useAdminUserDetail, useToggleAdminStatus } from '../hooks'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface AdminUserDetailProps {
  paramsPromise: Promise<{ id: string }>
}

export function AdminUserDetail({ paramsPromise }: AdminUserDetailProps) {
  const { id } = use(paramsPromise)
  const { data: user, isLoading } = useAdminUserDetail(id)
  const toggleAdmin = useToggleAdminStatus()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          사용자 목록
        </Link>
        <Card padding="lg" className="flex items-center justify-center py-16">
          <p className="text-sm text-[var(--color-text-tertiary)]">사용자를 찾을 수 없습니다.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        사용자 목록
      </Link>

      {/* Profile Card */}
      <Card padding="lg">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-100)] text-xl font-bold text-[var(--color-primary-500)]">
              {(user.name ?? user.email)?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                {user.name ?? '이름 없음'}
              </h2>
              {user.is_admin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-100)] px-2 py-0.5 text-xs font-medium text-[var(--color-primary-600)]">
                  <Shield className="h-3 w-3" />
                  관리자
                </span>
              )}
              {user.onboarding_completed && (
                <span className="inline-flex rounded-full bg-[var(--color-done)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-done)]">
                  온보딩 완료
                </span>
              )}
            </div>

            <div className="mt-3 space-y-1.5 text-sm text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                {user.email}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                가입: {format(new Date(user.created_at), 'yyyy년 M월 d일', { locale: ko })}
              </div>
            </div>
          </div>

          {/* Admin Toggle */}
          <Button
            variant={user.is_admin ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => toggleAdmin.mutate({ userId: user.id, isAdmin: !user.is_admin })}
            isLoading={toggleAdmin.isPending}
          >
            {user.is_admin ? (
              <>
                <ShieldOff className="mr-1.5 h-4 w-4" />
                관리자 해제
              </>
            ) : (
              <>
                <Shield className="mr-1.5 h-4 w-4" />
                관리자 지정
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card padding="md" className="text-center">
          <Target className="mx-auto mb-2 h-5 w-5 text-[var(--color-text-tertiary)]" />
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">
            {user.goalCount ?? 0}
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)]">목표</p>
        </Card>
        <Card padding="md" className="text-center">
          <ListChecks className="mx-auto mb-2 h-5 w-5 text-[var(--color-text-tertiary)]" />
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">
            {user.taskCount ?? 0}
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)]">태스크</p>
        </Card>
        <Card padding="md" className="text-center">
          <CheckSquare className="mx-auto mb-2 h-5 w-5 text-[var(--color-text-tertiary)]" />
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">
            {user.checkInCount ?? 0}
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)]">체크인</p>
        </Card>
        <Card padding="md" className="text-center">
          <Clock className="mx-auto mb-2 h-5 w-5 text-[var(--color-text-tertiary)]" />
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            {user.lastActive
              ? format(new Date(user.lastActive), 'yy.MM.dd HH:mm', { locale: ko })
              : '-'}
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)]">최근 활동</p>
        </Card>
      </div>
    </div>
  )
}
