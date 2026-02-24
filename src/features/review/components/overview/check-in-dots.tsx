'use client'

import type { CheckInStatus } from '@/types/entities'

const CHECKIN_DOT_STYLES: Record<CheckInStatus, string> = {
  done: 'bg-emerald-500 dark:bg-emerald-400',
  skip: 'bg-gray-300 dark:bg-gray-600',
  miss: 'bg-red-300 dark:bg-red-500/70',
}

interface CheckInDotsProps {
  checkIns: Array<{ date: string; status: CheckInStatus }>
}

export function CheckInDots({ checkIns }: CheckInDotsProps) {
  if (checkIns.length === 0) return null

  return (
    <div className="flex items-center gap-0.5">
      {checkIns.map((ci) => (
        <span
          key={ci.date}
          className={`inline-block h-2 w-2 rounded-full ${CHECKIN_DOT_STYLES[ci.status]}`}
        />
      ))}
    </div>
  )
}
