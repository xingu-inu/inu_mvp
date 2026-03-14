'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Bell, X } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { queryKeys } from '@/lib/query/keys'
import {
  useNotifications,
  useNotificationCount,
  dismissAnnouncement,
} from '@/queries/use-notifications'
import { useRoadmapStore } from '@/stores/roadmap.store'
import type { AppNotification } from '@/types/entities'

interface NotificationPopoverProps {
  className?: string
}

export function NotificationPopover({ className }: NotificationPopoverProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: notifications = [], isLoading } = useNotifications()
  const badgeCount = useNotificationCount()

  const handleClick = (notification: AppNotification) => {
    if (notification.actionPath) {
      // Check-in related notifications should open the checkin tab
      if (notification.actionPath.startsWith('/roadmap')) {
        useRoadmapStore.getState().setRightPanelTab('checkin')
      }
      router.push(notification.actionPath)
      setOpen(false)
    }
  }

  const handleDismiss = useCallback(
    (notification: AppNotification) => {
      const announcementId = notification.id.replace('announcement-', '')
      dismissAnnouncement(announcementId)
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.today() })
    },
    [queryClient]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="알림"
          className={cn(
            'relative rounded-lg p-2 transition-colors',
            open
              ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-500)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]',
            className
          )}
        >
          <Bell className="h-5 w-5" />
          {badgeCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-streak)] text-[10px] font-medium text-white">
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0">
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <h3 className="text-sm font-semibold">알림</h3>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-2xl">✅</p>
              <p className="mt-2 text-sm text-[var(--color-text-tertiary)]">
                모든 알림을 확인했어요
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onClick={() => handleClick(n)}
                onDismiss={n.type === 'announcement' ? () => handleDismiss(n) : undefined}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function NotificationItem({
  notification,
  onClick,
  onDismiss,
}: {
  notification: AppNotification
  onClick: () => void
  onDismiss?: () => void
}) {
  const isClickable = !!notification.actionPath

  return (
    <div
      className={cn(
        'flex w-full items-start gap-3 border-b border-[var(--color-border)] px-4 py-3 text-left last:border-b-0',
        isClickable && 'cursor-pointer hover:bg-[var(--color-bg-secondary)]'
      )}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <span className="mt-0.5 text-lg leading-none">{notification.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{notification.title}</p>
        <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">{notification.message}</p>
        {notification.actionLabel && (
          <p className="mt-1 text-xs font-medium text-[var(--color-primary-500)]">
            {notification.actionLabel} →
          </p>
        )}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          className="mt-0.5 shrink-0 rounded-md p-1 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
          aria-label="알림 닫기"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        notification.priority >= 4 && (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-streak)]" />
        )
      )}
    </div>
  )
}
