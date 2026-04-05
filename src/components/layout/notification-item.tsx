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
  type LucideIcon,
} from 'lucide-react'
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

export function NotificationItem({
  notification,
  onClick,
  onDismiss,
}: {
  notification: AppNotification
  onClick: () => void
  onDismiss: () => void
}) {
  const isClickable = !!notification.relatedGoalId

  return (
    <div
      className={cn(
        'flex w-full items-start gap-3 border-b border-[var(--color-border)] px-4 py-3 text-left last:border-b-0',
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
      </div>
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
  )
}
