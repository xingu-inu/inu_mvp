'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useNotifications, useNotificationCount } from '@/queries/use-notifications'
import type { AppNotification } from '@/types/entities'

interface NotificationPopoverProps {
  className?: string
}

export function NotificationPopover({ className }: NotificationPopoverProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { data: notifications = [], isLoading } = useNotifications()
  const badgeCount = useNotificationCount()

  const handleClick = (notification: AppNotification) => {
    if (notification.actionPath) {
      router.push(notification.actionPath)
      setOpen(false)
    }
  }

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
              <NotificationItem key={n.id} notification={n} onClick={() => handleClick(n)} />
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
}: {
  notification: AppNotification
  onClick: () => void
}) {
  const isClickable = !!notification.actionPath

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      className={cn(
        'flex w-full items-start gap-3 border-b border-[var(--color-border)] px-4 py-3 text-left last:border-b-0',
        isClickable && 'hover:bg-[var(--color-bg-secondary)]'
      )}
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
      {notification.priority >= 4 && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-streak)]" />
      )}
    </button>
  )
}
