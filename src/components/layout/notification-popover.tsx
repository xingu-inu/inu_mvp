'use client'

import { useState, useCallback } from 'react'
import { Bell, CircleCheck } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { cn } from '@/lib/utils'
import { useNotificationCount } from '@/queries/use-notifications'
import { useNotificationActions } from '@/queries/use-notification-actions'
import { NotificationItem } from './notification-item'

interface NotificationPopoverProps {
  className?: string
}

export function NotificationPopover({ className }: NotificationPopoverProps) {
  const [open, setOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const badgeCount = useNotificationCount()

  const onNavigate = useCallback(() => {
    setOpen(false)
    setModalOpen(false)
  }, [])

  const { notifications, isLoading, readSet, handleClick, handleDismiss, handleMarkAllRead } =
    useNotificationActions(onNavigate)

  const hasUnread = notifications.some((n) => !readSet.has(n.id))

  const renderNotificationList = () => (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <CircleCheck className="mx-auto h-6 w-6 text-green-500" />
          <p className="mt-2 text-sm text-[var(--color-text-tertiary)]">새로운 알림이 없어요</p>
        </div>
      ) : (
        notifications.map((n) => (
          <NotificationItem
            key={n.id}
            notification={n}
            isRead={readSet.has(n.id)}
            onClick={() => handleClick(n)}
            onDismiss={() => handleDismiss(n)}
          />
        ))
      )}
    </>
  )

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            aria-label="알림"
            title={badgeCount > 0 && notifications.length > 0 ? notifications[0].title : undefined}
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
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <h3 className="text-sm font-semibold">알림</h3>
            {hasUnread && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
              >
                모두 읽음
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">{renderNotificationList()}</div>

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setModalOpen(true)
              }}
              className="block w-full border-t border-[var(--color-border)] px-4 py-2.5 text-center text-xs text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-secondary)]"
            >
              모든 알림 보기
            </button>
          )}
        </PopoverContent>
      </Popover>

      <ResponsiveModal open={modalOpen} onOpenChange={setModalOpen} title="알림">
        {hasUnread && (
          <div className="-mt-4 mb-3 flex justify-end">
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            >
              모두 읽음
            </button>
          </div>
        )}
        <div className="-mx-6">{renderNotificationList()}</div>
      </ResponsiveModal>
    </>
  )
}
