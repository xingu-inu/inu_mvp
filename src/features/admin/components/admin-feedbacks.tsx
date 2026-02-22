'use client'

import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useAdminFeedbacks } from '../hooks'
import { FeedbackDetailModal } from './feedback-detail-modal'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Feedback, FeedbackStatus } from '@/repositories/feedback.repository'

const STATUS_TABS: { value: FeedbackStatus | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '대기중' },
  { value: 'reviewed', label: '검토됨' },
  { value: 'resolved', label: '해결됨' },
]

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  reviewed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  pending: '대기중',
  reviewed: '검토됨',
  resolved: '해결됨',
}

const CATEGORY_LABELS: Record<string, string> = {
  bug: '버그',
  feature: '기능 요청',
  improvement: '개선',
  general: '일반',
  other: '기타',
}

export function AdminFeedbacks() {
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all')
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const { data: feedbacks, isLoading } = useAdminFeedbacks({
    status: statusFilter === 'all' ? undefined : statusFilter,
  })

  const handleOpen = useCallback((feedback: Feedback) => {
    setSelectedFeedback(feedback)
    setModalOpen(true)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">피드백 관리</h1>

      {/* Status Tabs */}
      <div className="flex gap-1 rounded-xl bg-[var(--color-bg-tertiary)] p-1">
        {STATUS_TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              statusFilter === value
                ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm'
                : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Feedback List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : !feedbacks?.length ? (
        <Card padding="lg" className="flex items-center justify-center py-16">
          <p className="text-sm text-[var(--color-text-tertiary)]">
            {statusFilter === 'all' ? '아직 피드백이 없습니다.' : '해당 상태의 피드백이 없습니다.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((fb) => (
            <button
              key={fb.id}
              type="button"
              onClick={() => handleOpen(fb)}
              className="w-full text-left"
            >
              <Card padding="md" className="transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {/* Category */}
                      <span className="rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]">
                        {CATEGORY_LABELS[fb.category] ?? fb.category}
                      </span>
                      {/* Status */}
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          STATUS_COLORS[fb.status] ?? STATUS_COLORS.pending
                        )}
                      >
                        {STATUS_LABELS[fb.status] ?? fb.status}
                      </span>
                    </div>

                    <p className="mt-1.5 line-clamp-2 text-sm text-[var(--color-text-primary)]">
                      {fb.content}
                    </p>

                    <div className="mt-1.5 flex items-center gap-3 text-xs text-[var(--color-text-tertiary)]">
                      {fb.user?.email && <span>{fb.user.email}</span>}
                      <span>
                        {format(new Date(fb.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <FeedbackDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        feedback={selectedFeedback}
      />
    </div>
  )
}
