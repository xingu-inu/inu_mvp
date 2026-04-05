'use client'

import { useCallback, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { useRoadmapStore } from '@/stores/roadmap.store'
import {
  useNotifications,
  dismissNotification,
  markAsRead,
  markAllAsRead,
  unmarkAsRead,
  getReadIds,
} from '@/queries/use-notifications'
import type { AppNotification } from '@/types/entities'

export function useNotificationActions(onNavigate?: () => void) {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const { data: notifications = [], isLoading } = useNotifications()
  const select = useRoadmapStore((s) => s.select)

  const readSet = useMemo(() => {
    const ids = getReadIds()
    return new Set(ids)
    // notifications를 의존성에 넣어 쿼리 갱신 시 readSet도 재계산
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications])

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.today() })
  }, [queryClient])

  /** 알림 클릭 → 읽음 처리 + 네비게이션 */
  const handleClick = useCallback(
    (notification: AppNotification) => {
      markAsRead(notification.id)
      invalidate()

      if (notification.relatedGoalId) {
        select({ type: 'goal', id: notification.relatedGoalId })
        if (!pathname.startsWith('/roadmap')) {
          router.push('/roadmap')
        }
        onNavigate?.()
      }
    },
    [invalidate, select, pathname, router, onNavigate]
  )

  /** X 버튼 → 완전 삭제 */
  const handleDismiss = useCallback(
    (notification: AppNotification) => {
      dismissNotification(notification.id)
      invalidate()
    },
    [invalidate]
  )

  /** 모두 읽음 → 읽음 처리 (숨기지 않음) + undo toast */
  const handleMarkAllRead = useCallback(() => {
    const ids = notifications.filter((n) => !readSet.has(n.id)).map((n) => n.id)
    if (ids.length === 0) return

    markAllAsRead(ids)
    invalidate()

    toast(`${ids.length}개 알림을 읽음 처리했어요`, {
      action: {
        label: '되돌리기',
        onClick: () => {
          unmarkAsRead(ids)
          invalidate()
        },
      },
      duration: 5000,
    })
  }, [notifications, readSet, invalidate])

  return {
    notifications,
    isLoading,
    readSet,
    handleClick,
    handleDismiss,
    handleMarkAllRead,
  }
}
