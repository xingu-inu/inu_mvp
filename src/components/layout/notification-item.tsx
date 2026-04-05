'use client'

import {
  Bell,
  X,
  Trophy,
  Sparkles,
  AlertTriangle,
  Calendar,
  Lightbulb,
  Megaphone,
  ArrowUpCircle,
  PartyPopper,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { AppNotification } from '@/types/entities'

export const ICON_MAP: Record<string, LucideIcon> = {
  Trophy,
  Sparkles,
  AlertTriangle,
  Calendar,
  Lightbulb,
  Megaphone,
  ArrowUpCircle,
  PartyPopper,
}

export const ICON_COLOR: Record<string, string> = {
  Trophy: 'text-green-500',
  Sparkles: 'text-green-500',
  AlertTriangle: 'text-red-500',
  Calendar: 'text-blue-500',
  Lightbulb: 'text-amber-500',
  Megaphone: 'text-purple-500',
  ArrowUpCircle: 'text-blue-500',
  PartyPopper: 'text-green-500',
}

function formatTimestamp(timestamp: string): string {
  try {
    return formatDistanceToNow(parseISO(timestamp), { addSuffix: true, locale: ko })
  } catch {
    return ''
  }
}

function getPriorityStyles(priority: number): {
  container: string
  border: string
} {
  if (priority >= 5) {
    return {
      container: 'bg-red-50/50 dark:bg-red-950/20',
      border: 'border-l-2 border-l-red-400',
    }
  }
  if (priority >= 4) {
    return {
      container: 'bg-amber-50/30 dark:bg-amber-950/10',
      border: 'border-l-2 border-l-amber-400',
    }
  }
  if (priority <= 2) {
    return {
      container: 'opacity-80',
      border: '',
    }
  }
  return { container: '', border: '' }
}

export function NotificationItem({
  notification,
  isRead = false,
  onClick,
  onDismiss,
}: {
  notification: AppNotification
  isRead?: boolean
  onClick: () => void
  onDismiss: () => void
}) {
  const isClickable = !!notification.relatedGoalId
  const priorityStyles = isRead
    ? { container: '', border: '' }
    : getPriorityStyles(notification.priority)
  const timeText = notification.timestamp ? formatTimestamp(notification.timestamp) : ''

  return (
    <div
      className={cn(
        'flex w-full items-start gap-3 border-b border-[var(--color-border)] px-4 py-3 text-left last:border-b-0',
        priorityStyles.border,
        priorityStyles.container,
        isRead && 'opacity-50',
        isClickable && 'cursor-pointer hover:bg-[var(--color-bg-secondary)]'
      )}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      {(() => {
        const IconComponent = ICON_MAP[notification.icon]
        const colorClass = ICON_COLOR[notification.icon] ?? 'text-[var(--color-text-secondary)]'
        return IconComponent ? (
          <IconComponent className={cn('mt-0.5 h-4.5 w-4.5 shrink-0', colorClass)} />
        ) : (
          <Bell className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[var(--color-text-secondary)]" />
        )
      })()}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{notification.title}</p>
        <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">{notification.message}</p>
        {timeText && (
          <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)] opacity-70">
            {timeText}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {isClickable && (
          <ChevronRight className="h-3.5 w-3.5 text-[var(--color-text-tertiary)] opacity-50" />
        )}
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
      </div>
    </div>
  )
}
