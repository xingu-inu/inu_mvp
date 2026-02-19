'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Loader2 } from 'lucide-react'
import { useGoogleCalendarConnection } from '@/queries/use-google-calendar-connection'
import { toggleGoogleCalendarSync } from '@/actions/google-calendar.actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function GoogleCalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

export function GoogleCalendarConnect() {
  const { data: connection, isLoading: isLoadingConnection } = useGoogleCalendarConnection()
  const queryClient = useQueryClient()
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isTogglingSync, setIsTogglingSync] = useState(false)

  const handleConnect = () => {
    window.location.href = '/api/google-calendar/authorize'
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      const res = await fetch('/api/google-calendar/disconnect', { method: 'POST' })
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ['google-calendar'] })
        toast.success('Google Calendar 연결이 해제되었습니다')
      } else {
        toast.error('연결 해제에 실패했습니다')
      }
    } catch {
      toast.error('연결 해제에 실패했습니다')
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleToggleSync = async () => {
    if (!connection) return
    setIsTogglingSync(true)
    try {
      const result = await toggleGoogleCalendarSync(!connection.sync_enabled)
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ['google-calendar'] })
        toast.success(
          result.data.sync_enabled ? '동기화가 활성화되었습니다' : '동기화가 비활성화되었습니다'
        )
      } else {
        toast.error('설정 변경에 실패했습니다')
      }
    } catch {
      toast.error('설정 변경에 실패했습니다')
    } finally {
      setIsTogglingSync(false)
    }
  }

  // 로딩 중: 설정 버튼과 같은 높이 유지
  if (isLoadingConnection) {
    return (
      <div className="flex items-center gap-3 rounded-xl px-3 py-3">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-text-tertiary)]" />
        <span className="text-sm text-[var(--color-text-tertiary)]">확인 중...</span>
      </div>
    )
  }

  // 미연결: 설정 링크와 동일한 스타일
  if (!connection) {
    return (
      <button
        onClick={handleConnect}
        className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-[var(--color-bg-secondary)]"
      >
        <div className="flex items-center gap-3">
          <GoogleCalendarIcon className="h-5 w-5" />
          <span className="text-sm">Google Calendar</span>
        </div>
        <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)]" />
      </button>
    )
  }

  // 연결됨: 동기화 토글 포함
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between rounded-xl px-3 py-3">
        <div className="flex items-center gap-3">
          <GoogleCalendarIcon className="h-5 w-5" />
          <div>
            <span className="text-sm">Google Calendar</span>
            <p className="text-xs text-[var(--color-text-tertiary)]">연결됨</p>
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={isDisconnecting}
          className="text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-miss)] disabled:opacity-50"
        >
          {isDisconnecting ? '해제 중...' : '연결 해제'}
        </button>
      </div>
      <div className="flex items-center justify-between rounded-xl px-3 py-2">
        <span className="text-sm text-[var(--color-text-secondary)]">캘린더 동기화</span>
        <button
          type="button"
          role="switch"
          aria-checked={connection.sync_enabled}
          onClick={handleToggleSync}
          disabled={isTogglingSync}
          className={cn(
            'relative h-6 w-11 flex-shrink-0 rounded-full transition-colors',
            connection.sync_enabled
              ? 'bg-[var(--color-primary-500)]'
              : 'bg-[var(--color-bg-tertiary)]'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
              connection.sync_enabled && 'translate-x-5'
            )}
          />
        </button>
      </div>
    </div>
  )
}
