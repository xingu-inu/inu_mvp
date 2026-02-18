'use client'

import { useState, useMemo } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import { useActiveAnnouncements } from '@/queries/use-announcements'
import { cn } from '@/lib/utils'

const DISMISSED_KEY = 'inu-dismissed-announcements'

function getDismissedIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function addDismissedId(id: string) {
  const ids = getDismissedIds()
  if (!ids.includes(id)) {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids, id]))
  }
}

const TYPE_STYLES: Record<string, string> = {
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  update: 'bg-green-50 text-green-800 border-green-200',
  event: 'bg-purple-50 text-purple-800 border-purple-200',
}

export function AnnouncementBanner() {
  const { data: announcements } = useActiveAnnouncements()
  const [dismissedIds, setDismissedIds] = useState<string[]>(getDismissedIds)
  const [expanded, setExpanded] = useState(false)

  const active = useMemo(() => {
    if (!announcements?.length) return null
    return announcements.find((a) => !dismissedIds.includes(a.id)) ?? null
  }, [announcements, dismissedIds])

  if (!active) return null

  const style = TYPE_STYLES[active.type] ?? TYPE_STYLES.info

  function handleDismiss() {
    if (!active) return
    addDismissedId(active.id)
    setDismissedIds((prev) => [...prev, active.id])
  }

  return (
    <div className={cn('relative rounded-xl border px-4 py-3', style)}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{active.title}</p>
          {expanded && active.content && (
            <p className="mt-1 text-sm opacity-80">{active.content}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {active.content && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-black/5"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
