'use client'

import { useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, CircleCheck } from 'lucide-react'
import { queryKeys } from '@/lib/query/keys'
import { useRoadmapStore } from '@/stores/roadmap.store'
import { useNotifications, dismissNotification } from '@/queries/use-notifications'
import { NotificationItem } from '@/components/layout/notification-item'
import type { AppNotification } from '@/types/entities'

export default function NotificationsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const { data: notifications = [], isLoading } = useNotifications()
  const select = useRoadmapStore((s) => s.select)

  const handleClick = (notification: AppNotification) => {
    if (notification.relatedGoalId) {
      select({ type: 'goal', id: notification.relatedGoalId })
      if (!pathname.startsWith('/roadmap')) {
        router.push('/roadmap')
      }
    }
  }

  const handleDismiss = useCallback(
    (notification: AppNotification) => {
      dismissNotification(notification.id)
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.today() })
    },
    [queryClient]
  )

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-4">
        <button
          onClick={() => router.back()}
          className="-ml-2 rounded-lg p-2 transition-colors hover:bg-[var(--color-bg-secondary)]"
          aria-label="뒤로 가기"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">알림</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="px-4 py-20 text-center">
          <CircleCheck className="mx-auto h-8 w-8 text-green-500" />
          <p className="mt-3 text-sm text-[var(--color-text-tertiary)]">모든 알림을 확인했어요</p>
        </div>
      ) : (
        <div>
          {notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onClick={() => handleClick(n)}
              onDismiss={() => handleDismiss(n)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
