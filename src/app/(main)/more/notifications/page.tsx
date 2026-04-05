'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, CircleCheck } from 'lucide-react'
import { useNotificationActions } from '@/queries/use-notification-actions'
import { NotificationItem } from '@/components/layout/notification-item'

export default function NotificationsPage() {
  const router = useRouter()
  const { notifications, isLoading, readSet, handleClick, handleDismiss, handleMarkAllRead } =
    useNotificationActions()

  const hasUnread = notifications.some((n) => !readSet.has(n.id))

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
        {hasUnread && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="ml-auto text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
          >
            모두 읽음
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="px-4 py-20 text-center">
          <CircleCheck className="mx-auto h-8 w-8 text-green-500" />
          <p className="mt-3 text-sm text-[var(--color-text-tertiary)]">새로운 알림이 없어요</p>
        </div>
      ) : (
        <div>
          {notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              isRead={readSet.has(n.id)}
              onClick={() => handleClick(n)}
              onDismiss={() => handleDismiss(n)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
