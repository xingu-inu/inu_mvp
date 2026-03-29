import { Skeleton } from '@/components/ui/skeleton'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// 자연스러운 도트 패턴 (하이드레이션 안전 고정값)
const DOT_PATTERN = [
  2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 3, 2, 1, 3, 2, 4, 2, 3, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 3, 2, 4, 2, 1,
  3, 2,
]

/** 달력 로딩 중 표시할 스켈레톤 */
export function CalendarSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--color-border)]/40 bg-[var(--color-bg-primary)] p-4">
      {/* 요일 헤더 */}
      <div className="mb-2 grid grid-cols-7">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-1 text-center text-xs font-medium text-[var(--color-text-tertiary)]"
          >
            {day}
          </div>
        ))}
      </div>

      {/* 월간 요약 헤더 placeholder */}
      <div className="mb-3 flex items-center justify-center gap-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="hidden h-3 w-20 sm:block" />
      </div>

      {/* 달력 그리드 — 5주 × 7일 */}
      <div className="grid grid-cols-7 gap-1">
        {DOT_PATTERN.map((dotCount, i) => (
          <div
            key={i}
            className="flex min-h-[64px] min-w-[44px] flex-col items-center rounded-lg py-1.5 lg:min-h-[76px]"
          >
            {/* 날짜 숫자 자리 */}
            <Skeleton className="h-8 w-8 rounded-full" />
            {/* 도트 자리 */}
            <div className="mt-1 flex flex-wrap items-start justify-center gap-0.5 px-1">
              {Array.from({ length: dotCount }).map((_, j) => (
                <Skeleton key={j} className="h-[5px] w-[5px] rounded-full lg:h-1.5 lg:w-1.5" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
