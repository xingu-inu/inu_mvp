'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Upload } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useHomeState } from '../hooks/use-home-state'
import { HomeViewToggle } from './home-view-toggle'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { useGoogleCalendarConnection } from '@/queries/use-google-calendar-connection'
import { queryKeys } from '@/lib/query/keys'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export function HomeHeader() {
  const {
    view,
    currentDate,
    goToPreviousWeek,
    goToNextWeek,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    isViewingToday,
    title,
  } = useHomeState()
  const { data: gcalConnection } = useGoogleCalendarConnection()
  const isGcalConnected = !!gcalConnection?.sync_enabled
  const queryClient = useQueryClient()
  const [isSyncing, setIsSyncing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)

  const handleImport = async () => {
    setIsSyncing(true)
    setPopoverOpen(false)
    await queryClient.invalidateQueries({ queryKey: queryKeys.googleCalendar.all })
    toast.success('Google 일정을 가져왔어요')
    setIsSyncing(false)
  }

  const handleExport = async () => {
    setIsExporting(true)
    setPopoverOpen(false)
    try {
      const dateStr = format(currentDate, 'yyyy-MM-dd')
      const res = await fetch('/api/google-calendar/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr }),
      })
      if (!res.ok) {
        toast.error('내보내기에 실패했어요')
        return
      }
      const data = (await res.json()) as { exported: number; skipped: number; failed: number }
      if (data.exported > 0) {
        toast.success(`${data.exported}개 Task를 Google Calendar에 추가했어요`)
      } else if (data.skipped > 0) {
        toast.info('내보낼 Task가 없어요 (이미 완료됨)')
      } else {
        toast.info('내보낼 Task가 없어요')
      }
    } catch {
      toast.error('내보내기에 실패했어요')
    } finally {
      setIsExporting(false)
    }
  }

  const goToPrevious = view === 'week' ? goToPreviousWeek : goToPreviousMonth
  const goToNext = view === 'week' ? goToNextWeek : goToNextMonth
  const prevLabel = view === 'week' ? '이전 주' : '이전 달'
  const nextLabel = view === 'week' ? '다음 주' : '다음 달'

  return (
    <div className="space-y-1">
      {/* Row 1: Navigation arrows + controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={goToPrevious}
            className="touch-target rounded-lg p-2 transition-colors hover:bg-[var(--color-bg-secondary)]"
            aria-label={prevLabel}
          >
            <ChevronLeft className="h-5 w-5 text-[var(--color-text-secondary)]" />
          </button>
          <button
            onClick={goToNext}
            className="touch-target rounded-lg p-2 transition-colors hover:bg-[var(--color-bg-secondary)]"
            aria-label={nextLabel}
          >
            <ChevronRight className="h-5 w-5 text-[var(--color-text-secondary)]" />
          </button>
          {/* Desktop: title inline with arrows */}
          <h1 className="ml-1 hidden text-xl font-bold text-[var(--color-text-primary)] lg:block">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isGcalConnected && (
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  disabled={isSyncing || isExporting}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
                  aria-label="Google Calendar"
                >
                  <GoogleIcon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">
                    {isSyncing ? '가져오는 중...' : isExporting ? '내보내는 중...' : 'Calendar'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-1.5">
                <button
                  onClick={handleImport}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--color-bg-secondary)]"
                >
                  <Download className="h-4 w-4 text-[var(--color-primary-500)]" />
                  <div>
                    <p className="font-medium">일정 가져오기</p>
                    <p className="text-xs text-[var(--color-text-tertiary)]">Google → inu</p>
                  </div>
                </button>
                <button
                  onClick={handleExport}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--color-bg-secondary)]"
                >
                  <Upload className="h-4 w-4 text-[var(--color-done)]" />
                  <div>
                    <p className="font-medium">Task 내보내기</p>
                    <p className="text-xs text-[var(--color-text-tertiary)]">오늘 Task → Google</p>
                  </div>
                </button>
              </PopoverContent>
            </Popover>
          )}
          {!isViewingToday && (
            <Button
              variant="secondary"
              size="sm"
              onClick={goToToday}
              className="text-[var(--color-primary-500)]"
            >
              오늘
            </Button>
          )}
          <HomeViewToggle />
        </div>
      </div>

      {/* Row 2: Title on its own line (mobile only) */}
      <h1 className="text-xl font-bold text-[var(--color-text-primary)] lg:hidden">
        {title}
      </h1>
    </div>
  )
}
